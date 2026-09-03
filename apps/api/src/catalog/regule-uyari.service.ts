import { Injectable, Logger } from '@nestjs/common';
import { reguleHizmetler } from '@ayna/domain';
import { PrismaService } from '../prisma/prisma.service';

/**
 * REGÜLE HİZMET UYARILARI — brief §5.
 *
 * Uzman kendi serbest hizmet adına botoks / dolgu / mezoterapi / diş
 * estetiği / beslenme danışmanlığı yazarsa satır yönetici kuyruğuna
 * düşüyor. Uzmanlar SMS + yüz doğrulamayla ANINDA yayına geçtiği için
 * lisanssız medikal işlem satışı hukuki ve itibar riski.
 *
 * ── KAYIT ENGELLENMİYOR ─────────────────────────────────────────────────
 *
 * Brief "moderasyon kuyruğuna düşer" diyor. Anahtar kelime taraması hata
 * yapar; otomatik reddetme meşru bir uzmanın kaydını sessizce boşa
 * çıkarırdı. Hizmet kaydediliyor, karar yöneticide.
 *
 * ── TARAMA HİZMET KAYDINI DÜŞÜREMEZ ─────────────────────────────────────
 *
 * Uyarı yazımı `catch` içinde: veritabanı yazımı başarısız olsa bile
 * uzmanın hizmet listesi kaydedilmiş olmalı. Uyarı ikincil bir kayıt;
 * onun yüzünden birincil işlemi düşürmek uzmanı hizmetsiz bırakırdı.
 */
@Injectable()
export class ReguleUyariService {
  private readonly log = new Logger(ReguleUyariService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Uzmanın hizmet listesini tarar ve yeni uyarıları kaydeder.
   *
   * ÇÖZÜLMÜŞ UYARI GERİ AÇILMIYOR: yönetici "sorun yok" dediyse aynı ad
   * her kayıtta yeniden kuyruğa düşmemeli. `@@unique(proId, serviceName)`
   * bunu garanti ediyor; `skipDuplicates` çakışanı atlıyor.
   *
   * ARTIK YAZILMAYAN AD İÇİN BEKLEYEN UYARI KAPANIYOR: uzman "Dudak
   * dolgusu"nu listeden silmişse yöneticinin önünde durması anlamsız —
   * ama YÖNETİCİNİN KARAR VERDİĞİ satırlara dokunulmuyor.
   */
  async tara(proId: string, satirlar: readonly unknown[]): Promise<void> {
    try {
      const bulunanlar = reguleHizmetler(
        satirlar as readonly { name?: unknown; id?: unknown; serviceId?: unknown }[],
      );
      const adlar = bulunanlar.map((b) => b.ad);

      if (bulunanlar.length > 0) {
        await this.prisma.regulatedServiceFlag.createMany({
          data: bulunanlar.map((b) => ({ proId, serviceName: b.ad, reason: b.sebep })),
          skipDuplicates: true,
        });
        this.log.warn(
          `regüle hizmet uyarısı (pro ${proId}): ${bulunanlar.map((b) => b.sebep).join(', ')}`,
        );
      }

      await this.prisma.regulatedServiceFlag.deleteMany({
        where: {
          proId,
          status: 'pending',
          ...(adlar.length ? { serviceName: { notIn: adlar } } : {}),
        },
      });
    } catch (e) {
      // Uyarı ikincil kayıt: hizmet listesini düşürmemeli.
      this.log.error(`regüle taraması yazılamadı (pro ${proId}): ${String(e)}`);
    }
  }

  /** Yönetici kuyruğu — bekleyenler önce, en yenisi üstte. */
  async kuyruk() {
    const rows = await this.prisma.regulatedServiceFlag.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { professional: { select: { id: true, name: true, city: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      proId: r.proId,
      proName: r.professional?.name ?? '',
      city: r.professional?.city ?? '',
      serviceName: r.serviceName,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async bekleyenSayisi(): Promise<number> {
    return this.prisma.regulatedServiceFlag.count({ where: { status: 'pending' } });
  }

  /**
   * Yönetici kararı.
   *
   * `cleared` — sorun görülmedi, aynı ad bir daha kuyruğa düşmesin.
   * `removed` — hizmet kaldırıldı/uzman uyarıldı; kayıt iz olarak kalıyor.
   *
   * Karar SİLMİYOR: kimin ne yazdığı ve yöneticinin ne dediği denetim izi.
   */
  async karar(id: string, karar: 'cleared' | 'removed') {
    await this.prisma.regulatedServiceFlag.update({
      where: { id },
      data: { status: karar, reviewedAt: new Date() },
    });
    return { ok: true as const };
  }
}
