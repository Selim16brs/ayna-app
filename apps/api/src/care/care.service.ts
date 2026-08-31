import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { LogInput, LogPatch, MomentInput, RoutineInput } from './care.dto';

const GUN_MS = 24 * 60 * 60 * 1000;

/**
 * BAKIM VERİSİ — kullanıcının kendi bakım takibi.
 *
 * Bakım sekmesinin tamamı cihazda yaşıyordu: rutinler, anlar ve kişisel
 * günlük sunucuya HİÇ yazılmıyordu. Telefon değişince hepsi gidiyordu ve
 * kullanıcı bunu ancak kaybettikten sonra fark ediyordu.
 *
 * TÜRETİLMİŞ ALANLAR BURADA HESAPLANIR, saklanmaz. Mobil model `dueDays` ve
 * `daysLeft` taşıyor; onları saklamak zamanı dondururdu — kullanıcı bir hafta
 * sonra açtığında hâlâ "3 gün kaldı" görürdü. Kaynak tarih saklanıyor, fark
 * her istekte yeniden hesaplanıyor.
 */
@Injectable()
export class CareService {
  constructor(private readonly prisma: PrismaService) {}

  /** Gün farkı — bugünün başlangıcına göre, saat farkı gürültü yapmasın. */
  private gunFarki(hedef: Date): number {
    const b = new Date();
    b.setHours(0, 0, 0, 0);
    return Math.round((hedef.getTime() - b.getTime()) / GUN_MS);
  }

  async mine(userId: string) {
    const [routines, moments, logs] = await Promise.all([
      this.prisma.careRoutine.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.careMoment.findMany({ where: { userId }, orderBy: { happensAt: 'asc' } }),
      this.prisma.careLog.findMany({
        where: { userId },
        orderBy: { loggedAt: 'desc' },
        take: 200,
      }),
    ]);
    return {
      routines: routines.map((r) => ({
        id: r.id,
        name: r.name,
        icon: r.icon,
        periodDays: r.periodDays,
        ...(r.categoryCode ? { categoryCode: r.categoryCode } : {}),
        // Sonraki bakım = son tamamlama + periyot. Negatif → gecikmiş.
        dueDays: this.gunFarki(new Date(r.lastDoneAt.getTime() + r.periodDays * GUN_MS)),
      })),
      moments: moments.map((m) => ({
        id: m.id,
        title: m.title,
        icon: m.icon,
        happensAtMs: m.happensAt.getTime(),
        daysLeft: this.gunFarki(m.happensAt),
      })),
      logs: logs.map((l) => ({
        id: l.id,
        title: l.title,
        icon: l.icon,
        tone: l.tone,
        ...(l.note ? { note: l.note } : {}),
        ...(l.kind ? { kind: l.kind } : {}),
        dateMs: l.loggedAt.getTime(),
      })),
    };
  }

  addRoutine(userId: string, input: RoutineInput) {
    return this.prisma.careRoutine.create({
      data: {
        userId,
        name: input.name,
        ...(input.icon ? { icon: input.icon } : {}),
        periodDays: input.periodDays,
        ...(input.categoryCode ? { categoryCode: input.categoryCode } : {}),
      },
    });
  }

  /**
   * "Tamamladım" — sayacı sıfırlar.
   *
   * `updateMany` + userId koşulu BİLEREK: `update` başkasının satırını
   * kimlik kontrolü yapmadan bulur. Sahibi olmayan istekte 0 satır etkilenir
   * ve 404 döneriz — başkasının rutinini tamamlayamaz.
   */
  async completeRoutine(userId: string, id: string) {
    const r = await this.prisma.careRoutine.updateMany({
      where: { id, userId },
      data: { lastDoneAt: new Date() },
    });
    if (r.count === 0) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Rutin yok' });
    return { ok: true };
  }

  async removeRoutine(userId: string, id: string) {
    const r = await this.prisma.careRoutine.deleteMany({ where: { id, userId } });
    if (r.count === 0) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Rutin yok' });
    return { ok: true };
  }

  addMoment(userId: string, input: MomentInput) {
    return this.prisma.careMoment.create({
      data: {
        userId,
        title: input.title,
        ...(input.icon ? { icon: input.icon } : {}),
        happensAt: new Date(input.happensAtMs),
      },
    });
  }

  async removeMoment(userId: string, id: string) {
    const r = await this.prisma.careMoment.deleteMany({ where: { id, userId } });
    if (r.count === 0) throw new NotFoundException({ code: 'NOT_FOUND', message: 'An yok' });
    return { ok: true };
  }

  addLog(userId: string, input: LogInput) {
    return this.prisma.careLog.create({
      data: {
        userId,
        title: input.title,
        ...(input.icon ? { icon: input.icon } : {}),
        ...(input.tone ? { tone: input.tone } : {}),
        ...(input.note ? { note: input.note } : {}),
        ...(input.kind ? { kind: input.kind } : {}),
        loggedAt: new Date(input.loggedAtMs),
      },
    });
  }

  async updateLog(userId: string, id: string, patch: LogPatch) {
    const r = await this.prisma.careLog.updateMany({
      where: { id, userId },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
        ...(patch.tone !== undefined ? { tone: patch.tone } : {}),
        // Notu BOŞALTMAK geçerli bir işlem: '' → null.
        ...(patch.note !== undefined ? { note: patch.note || null } : {}),
        ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
        ...(patch.loggedAtMs !== undefined ? { loggedAt: new Date(patch.loggedAtMs) } : {}),
      },
    });
    if (r.count === 0) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Kayıt yok' });
    return { ok: true };
  }

  async removeLog(userId: string, id: string) {
    const r = await this.prisma.careLog.deleteMany({ where: { id, userId } });
    if (r.count === 0) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Kayıt yok' });
    return { ok: true };
  }
}
