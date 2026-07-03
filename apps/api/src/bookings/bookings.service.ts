import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type Booking, BookingStatus } from '@prisma/client';
import { hasConflict } from '@ayna/domain';
import { PrismaService } from '../prisma/prisma.service';
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
    return computeBookingStats(rows.map((b) => ({ status: b.status, price: Number(b.price) })));
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

  // §6.C — iptal (opsiyonel "neden gelemiyorum" sebebiyle)
  async cancel(id: string, reason?: string) {
    return this.transition(id, { status: 'cancelled', cancelReason: reason ?? null });
  }

  // §6.C — uzman/işletme randevuyu "gelmedi" işaretler (CRM tarafı)
  async noShow(id: string) {
    return this.transition(id, { status: 'no_show', depositForfeited: true });
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

  // §4.4 — kullanıcı serbest iptal başlatır → uzman iade edecek (refund_pending)
  async freeCancel(id: string, reason?: string) {
    return this.transition(id, { status: 'refund_pending', cancelReason: reason ?? null });
  }

  // §4.4 — uzman iade dekontunu yükler → kullanıcı onayı bekler
  async uploadRefundReceipt(id: string, receiptUri: string) {
    return this.transition(id, { status: 'refund_submitted', refundReceiptUri: receiptUri });
  }

  // §4.4 — kullanıcı iadeyi aldı → kayıt kapanır
  async confirmRefund(id: string) {
    return this.transition(id, { status: 'cancelled' });
  }

  // §4.4 — taraflar itiraz açar → admin anlaşmazlık kuyruğu
  async dispute(id: string) {
    return this.transition(id, { status: 'disputed' });
  }

  // §1.6 — uzman alternatif saat önerir
  async propose(id: string, dateLabel: string) {
    return this.transition(id, { status: 'alternative_proposed', proposedDateLabel: dateLabel });
  }

  // §1.6 — kullanıcı önerilen alternatifi kabul eder (tarih güncellenir, onaylanır)
  async accept(id: string) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    return this.transition(id, {
      status: 'confirmed',
      dateLabel: b.proposedDateLabel ?? b.dateLabel,
      proposedDateLabel: null,
    });
  }

  // §1.6 — kullanıcı karşı öneri yapar (yeni tarih, tekrar uzman onayına döner)
  async counter(id: string, dateLabel: string) {
    return this.transition(id, { status: 'awaiting_provider', dateLabel, proposedDateLabel: null });
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
    durationMin: b.durationMin ?? undefined,
    price: Number(b.price),
    status: b.status,
    cancelReason: b.cancelReason ?? undefined,
    // §4.1-4.4 — depozito/iade alanları
    depositAmount: b.depositAmount ?? undefined,
    depositReceiptUri: b.depositReceiptUri ?? undefined,
    refundReceiptUri: b.refundReceiptUri ?? undefined,
    depositDeadline: b.depositDeadline ?? undefined,
    depositForfeited: b.depositForfeited,
    providerNoShow: b.providerNoShow,
    reviewed: b.reviewed,
  };
}

// §5 — saf istatistik hesabı (DB'den bağımsız; test edilebilir)
export function computeBookingStats(rows: { status: string; price: number }[]) {
  const count = (s: string) => rows.filter((b) => b.status === s).length;
  const completedRows = rows.filter((b) => b.status === 'completed');
  const revenue = completedRows.reduce((sum, b) => sum + b.price, 0);
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
    currency: 'KZT' as const,
  };
}
