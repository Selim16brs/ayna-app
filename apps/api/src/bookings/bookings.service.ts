import {
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Booking, BookingStatus } from '@prisma/client';
import { hasConflict } from '@ayna/domain';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { commissionFor } from '../commissions/commissions.calc';
import { cancelOutcome } from './bookings.policy';
import type { CreateBookingInput } from './bookings.dto';

// §4.2 — slot işgal eden durumlar (yalnız ONAY SONRASI; awaiting_provider hariç —
// ters-pazaryerinde aynı slota birden çok bekleyen talep olabilir, uzman birini seçer).
const ACTIVE_SLOT_STATUSES: BookingStatus[] = [
  BookingStatus.confirmed,
  BookingStatus.deposit_pending,
  BookingStatus.deposit_submitted,
];

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  // Dekont akışı pushları: uzmanın hesabı Specialist.proId ↔ Booking.proId üzerinden bulunur
  private async expertUserIdFor(bookingId: string): Promise<string | null> {
    const b = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b?.proId) return null;
    const sp = await this.prisma.specialist.findFirst({ where: { proId: b.proId } });
    return sp?.userId ?? null;
  }

  async list() {
    const rows = await this.prisma.booking.findMany({ orderBy: { inDays: 'asc' } });
    return rows.map(mapBooking);
  }

  // §5.6 önkoşulu — kullanıcıya bağlı randevular (MÜŞTERİ olarak)
  async listForUser(userId: string) {
    const rows = await this.prisma.booking.findMany({
      where: { userId },
      orderBy: { inDays: 'asc' },
    });
    return rows.map(mapBooking);
  }

  // §9.4 — SAĞLAYICI olarak gelen randevular: uzman (Specialist.proId) veya salon
  // (Business.professionalId) → booking.proId eşleşmesi. Gelen 'Randevu Al' talepleri buradan görünür.
  async listForProvider(userId: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    let proId = sp?.proId ?? null;
    if (!proId) {
      const biz = await this.prisma.business.findFirst({ where: { ownerUserId: userId } });
      proId = biz?.professionalId ?? null;
    }
    if (!proId) return [];
    const rows = await this.prisma.booking.findMany({
      where: { proId },
      orderBy: { inDays: 'asc' },
    });
    return rows.map(mapBooking);
  }

  // §5 — CRM özet istatistiği: doluluk/gelir + no-show (gerçek randevulardan)
  async stats() {
    const rows = await this.prisma.booking.findMany();
    const base = computeBookingStats(
      rows.map((b) => ({ status: b.status, price: Number(b.price), userId: b.userId })),
    );
    // §12.8 — ödenecek komisyon: online ciro × oran(%); oran admin parametresi (varsayılan %15)
    const s = await this.prisma.setting.findUnique({ where: { key: 'commission.rate' } });
    const commissionRate = s?.intValue ?? 10;
    const commission = commissionFor(base.commissionBase, commissionRate);
    return { ...base, commission, commissionRate };
  }

  async create(input: CreateBookingInput, userId?: string) {
    // id istemciden gelir → upsert ile idempotent (tekrar gönderim güvenli)
    const data = {
      source: input.source,
      service: input.service,
      proId: input.proId ?? null,
      proName: input.proName,
      proImage: input.proImage,
      uzmanName: input.uzmanName ?? null,
      customerName: input.customerName ?? null,
      bookingKind: input.bookingKind ?? 'normal',
      groupSize: input.groupSize ?? null,
      dateLabel: input.dateLabel,
      inDays: input.inDays,
      startAt: input.startMs ? new Date(input.startMs) : null,
      durationMin: input.durationMin ?? null,
      price: input.price,
      status: input.status ?? 'confirmed',
    };
    const row = await this.prisma.booking.upsert({
      where: { id: input.id },
      // userId yalnızca oluşturmada; sahibi sonradan değişmez (offline upsert'te bozulmaz)
      create: { id: input.id, ...data, ...(userId ? { userId } : {}) },
      update: data,
    });
    return mapBooking(row);
  }

  // §6.C/§4.4 — iptal. Kapora yakma/iade kararını SUNUCU verir (client'a güvenilmez):
  // geç iptal (<3sa, kapora ödenmiş) → kapora yanar; serbest iptal → uzman iade eder.
  async cancel(id: string, reason?: string, actorId?: string) {
    await this.assertParty(id, actorId, 'either');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    const outcome = cancelOutcome(b.status, b.startAt?.getTime() ?? null, Date.now());
    const row = await this.transition(id, {
      status: outcome.status,
      cancelReason: reason ?? null,
      ...(outcome.forfeit ? { depositForfeited: true } : {}),
    });
    this.notifyParties(
      id,
      'Randevu iptal edildi',
      reason ? `Sebep: ${reason}` : 'Detay için randevuya dokun',
    );
    return row;
  }

  // §6.C — uzman/işletme randevuyu "gelmedi" işaretler (CRM tarafı).
  // Kural: randevu saatinin üzerinden EN AZ 1 saat geçmeden işaretlenemez (erken damga önlenir).
  async noShow(id: string, actorId?: string) {
    await this.assertParty(id, actorId, 'provider');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (b?.startAt && Date.now() < b.startAt.getTime() + 60 * 60 * 1000) {
      throw new BadRequestException({
        code: 'NO_SHOW_TOO_EARLY',
        message: 'Gelmedi işareti randevu saatinden 1 saat sonra açılır',
      });
    }
    const row = await this.transition(id, { status: 'no_show', depositForfeited: true });
    this.notifyParties(id, 'Randevu: gelmedi olarak işaretlendi', 'Kapora uzmanda kaldı (§4.4)');
    return row;
  }

  // §4.1.7 — uzman hizmeti tamamladı → randevu 'completed' (değerlendirme daveti uçları buna dayanır)
  async complete(id: string, actorId?: string) {
    await this.assertParty(id, actorId, 'provider');
    const row = await this.transition(id, { status: 'completed' });
    // §7.1 — müşteriye değerlendirme daveti push'u (3 saat sonrası anket mobilde ayrıca)
    void this.prisma.booking.findUnique({ where: { id } }).then((b) => {
      if (b?.userId)
        void this.push.sendToUser(b.userId, {
          title: 'Hizmetin tamamlandı ✨',
          body: 'Deneyimini değerlendir — 30 saniye sürer',
          data: { route: `/review/new?id=${id}` },
        });
    });
    return row;
  }

  // Kapora tutarı — admin parametresi (varsayılan 1000 ₸)
  private async depositAmount(): Promise<number> {
    const s = await this.prisma.setting.findUnique({ where: { key: 'rate.deposit_kzt' } });
    return s?.intValue ?? 1000;
  }

  // §4.1/§4.2 — uzman onaylar → ATOMİK slot lock (çift-rezervasyon önlenir) → deposit_pending
  async approve(id: string, actorId?: string) {
    await this.assertParty(id, actorId, 'provider');
    const amount = await this.depositAmount();
    const deadline = new Date(Date.now() + 3 * 60 * 60 * 1000); // §5.2 dekont penceresi (3 saat)
    // Tek transaction içinde: çakışma kontrolü + durum güncelleme (atomik kilit)
    const row = await this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.findUnique({ where: { id } });
      if (!b)
        throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
      // Kesin zaman varsa aynı uzmanda çakışan aktif randevu var mı?
      if (b.startAt && b.durationMin && b.proId) {
        const candidate = {
          startMs: b.startAt.getTime(),
          endMs: b.startAt.getTime() + b.durationMin * 60_000,
        };
        const others = await tx.booking.findMany({
          where: {
            proId: b.proId,
            id: { not: id },
            status: { in: ACTIVE_SLOT_STATUSES },
            startAt: { not: null },
          },
          select: { startAt: true, durationMin: true },
        });
        const busy = others
          .filter((o) => o.startAt && o.durationMin)
          .map((o) => ({
            startMs: o.startAt!.getTime(),
            endMs: o.startAt!.getTime() + (o.durationMin ?? 0) * 60_000,
          }));
        if (hasConflict(candidate, busy)) {
          throw new ConflictException({
            code: 'SLOT_TAKEN',
            message: 'Bu saat başka bir randevuyla dolu',
          });
        }
      }
      return tx.booking.update({
        where: { id },
        data: {
          status: 'deposit_pending',
          proposedDateLabel: null,
          depositAmount: amount,
          depositDeadline: deadline,
        },
      });
    });
    return mapBooking(row);
  }

  // §4.2 — kullanıcı kapora dekontunu yükler → uzman onayı bekler
  async submitDepositReceipt(id: string, receiptUri: string, actorId?: string) {
    await this.assertParty(id, actorId, 'owner');
    const res = await this.transition(id, {
      status: 'deposit_submitted',
      depositReceiptUri: receiptUri,
    });
    // §4.3 — uzmana gerçek push: dekont geldi, onayla
    void this.expertUserIdFor(id).then((uid) => {
      if (uid)
        void this.push.sendToUser(uid, {
          title: 'Depozito dekontu geldi 🧾',
          body: 'Müşteri dekont yükledi — kontrol edip onayla, randevu kesinleşsin.',
          data: { route: `/booking/${id}` },
        });
    });
    return res;
  }

  // §4.2 — uzman kaporayı onaylar → randevu KESİN
  async confirmDepositReceipt(id: string, actorId?: string) {
    await this.assertParty(id, actorId, 'provider');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    const res = await this.transition(id, { status: 'confirmed' });
    if (b?.userId)
      void this.push.sendToUser(b.userId, {
        title: 'Randevun kesinleşti 🎉',
        body: 'Depozito onaylandı — randevun artık kesin. Detaylara göz at.',
        data: { route: `/booking/${id}` },
      });
    return res;
  }

  // §4.4 — kullanıcı serbest iptal başlatır. SUNUCU pencereyi doğrular: client geç
  // iptali "serbest" diye göndermeye çalışsa bile <3sa ise kapora yakılır.
  async freeCancel(id: string, reason?: string, actorId?: string) {
    await this.assertParty(id, actorId, 'owner');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    const outcome = cancelOutcome(b.status, b.startAt?.getTime() ?? null, Date.now());
    const row = await this.transition(id, {
      status: outcome.status,
      cancelReason: reason ?? null,
      ...(outcome.forfeit ? { depositForfeited: true } : {}),
    });
    this.notifyParties(
      id,
      'Randevu iptal edildi',
      reason ? `Sebep: ${reason}` : 'Detay için randevuya dokun',
    );
    return row;
  }

  // §4.4 — uzman iade dekontunu yükler → kullanıcı onayı bekler
  async uploadRefundReceipt(id: string, receiptUri: string, actorId?: string) {
    await this.assertParty(id, actorId, 'provider');
    return this.transition(id, { status: 'refund_submitted', refundReceiptUri: receiptUri });
  }

  // §4.4 — kullanıcı iadeyi aldı → kayıt kapanır. Uzman no-show iade yükümlülüğü
  // yerine geldiyse kısıtlı mod kalkar (yalnız bu sebeple konmuşsa).
  async confirmRefund(id: string, actorId?: string) {
    await this.assertParty(id, actorId, 'owner');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    const res = await this.transition(id, { status: 'cancelled' });
    if (b?.providerNoShow && b.proId) {
      const ownerUserId = await this.proOwnerUserId(b.proId);
      if (ownerUserId) {
        await this.prisma.user.updateMany({
          where: { id: ownerUserId, restrictReason: 'provider_noshow_refund' },
          data: { restrictedAt: null, restrictReason: null },
        });
      }
    }
    return res;
  }

  // §4.4 — taraflar itiraz açar → admin anlaşmazlık kuyruğu
  async dispute(id: string, actorId?: string) {
    await this.assertParty(id, actorId, 'either');
    return this.transition(id, { status: 'disputed' });
  }

  // §4.4-b — UZMAN gelmedi: iade akışı + 1.000 ₸ uzmanın komisyon borcuna (ceza faturası).
  // (Kullanıcıya 1000 puan telafisi mobil earn ile verilir; burada komisyon borcu doğar.)
  // §4.4 — bir Professional'ın sahip User'ı: önce salon (Business.ownerUserId),
  // yoksa bağımsız uzman (Specialist.proId → userId). Böylece bağımsız uzman da kısıtlanır.
  private async proOwnerUserId(proId: string): Promise<string | null> {
    const biz = await this.prisma.business.findFirst({
      where: { professionalId: proId },
      select: { ownerUserId: true },
    });
    if (biz?.ownerUserId) return biz.ownerUserId;
    const sp = await this.prisma.specialist.findFirst({
      where: { proId },
      select: { userId: true },
    });
    return sp?.userId ?? null;
  }

  async providerNoShow(id: string, actorId?: string) {
    await this.assertParty(id, actorId, 'owner');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: 'refund_pending', providerNoShow: true },
    });
    if (b.proId) {
      const amount = await this.depositAmount(); // 1.000 ₸ (parametrik)
      const ownerUserId = await this.proOwnerUserId(b.proId);
      const now = new Date();
      await this.prisma.commissionInvoice.create({
        data: {
          proId: b.proId,
          proName: b.proName,
          ownerUserId: ownerUserId ?? null,
          periodStart: now,
          periodEnd: now,
          bookingsCount: 0,
          grossRevenue: 0,
          commissionAmount: amount, // no-show cezası uzmanın komisyon borcuna eklenir
          dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          status: 'pending',
        },
      });
      // §4.4 — ceza doğduğu an uzman hesabı KISITLI MODA düşer (salon VEYA bağımsız uzman).
      if (ownerUserId) {
        await this.prisma.user.update({
          where: { id: ownerUserId },
          data: { restrictedAt: now, restrictReason: 'provider_noshow_refund' },
        });
      }
    }
    return mapBooking(updated);
  }

  // §1.6 — uzman alternatif saat önerir (mobil epoch ms; proposedStartAt olarak saklanır)
  async propose(id: string, proposedStartMs: number, actorId?: string) {
    await this.assertParty(id, actorId, 'provider');
    return this.transition(id, {
      status: 'alternative_proposed',
      proposedStartAt: new Date(proposedStartMs),
    });
  }

  // §1.6 — kullanıcı önerilen alternatifi kabul eder (başlangıç güncellenir, onaylanır)
  async accept(id: string, actorId?: string) {
    await this.assertParty(id, actorId, 'owner');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    return this.transition(id, {
      status: 'confirmed',
      startAt: b.proposedStartAt ?? b.startAt,
      proposedStartAt: null,
    });
  }

  // §1.6 — kullanıcı karşı öneri yapar (yeni başlangıç, tekrar uzman onayına döner)
  async counter(id: string, proposedStartMs: number, actorId?: string) {
    await this.assertParty(id, actorId, 'owner');
    return this.transition(id, {
      status: 'awaiting_provider',
      startAt: new Date(proposedStartMs),
      proposedStartAt: null,
    });
  }

  // §güvenlik — eylemi yapan, randevunun TARAFI olmalı (owner=müşteri, provider=uzman/salon).
  // actorId verilmediyse (iç çağrı) kontrol atlanır; admin rolü her eylemi yapabilir.
  private async assertParty(
    bookingId: string,
    actorId: string | undefined,
    who: 'owner' | 'provider' | 'either',
  ): Promise<void> {
    this.lastActorId = actorId;
    if (!actorId) return;
    const [b, actor] = await Promise.all([
      this.prisma.booking.findUnique({ where: { id: bookingId } }),
      this.prisma.user.findUnique({ where: { id: actorId } }),
    ]);
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    if (actor?.role === 'admin') return;
    const isOwner = !!b.userId && b.userId === actorId;
    let isProvider = false;
    if (b.proId) {
      const uid = await this.expertUserIdFor(bookingId);
      isProvider = uid === actorId;
      if (!isProvider) {
        const biz = await this.prisma.business.findFirst({ where: { professionalId: b.proId } });
        isProvider = biz?.ownerUserId === actorId;
      }
    }
    const ok = who === 'owner' ? isOwner : who === 'provider' ? isProvider : isOwner || isProvider;
    if (!ok)
      throw new ForbiddenException({
        code: 'NOT_BOOKING_PARTY',
        message: 'Bu randevu üzerinde işlem yetkin yok',
      });
  }

  private async transition(id: string, data: Record<string, unknown>) {
    const existing = await this.prisma.booking.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    }
    // §4 — durum makinesi: kapalı durumlardan geri dönüş YOK (cancelled→completed gibi
    // geçersiz geçişler reddedilir; çift POST idempotent kabul edilir: aynı hedef → mevcut döner)
    const target = typeof data.status === 'string' ? data.status : null;
    if (target) {
      if (existing.status === target) return mapBooking(existing); // idempotent tekrar
      const CLOSED = ['cancelled', 'completed', 'no_show', 'refunded'];
      if (CLOSED.includes(existing.status)) {
        throw new BadRequestException({
          code: 'INVALID_TRANSITION',
          message: `Kapalı randevu (${existing.status}) '${target}' durumuna geçemez`,
        });
      }
    }
    const row = await this.prisma.booking.update({ where: { id }, data });
    // §12 — kritik eylem audit log'u (kim, ne zaman, hangi geçiş)
    if (target)
      void this.prisma.auditLog
        .create({
          data: {
            action: `booking.${target}`,
            resourceType: 'booking',
            resourceId: id,
            actorId: this.lastActorId ?? null,
            actorRole: this.lastActorId ? 'party' : 'system',
          },
        })
        .catch(() => undefined);
    return mapBooking(row);
  }

  // assertParty'den geçen son aktör — transition audit'i için (istek başına tek akış)
  private lastActorId: string | undefined;

  // Durum geçişlerinde İKİ TARAFA push (sahip müşteri + uzman) — kapalıyken de haber gitsin
  private notifyParties(bookingId: string, title: string, body: string): void {
    void this.prisma.booking.findUnique({ where: { id: bookingId } }).then((b) => {
      if (!b) return;
      const data = { route: `/booking/${bookingId}` };
      if (b.userId) void this.push.sendToUser(b.userId, { title, body, data });
      void this.expertUserIdFor(bookingId).then((uid) => {
        if (uid && uid !== b.userId) void this.push.sendToUser(uid, { title, body, data });
      });
    });
  }
}

function mapBooking(b: Booking) {
  return {
    id: b.id,
    source: b.source,
    service: b.service,
    proId: b.proId ?? '',
    proName: b.proName,
    proImage: b.proImage,
    uzmanName: b.uzmanName ?? undefined,
    customerName: b.customerName ?? undefined,
    bookingKind: b.bookingKind,
    groupSize: b.groupSize ?? undefined,
    dateLabel: b.dateLabel,
    proposedDateLabel: b.proposedDateLabel ?? undefined,
    inDays: b.inDays,
    startMs: b.startAt?.getTime() ?? undefined,
    proposedStartMs: b.proposedStartAt?.getTime() ?? undefined,
    durationMin: b.durationMin ?? undefined,
    price: Number(b.price),
    status: b.status,
    cancelReason: b.cancelReason ?? undefined,
    // §4.1-4.4 — depozito/iade alanları (mobil Appointment alan adlarıyla hizalı)
    depositAmount: b.depositAmount ?? undefined,
    receiptUri: b.depositReceiptUri ?? undefined, // mobil `receiptUri` bekler (hydrate uyumu)
    refundReceiptUri: b.refundReceiptUri ?? undefined,
    depositDeadline: b.depositDeadline ?? undefined,
    depositForfeited: b.depositForfeited,
    providerNoShow: b.providerNoShow,
    reviewed: b.reviewed,
  };
}

// §5 — saf istatistik hesabı (DB'den bağımsız; test edilebilir)
export function computeBookingStats(
  rows: { status: string; price: number; userId?: string | null }[],
) {
  const count = (s: string) => rows.filter((b) => b.status === s).length;
  const completedRows = rows.filter((b) => b.status === 'completed');
  const revenue = completedRows.reduce((sum, b) => sum + b.price, 0);
  // §gelir modeli — komisyon TABANI yalnız online (AYNA aracılı, userId dolu) randevular; offline hariç.
  const commissionBase = completedRows
    .filter((b) => b.userId != null)
    .reduce((sum, b) => sum + b.price, 0);
  const noShow = count('no_show');
  const cancelled = count('cancelled');
  const upcoming = rows.filter((b) =>
    ['confirmed', 'pending', 'awaiting_provider', 'alternative_proposed'].includes(b.status),
  ).length;
  const realized = completedRows.length + noShow; // tamamlanan + gelmeyen
  const noShowRate = realized ? Math.round((noShow / realized) * 100) : 0;
  return {
    total: rows.length,
    completed: completedRows.length,
    cancelled,
    noShow,
    noShowRate,
    upcoming,
    revenue,
    commissionBase,
    currency: 'KZT' as const,
  };
}
