import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * PROFİL DEĞİŞİKLİĞİ — çoğu ANINDA, iletişim bilgisi ONAYLA.
 *
 * Kurucu: "uzmanların telefon ve mailleri dışındaki şeyleri profillerinde
 * değiştirdiklerinde admin paneline onay almasına gerek yok."
 *
 * Eskiden HER değişiklik kuyruğa düşüyordu: uzman tanıtım yazısındaki bir
 * harfi düzeltmek için bile admin onayı bekliyordu. Sonuç, kurucunun başka
 * bir yerde gördüğü tabloyla aynı: kimse profilini doldurmuyor.
 *
 * ONAYDA KALANLAR — telefon ve e-posta. Bunlar kimlik doğrulama ve iletişim
 * kanalı: sessizce değişirse hesap devri ya da müşteriyi platform dışına
 * çekme yolu açılır. Salonun "iletişim telefonu" da buna dahil.
 */
@Injectable()
export class ProfileChangesService {
  constructor(private readonly prisma: PrismaService) {}

  private notFound(): never {
    throw new NotFoundException({ code: 'NOT_FOUND', message: 'Talep bulunamadı' });
  }

  /**
   * Onay gerektiren alanlar. Geri kalan HER ŞEY anında uygulanıyor.
   *
   * `salonProfile.contact` iç içe: salon formundaki iletişim telefonu.
   */
  private static readonly ONAY_GEREKEN = new Set(['phone', 'email']);
  private static readonly ONAY_GEREKEN_SALON = new Set(['contact']);

  /** Değişiklikleri "hemen uygulanacak" ve "onay bekleyecek" diye ayırır. */
  private ayir(changes: Record<string, unknown>): {
    hemen: Record<string, unknown>;
    bekleyen: Record<string, unknown>;
  } {
    const hemen: Record<string, unknown> = {};
    const bekleyen: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(changes)) {
      if (ProfileChangesService.ONAY_GEREKEN.has(k)) {
        bekleyen[k] = v;
        continue;
      }
      if (k === 'salonProfile' && v && typeof v === 'object') {
        // Salon profili tek nesne geliyor; iletişim telefonu içinden ayrılıyor
        // ki geri kalan alanlar (tanıtım, adres, fotoğraflar) beklemesin.
        const salon: Record<string, unknown> = {};
        const salonBekleyen: Record<string, unknown> = {};
        for (const [sk, sv] of Object.entries(v as Record<string, unknown>)) {
          if (ProfileChangesService.ONAY_GEREKEN_SALON.has(sk)) salonBekleyen[sk] = sv;
          else salon[sk] = sv;
        }
        if (Object.keys(salon).length) hemen['salonProfile'] = salon;
        if (Object.keys(salonBekleyen).length) bekleyen['salonProfile'] = salonBekleyen;
        continue;
      }
      hemen[k] = v;
    }
    return { hemen, bekleyen };
  }

  /** Sunucuda karşılığı olan alanları yazar. */
  private async uygula(userId: string, hemen: Record<string, unknown>) {
    if (typeof hemen['name'] === 'string' && (hemen['name'] as string).trim()) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { name: (hemen['name'] as string).trim() },
      });
    }
  }

  private async audit(action: string, resourceId: string, actorId?: string) {
    await this.prisma.auditLog.create({
      data: {
        action,
        resourceType: 'profile_change',
        resourceId,
        actorId: actorId ?? null,
        actorRole: 'admin',
      },
    });
  }

  // ── Mobil (salon/uzman) ──────────────────────────────────────────────
  /**
   * Değişikliği alır: iletişim bilgisi dışındakileri ANINDA uygular,
   * yalnız telefon/e-posta için onay talebi açar.
   *
   * Dönüş, çağıran tarafın doğru mesajı verebilmesi için ne uygulandığını
   * ve ne beklediğini söylüyor — "onaya gitti" demek, hiçbir şey beklemezken
   * yanlış olurdu.
   */
  async submit(userId: string, changes: Record<string, unknown>) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) this.notFound();

    const { hemen, bekleyen } = this.ayir(changes);

    if (Object.keys(hemen).length) {
      await this.uygula(userId, hemen);
      await this.audit('profile_change.applied', userId, userId);
    }

    if (!Object.keys(bekleyen).length) {
      // Bekleyen bir şey yoksa KUYRUĞA HİÇ GİRMİYOR: eski davranışta boş
      // talepler admin panelini dolduruyordu.
      return { applied: Object.keys(hemen), pending: [] as string[], request: null };
    }

    // Yalnız en güncel talep bekler.
    await this.prisma.profileChangeRequest.updateMany({
      where: { userId, status: 'pending' },
      data: { status: 'rejected', reviewedAt: new Date() },
    });
    const request = await this.prisma.profileChangeRequest.create({
      data: {
        userId,
        userName: user!.name,
        role: user!.role,
        changes: bekleyen as object,
        status: 'pending',
      },
    });
    return { applied: Object.keys(hemen), pending: Object.keys(bekleyen), request };
  }

  // Kullanıcının son talebi (mobil onay durumunu + onaylı değişikliği okur)
  mine(userId: string) {
    return this.prisma.profileChangeRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Admin ────────────────────────────────────────────────────────────
  list(status?: string) {
    return this.prisma.profileChangeRequest.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  // Onayla: durumu approved. name değişikliği varsa backend User.name'i günceller
  // (diğer seller alanları — social/hours/certs — mobil tarafta onaylıyı çekip uygular).
  async approve(id: string, actorId?: string) {
    const req = await this.prisma.profileChangeRequest.findUnique({ where: { id } });
    if (!req) this.notFound();
    const changes = (req!.changes ?? {}) as Record<string, unknown>;
    if (typeof changes.name === 'string' && changes.name.trim()) {
      await this.prisma.user.update({
        where: { id: req!.userId },
        data: { name: changes.name.trim() },
      });
    }
    const updated = await this.prisma.profileChangeRequest.update({
      where: { id },
      data: { status: 'approved', reviewedAt: new Date() },
    });
    await this.audit('profile_change.approve', id, actorId);
    return updated;
  }

  async reject(id: string, actorId?: string) {
    const req = await this.prisma.profileChangeRequest.findUnique({ where: { id } });
    if (!req) this.notFound();
    const updated = await this.prisma.profileChangeRequest.update({
      where: { id },
      data: { status: 'rejected', reviewedAt: new Date() },
    });
    await this.audit('profile_change.reject', id, actorId);
    return updated;
  }
}
