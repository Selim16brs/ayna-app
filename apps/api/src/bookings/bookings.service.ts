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

  async create(input: CreateBookingInput) {
    // id istemciden gelir → upsert ile idempotent (tekrar gönderim güvenli)
    const data = {
      source: input.source,
      service: input.service,
      proId: input.proId ?? null,
      proName: input.proName,
      proImage: input.proImage,
      uzmanName: input.uzmanName ?? null,
      dateLabel: input.dateLabel,
      inDays: input.inDays,
      price: input.price,
      status: input.status ?? 'confirmed',
    };
    const row = await this.prisma.booking.upsert({
      where: { id: input.id },
      create: { id: input.id, ...data },
      update: data,
    });
    return mapBooking(row);
  }

  async cancel(id: string) {
    return this.transition(id, { status: 'cancelled' });
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
    dateLabel: b.dateLabel,
    proposedDateLabel: b.proposedDateLabel ?? undefined,
    inDays: b.inDays,
    price: Number(b.price),
    status: b.status,
    reviewed: b.reviewed,
  };
}
