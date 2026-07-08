import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment.provider';
import { paymentSplit } from './payment.split';

// EK Z.8 — In-app ödeme servisi (Kaspi sim adaptörüyle). §8.2 puan %50 tavanı.
@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  private async pointsBalance(userId: string): Promise<number> {
    const agg = await this.prisma.loyaltyEntry.aggregate({ where: { userId }, _sum: { points: true } });
    return agg._sum.points ?? 0;
  }

  // Ödeme niyeti oluştur — bedel = randevu fiyatı; puan tavan+bakiye ile sınırlanır.
  async createIntent(userId: string, bookingId: string, pointsRequested: number) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    const amount = Math.round(Number(booking.price));
    if (amount <= 0) throw new BadRequestException({ code: 'BAD_AMOUNT', message: 'Geçersiz tutar' });
    const balance = await this.pointsBalance(userId);
    const split = paymentSplit(amount, Math.max(0, Math.floor(pointsRequested || 0)), balance);
    const p = await this.prisma.payment.create({
      data: {
        bookingId,
        userId,
        amount,
        pointsUsed: split.pointsUsed,
        cashAmount: split.cashAmount,
        method: 'kaspi',
        status: 'pending',
      },
    });
    return this.map(p);
  }

  // Ödemeyi onayla → sağlayıcıdan nakit tahsilatı (sim) + puan harcaması (ledger).
  async confirm(userId: string, paymentId: string) {
    const p = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!p || p.userId !== userId) throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Ödeme bulunamadı' });
    if (p.status !== 'pending') throw new BadRequestException({ code: 'ALREADY_PROCESSED', message: 'Ödeme zaten işlendi' });

    // Puan bakiyesini tekrar doğrula (aradaki harcamalara karşı)
    if (p.pointsUsed > 0 && (await this.pointsBalance(userId)) < p.pointsUsed) {
      throw new BadRequestException({ code: 'INSUFFICIENT_POINTS', message: 'Puan bakiyesi yetersiz' });
    }

    const charge = await this.provider.charge({ paymentId: p.id, amount: Number(p.cashAmount), currency: 'KZT' });
    if (!charge.ok) {
      await this.prisma.payment.update({ where: { id: p.id }, data: { status: 'failed' } });
      throw new BadRequestException({ code: 'CHARGE_FAILED', message: 'Ödeme alınamadı' });
    }

    // Puan harcaması — sadakat defterine (negatif)
    if (p.pointsUsed > 0) {
      await this.prisma.loyaltyEntry.create({
        data: { userId, kind: 'spend', reason: 'rewards.spend.payment', detail: p.bookingId, points: -p.pointsUsed },
      });
    }
    const paid = await this.prisma.payment.update({
      where: { id: p.id },
      data: { status: 'paid', providerRef: charge.providerRef, paidAt: new Date() },
    });
    return this.map(paid);
  }

  async mine(userId: string, bookingId: string) {
    const p = await this.prisma.payment.findFirst({
      where: { userId, bookingId },
      orderBy: { createdAt: 'desc' },
    });
    return p ? this.map(p) : null;
  }

  private map(p: {
    id: string;
    bookingId: string;
    amount: unknown;
    pointsUsed: number;
    cashAmount: unknown;
    method: string;
    status: string;
    providerRef: string | null;
    paidAt: Date | null;
  }) {
    return {
      id: p.id,
      bookingId: p.bookingId,
      amount: Number(p.amount),
      pointsUsed: p.pointsUsed,
      cashAmount: Number(p.cashAmount),
      method: p.method,
      status: p.status,
      providerRef: p.providerRef,
      paidAt: p.paidAt,
    };
  }
}
