import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AvailabilityInput, BlockInput } from './calendar.dto';

// Kazakistan tek saat dilimi UTC+5 (DST yok, Mart 2024'ten beri)
const TZ_OFFSET = '+05:00';

interface DayWindow {
  start: string;
  end: string;
}

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  private async mySpecialistId(userId: string): Promise<string> {
    const s = await this.prisma.specialist.findUnique({ where: { userId } });
    if (!s) throw new ForbiddenException({ code: 'NOT_SPECIALIST', message: 'Uzman hesabı yok' });
    return s.id;
  }

  async setAvailability(userId: string, input: AvailabilityInput) {
    const specialistId = await this.mySpecialistId(userId);
    const data = {
      weeklyHours: input.weeklyHours as Prisma.InputJsonValue,
      slotMinutes: input.slotMinutes,
    };
    await this.prisma.specialistAvailability.upsert({
      where: { specialistId },
      create: { specialistId, ...data },
      update: data,
    });
    return this.getAvailability(userId);
  }

  async getAvailability(userId: string) {
    const specialistId = await this.mySpecialistId(userId);
    const a = await this.prisma.specialistAvailability.findUnique({ where: { specialistId } });
    return {
      weeklyHours: (a?.weeklyHours as unknown as Record<string, DayWindow>) ?? {},
      slotMinutes: a?.slotMinutes ?? 60,
    };
  }

  async addBlock(userId: string, input: BlockInput) {
    const specialistId = await this.mySpecialistId(userId);
    const start = new Date(input.startAt);
    const end = new Date(input.endAt);
    if (end.getTime() <= start.getTime()) {
      throw new BadRequestException({
        code: 'BAD_RANGE',
        message: 'Bitiş başlangıçtan sonra olmalı',
      });
    }
    const b = await this.prisma.specialistBlock.create({
      data: { specialistId, startAt: start, endAt: end, kind: 'offline', label: input.label ?? '' },
    });
    return mapBlock(b);
  }

  async listBlocks(userId: string) {
    const specialistId = await this.mySpecialistId(userId);
    const rows = await this.prisma.specialistBlock.findMany({
      where: { specialistId },
      orderBy: { startAt: 'asc' },
    });
    return rows.map(mapBlock);
  }

  async deleteBlock(userId: string, id: string) {
    const specialistId = await this.mySpecialistId(userId);
    const b = await this.prisma.specialistBlock.findUnique({ where: { id } });
    if (!b || b.specialistId !== specialistId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Blok bulunamadı' });
    }
    await this.prisma.specialistBlock.delete({ where: { id } });
    return { ok: true };
  }

  // §1.5/§3.6 — verilen tarihte müsait saatler: çalışma penceresi − bloklar − geçmiş
  async slots(specialistId: string, date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException({ code: 'BAD_DATE', message: 'Tarih YYYY-MM-DD olmalı' });
    }
    const availability = await this.prisma.specialistAvailability.findUnique({
      where: { specialistId },
    });
    if (!availability) return { date, slots: [] };

    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const weekly = availability.weeklyHours as unknown as Record<string, DayWindow>;
    const window = weekly[String(weekday)];
    if (!window) return { date, slots: [] };

    const step = availability.slotMinutes;
    const startMin = toMinutes(window.start);
    const endMin = toMinutes(window.end);

    const dayStart = new Date(`${date}T00:00:00${TZ_OFFSET}`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const blocks = await this.prisma.specialistBlock.findMany({
      where: { specialistId, startAt: { lt: dayEnd }, endAt: { gt: dayStart } },
    });

    const now = Date.now();
    const slots: string[] = [];
    for (let m = startMin; m + step <= endMin; m += step) {
      const label = fromMinutes(m);
      const slotStart = new Date(`${date}T${label}:00${TZ_OFFSET}`);
      const slotEnd = new Date(slotStart.getTime() + step * 60 * 1000);
      if (slotStart.getTime() < now) continue; // geçmiş saat
      const conflict = blocks.some(
        (b) => slotStart.getTime() < b.endAt.getTime() && slotEnd.getTime() > b.startAt.getTime(),
      );
      if (!conflict) slots.push(label);
    }
    return { date, slots };
  }
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h! * 60 + m!;
}

function fromMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function mapBlock(b: { id: string; startAt: Date; endAt: Date; kind: string; label: string }) {
  return {
    id: b.id,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    kind: b.kind,
    label: b.label,
  };
}
