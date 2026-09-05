import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * GÜNLÜK CUT-OUT TAVANI — kullanıcı başına.
 *
 * Her çağrı remove.bg'de PARA. Uç kimlik doğrulaması istiyordu ama başka
 * hiçbir sınırı yoktu: giriş yapan herhangi biri döngüye sokup faturayı
 * şişirebilirdi. Üyelik kontrolü de yalnız UYGULAMADAYDI — istemcideki
 * kontrol kapı değildir.
 *
 * 20, gerçek kullanımın çok üstünde: profil fotoğrafını günde yirmi kez
 * değiştiren kullanıcı yok.
 */
const GUNLUK_CUTOUT_SINIRI = 20;

// §13 — remove.bg sağlayıcı SOYUTLAMASI: ileride tek noktadan değiştirilebilir.
// Anahtar admin panelden (§12.9 apikey.removebg) gelir; koda gömülmez.
@Injectable()
export class CutoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Cut-out hakkı: SATICI (uzman/salon) ya da ÜCRETLİ üye.
   *
   * Uygulamadaki kuralın aynısı (`applyProfileCutout`). Orada kalsaydı kapı
   * olmazdı: uygulama kodu kullanıcının elinde, sunucu ucu herkese açıktı.
   */
  private hakkiVarMi(u: { role: string; isPremium: boolean; membershipTier: string }): boolean {
    if (u.role === 'professional' || u.role === 'salon') return true;
    return u.isPremium || u.membershipTier === 'premium' || u.membershipTier === 'platinum';
  }

  private async apiKey(): Promise<string | null> {
    const row = await this.prisma.setting.findUnique({ where: { key: 'apikey.removebg' } });
    return row?.strValue?.trim() || null;
  }

  async available(): Promise<boolean> {
    return !!(await this.apiKey());
  }

  // Görselin arka planını temizler (cut-out). Anahtar yoksa "şu an kullanılamıyor" (§12.9).
  // Kaynak: public URL (imageUrl) VEYA telefondan seçilen yerel fotonun base64'ü (imageB64).
  async cutout(
    userId: string,
    source: {
      imageUrl?: string | undefined;
      imageB64?: string | undefined;
    },
  ): Promise<{ dataUrl: string }> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isPremium: true, membershipTier: true },
    });
    if (!u || !this.hakkiVarMi(u)) {
      throw new ForbiddenException({
        code: 'PREMIUM_REQUIRED',
        message: 'Cut-out premium üyelerde ve uzman hesaplarında',
      });
    }
    /*
     * Sayaç DENETİM KAYDINDAN: ayrı bir sütun açmadan, zaten tutulması
     * gereken kaydın kendisinden okunuyor (kritik eylemler audit log —
     * CLAUDE.md).
     */
    const sonGun = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const gunluk = await this.prisma.auditLog.count({
      where: { actorId: userId, action: 'cutout.run', createdAt: { gte: sonGun } },
    });
    if (gunluk >= GUNLUK_CUTOUT_SINIRI) {
      throw new HttpException(
        { code: 'CUTOUT_DAILY_LIMIT', message: 'Bugünkü arka plan temizleme hakkın doldu' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const key = await this.apiKey();
    if (!key) {
      throw new ServiceUnavailableException({
        code: 'CUTOUT_UNAVAILABLE',
        message: 'Cut-out şu an kullanılamıyor (remove.bg anahtarı tanımsız)',
      });
    }
    const params: Record<string, string> = { size: 'auto' };
    if (source.imageB64) {
      // data URL öneki varsa temizle → remove.bg saf base64 ister
      params.image_file_b64 = source.imageB64.replace(/^data:image\/\w+;base64,/, '');
    } else if (source.imageUrl) {
      params.image_url = source.imageUrl;
    } else {
      throw new ServiceUnavailableException({
        code: 'CUTOUT_NO_SOURCE',
        message: 'Görsel kaynağı yok',
      });
    }
    const form = new URLSearchParams(params);
    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': key, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    if (!res.ok) {
      throw new ServiceUnavailableException({
        code: 'CUTOUT_FAILED',
        message: `remove.bg hatası (${res.status})`,
      });
    }
    const buf = Buffer.from(await res.arrayBuffer());
    /*
     * Kayıt YALNIZ BAŞARILI çağrıda: hak, para harcanınca düşüyor.
     * Başarısız çağrıda düşseydi remove.bg'nin arızası kullanıcının
     * hakkını yerdi.
     */
    await this.audit.record({
      actorId: userId,
      action: 'cutout.run',
      resourceType: 'cutout',
    });
    // Görsel depolama altyapısı yok → base64 data URL olarak dön (önizleme için yeterli).
    return { dataUrl: `data:image/png;base64,${buf.toString('base64')}` };
  }
}
