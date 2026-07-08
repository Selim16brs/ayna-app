import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type Booking, BookingStatus } from '@prisma/client';
import { hasConflict } from '@ayna/domain';
import { PrismaService } from '../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.booking.findMany({ orderBy: { inDays: 'asc' } });
    return rows.map(mapBooking);
  }

  // §5.6 önkoşulu — kullanıcıya bağlı randevular
  async listForUser(userId: string) {
    const rows = await this.prisma.booking.findMany({
      where: { userId },
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
  async cancel(id: string, reason?: string) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    const outcome = cancelOutcome(b.status, b.startAt?.getTime() ?? null, Date.now());
    return this.transition(id, {
      status: outcome.status,
      cancelReason: reason ?? null,
      ...(outcome.forfeit ? { depositForfeited: true } : {}),
    });
  }

  // §6.C — uzman/işletme randevuyu "gelmedi" işaretler (CRM tarafı)
  async noShow(id: string) {
    return this.transition(id, { status: 'no_show', depositForfeited: true });
  }

  // §4.1.7 — uzman hizmeti tamamladı → randevu 'completed' (değerlendirme daveti uçları buna dayanır)
  async complete(id: string) {
    return this.transition(id, { status: 'completed' });
  }

  // Kapora tutarı — admin parametresi (varsayılan 1000 ₸)
  private async depositAmount(): Promise<number> {
    const s = await this.prisma.setting.findUnique({ where: { key: 'rate.deposit_kzt' } });
    return s?.intValue ?? 1000;
  }

  // §4.1/§4.2 — uzman onaylar → ATOMİK slot lock (çift-rezervasyon önlenir) → deposit_pending
  async approve(id: string) {
    const amount = await this.depositAmount();
    const deadline = new Date(Date.now() + 3 * 60 * 60 * 1000); // §5.2 dekont penceresi (3 saat)
    // Tek transaction içinde: çakışma kontrolü + durum güncelleme (atomik kilit)
    const row = await this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.findUnique({ where: { id } });
      if (!b) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
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
  async submitDepositReceipt(id: string, receiptUri: string) {
    return this.transition(id, { status: 'deposit_submitted', depositReceiptUri: receiptUri });
  }

  // §4.2 — uzman kaporayı onaylar → randevu KESİN
  async confirmDepositReceipt(id: string) {
    return this.transition(id, { status: 'confirmed' });
  }

  // §4.4 — kullanıcı serbest iptal başlatır. SUNUCU pencereyi doğrular: client geç
  // iptali "serbest" diye göndermeye çalışsa bile <3sa ise kapora yakılır.
  async freeCancel(id: string, reason?: string) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    const outcome = cancelOutcome(b.status, b.startAt?.getTime() ?? null, Date.now());
    return this.transition(id, {
      status: outcome.status,
      cancelReason: reason ?? null,
      ...(outcome.forfeit ? { depositForfeited: true } : {}),
    });
  }

  // §4.4 — uzman iade dekontunu yükler → kullanıcı onayı bekler
  async uploadRefundReceipt(id: string, receiptUri: string) {
    return this.transition(id, { status: 'refund_submitted', refundReceiptUri: receiptUri });
  }

  // §4.4 — kullanıcı iadeyi aldı → kayıt kapanır. Uzman no-show iade yükümlülüğü
  // yerine geldiyse kısıtlı mod kalkar (yalnız bu sebeple konmuşsa).
  async confirmRefund(id: string) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    const res = await this.transition(id, { status: 'cancelled' });
    if (b?.providerNoShow && b.proId) {
      const biz = await this.prisma.business.findFirst({
        where: { professionalId: b.proId },
        select: { ownerUserId: true },
      });
      if (biz?.ownerUserId) {
        await this.prisma.user.updateMany({
          where: { id: biz.ownerUserId, restrictReason: 'provider_noshow_refund' },
          data: { restrictedAt: null, restrictReason: null },
        });
      }
    }
    return res;
  }

  // §4.4 — taraflar itiraz açar → admin anlaşmazlık kuyruğu
  async dispute(id: string) {
    return this.transition(id, { status: 'disputed' });
  }

  // §4.4-b — UZMAN gelmedi: iade akışı + 1.000 ₸ uzmanın komisyon borcuna (ceza faturası).
  // (Kullanıcıya 1000 puan telafisi mobil earn ile verilir; burada komisyon borcu doğar.)
  async providerNoShow(id: string) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: 'refund_pending', providerNoShow: true },
    });
    if (b.proId) {
      const amount = await this.depositAmount(); // 1.000 ₸ (parametrik)
      const biz = await this.prisma.business.findFirst({
        where: { professionalId: b.proId },
        select: { ownerUserId: true },
      });
      const now = new Date();
      await this.prisma.commissionInvoice.create({
        data: {
          proId: b.proId,
          proName: b.proName,
          ownerUserId: biz?.ownerUserId ?? null,
          periodStart: now,
          periodEnd: now,
          bookingsCount: 0,
          grossRevenue: 0,
          commissionAmount: amount, // no-show cezası uzmanın komisyon borcuna eklenir
          dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          status: 'pending',
        },
      });
      // §4.4 — ceza doğduğu an uzman hesabı KISITLI MODA düşer (7 gün sayacı; iade
      // yükümlülüğü yerine gelene / süre dolana dek yeni talep alamaz). Salon sahibi User'ı.
      if (biz?.ownerUserId) {
        await this.prisma.user.update({
          where: { id: biz.ownerUserId },
          data: { restrictedAt: now, restrictReason: 'provider_noshow_refund' },
        });
      }
    }
    return mapBooking(updated);
  }

  // §1.6 — uzman alternatif saat önerir (mobil epoch ms; proposedStartAt olarak saklanır)
  async propose(id: string, proposedStartMs: number) {
    return this.transition(id, {
      status: 'alternative_proposed',
      proposedStartAt: new Date(proposedStartMs),
    });
  }

  // §1.6 — kullanıcı önerilen alternatifi kabul eder (başlangıç güncellenir, onaylanır)
  async accept(id: string) {
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
  async counter(id: string, proposedStartMs: number) {
    return this.transition(id, {
      status: 'awaiting_provider',
      startAt: new Date(proposedStartMs),
      proposedStartAt: null,
    });
  }

  private async transition(id: string, data: Record<string, unknown>) {
    const existing = await this.prisma.booking.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    }
    const row = await this.prisma.booking.update({ where: { id }, data });
    return mapBooking(row);
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
