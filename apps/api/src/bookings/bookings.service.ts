import { Injectable, NotFoundException } from '@nestjs/common';
import type { Booking } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBookingInput } from './bookings.dto';

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
    return this.transition(id, { status: 'no_show' });
  }

  // §1.6 — uzman randevuyu onaylar
  async approve(id: string) {
    return this.transition(id, { status: 'confirmed', proposedDateLabel: null });
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
    price: Number(b.price),
    status: b.status,
    cancelReason: b.cancelReason ?? undefined,
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
