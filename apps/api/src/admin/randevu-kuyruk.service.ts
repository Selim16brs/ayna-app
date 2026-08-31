import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

/**
 * ADMİN KUYRUKLARI — brief §8.
 *
 * Brief beş gereksinim sayıyor; üçü randevu akışına ait ve burada:
 *   1. Dekont doğrulama kuyruğu (sahte → iptal + yasak)
 *   2. İadeler kuyruğu (müşteri iadeleri + uzman %9 payı)
 *   3. Uzlaşma kayıtları (no-show ve ödeme itirazları)
 * Ceza yönetimi (§8.4) ve yasaklama (§8.5) mevcut admin servisinde.
 *
 * Ayrı servis olmasının sebebi: `admin.service.ts` zaten 500+ satır ve
 * randevu akışıyla ilgisi olmayan onlarca işi taşıyor. Kuyrukları oraya
 * eklemek, brief'e göre değişecek kodu değişmeyecek kodla karıştırırdı.
 */
@Injectable()
export class RandevuKuyrukService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  // ── §8.1 DEKONT DOĞRULAMA ───────────────────────────────────────────────
  /**
   * Dekont yüklenmiş ama admin bakmamış randevular.
   *
   * Randevu ZATEN kesinleşti (§4.4: "dekont yüklendiği an KESINLESTI sayılır;
   * admin doğrulaması sonradan"). Bu kuyruk parayı bekletmek için değil,
   * sahte dekontu SONRADAN yakalamak için.
   */
  async dekontKuyrugu() {
    const rows = await this.prisma.booking.findMany({
      where: { depositReceiptUri: { not: null }, depositVerifiedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 200,
      select: {
        id: true,
        proName: true,
        userId: true,
        service: true,
        price: true,
        depositAmount: true,
        depositReceiptUri: true,
        startAt: true,
        status: true,
      },
    });
    return rows.map((b) => ({
      ...b,
      price: Number(b.price),
      deposit: Number(b.depositAmount ?? 0),
    }));
  }

  /** Dekont geçerli → yalnız işaretle. Randevu zaten kesinleşmişti. */
  async dekontOnayla(bookingId: string, actorId?: string) {
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { depositVerifiedAt: new Date() },
    });
    await this.denetim('dekont.onay', bookingId, actorId);
    return { ok: true };
  }

  /**
   * Dekont SAHTE → §4.4: "randevu iptal edilir ve kullanıcı platformdan
   * yasaklanır." İki işlem birlikte yapılır; yalnız iptal etmek, aynı kişinin
   * ertesi gün aynı şeyi yapmasını engellemezdi.
   */
  async dekontReddet(bookingId: string, actorId?: string) {
    const b = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu yok' });
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'iptal_musteri',
        cancelReason: 'Sahte dekont',
        depositVerifiedAt: new Date(),
      },
    });
    if (b.userId) {
      await this.prisma.user.update({
        where: { id: b.userId },
        // `suspended` = platformdan yasaklı. Ayrı bir `banned` değeri
        // eklemek yerine mevcut durumu kullanmak, iki "kapalı hesap"
        // kavramının ayrışmasını engelliyor.
        data: { status: 'suspended', restrictReason: 'Sahte depozito dekontu' },
      });
      void this.push
        .sendToUser(b.userId, {
          title: 'Randevun iptal edildi',
          body: 'Yüklenen dekont doğrulanamadı. Hesabın kapatıldı.',
          data: { route: '/profile' },
        })
        .catch(() => undefined);
    }
    await this.denetim('dekont.red', bookingId, actorId);
    return { ok: true };
  }

  // ── §8.2 İADELER ────────────────────────────────────────────────────────
  async iadeKuyrugu() {
    return this.prisma.refundRequest.findMany({
      where: { status: 'bekliyor' },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  /** İade ödendi. İç hedef 24 saat (§4.10); gecikme admin panelinde görünür. */
  async iadeOdendi(id: string, note: string, actorId?: string) {
    const r = await this.prisma.refundRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException({ code: 'REFUND_NOT_FOUND', message: 'İade kaydı yok' });
    if (r.status !== 'bekliyor')
      throw new BadRequestException({ code: 'ALREADY_DONE', message: 'Bu iade zaten işlendi' });
    await this.prisma.refundRequest.update({
      where: { id },
      data: { status: 'odendi', paidAt: new Date(), note },
    });
    void this.push
      .sendToUser(r.payeeUserId, {
        title: 'İaden yapıldı',
        body: `${Number(r.amount)} ₸ hesabına gönderildi.`,
        data: { route: `/booking/${r.bookingId}` },
      })
      .catch(() => undefined);
    await this.denetim('iade.odendi', id, actorId);
    return { ok: true };
  }

  // ── §8.3 UZLAŞMA ────────────────────────────────────────────────────────
  async uzlasmaKuyrugu() {
    return this.prisma.reconciliation.findMany({
      where: { status: 'bekliyor' },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  /**
   * Uzlaşmayı çöz. `karar` randevunun son durumunu belirler; para dağıtımı
   * (varsa) iade kuyruğundan yürür — ikinci bir ödeme yolu açmamak için.
   */
  async uzlasmaCoz(
    id: string,
    karar: 'musteri_lehine' | 'uzman_lehine' | 'karar_yok',
    adminNote: string,
    actorId?: string,
  ) {
    const r = await this.prisma.reconciliation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException({ code: 'RECON_NOT_FOUND', message: 'Uzlaşma kaydı yok' });
    await this.prisma.reconciliation.update({
      where: { id },
      data: { status: 'cozuldu', adminNote, resolvedAt: new Date() },
    });
    // Karar randevuya yansır: müşteri lehine → uzman gelmedi sayılır ve iade
    // doğar; uzman lehine → müşteri gelmedi. "Karar yok" randevuyu olduğu gibi
    // bırakır (AYNA hakem değil — §4.9).
    if (karar !== 'karar_yok') {
      await this.prisma.booking.update({
        where: { id: r.bookingId },
        data: { status: karar === 'musteri_lehine' ? 'no_show_uzman' : 'no_show_musteri' },
      });
    }
    await this.denetim('uzlasma.coz', id, actorId);
    return { ok: true };
  }

  private async denetim(action: string, resourceId: string, actorId?: string) {
    await this.prisma.auditLog.create({
      data: {
        action,
        resourceType: 'booking_queue',
        resourceId,
        actorId: actorId ?? null,
        actorRole: actorId ? 'admin' : 'system',
      },
    });
  }
}
