import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment.provider';
import { paymentSplit } from '@ayna/domain';
import { loadLedgerState, loadLoyaltyRules } from '../loyalty/loyalty.rules';

// EK Z.8 — In-app ödeme servisi (Kaspi sim adaptörüyle).
// K4 — puan kullanımı: 50.000 ₸ kilidi + ödemenin en çok %25'i.
@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly audit: AuditService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  // Bakiye ASLA SUM(points) ile hesaplanmaz: o toplam süresi DOLMUŞ puanları da
  // sayardı — yani kullanıcı yanmış puanla ödeme yapabiliyordu. FIFO motoru
  // (@ayna/domain replayLedger) yalnız canlı partileri toplar.
  private async pointsBalance(userId: string): Promise<number> {
    return (await loadLedgerState(this.prisma, userId)).available;
  }

  // K4.2 — kilit damgası. null ise puan hiç kullanılamaz.
  private async pointsUnlockedAt(userId: string): Promise<Date | null> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pointsUnlockedAt: true },
    });
    return u?.pointsUnlockedAt ?? null;
  }

  // Ödeme niyeti oluştur — bedel = randevu fiyatı; puan tavan+bakiye ile sınırlanır.
  async createIntent(userId: string, bookingId: string, pointsRequested: number) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    const amount = Math.round(Number(booking.price));
    if (amount <= 0)
      throw new BadRequestException({ code: 'BAD_AMOUNT', message: 'Geçersiz tutar' });
    const [balance, unlockedAt, rules] = await Promise.all([
      this.pointsBalance(userId),
      this.pointsUnlockedAt(userId),
      loadLoyaltyRules(this.prisma),
    ]);
    const split = paymentSplit(
      amount,
      Math.max(0, Math.floor(pointsRequested || 0)),
      balance,
      unlockedAt,
      rules,
    );
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
    // §12 — kritik eylem denetim kaydı. Ödeme yolu HİÇ audit yazmıyordu: gerçek
    // para el değiştiriyor ve puan yakılıyor, ama kimin ne zaman ne ödediğinin
    // kaydı yoktu. safeDiff yalnız TUTAR taşır — PII yok (docs/security/03).
    await this.audit.record({
      actorId: userId,
      actorRole: 'user',
      action: 'payment.intent',
      resourceType: 'payment',
      resourceId: p.id,
      safeDiff: { amount, pointsUsed: split.pointsUsed, cash: split.cashAmount },
    });
    return this.map(p);
  }

  // Ödemeyi onayla → sağlayıcıdan nakit tahsilatı (sim) + puan harcaması (ledger).
  async confirm(userId: string, paymentId: string) {
    const p = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!p || p.userId !== userId)
      throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Ödeme bulunamadı' });
    if (p.status !== 'pending')
      throw new BadRequestException({ code: 'ALREADY_PROCESSED', message: 'Ödeme zaten işlendi' });

    // Puan bakiyesini tekrar doğrula (aradaki harcamalara karşı)
    if (p.pointsUsed > 0 && (await this.pointsBalance(userId)) < p.pointsUsed) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_POINTS',
        message: 'Puan bakiyesi yetersiz',
      });
    }

    const charge = await this.provider.charge({
      paymentId: p.id,
      amount: Number(p.cashAmount),
      currency: 'KZT',
    });
    if (!charge.ok) {
      await this.prisma.payment.update({ where: { id: p.id }, data: { status: 'failed' } });
      await this.audit.record({
        actorId: userId,
        actorRole: 'user',
        action: 'payment.failed',
        resourceType: 'payment',
        resourceId: p.id,
        safeDiff: { cash: Number(p.cashAmount) },
      });
      throw new BadRequestException({ code: 'CHARGE_FAILED', message: 'Ödeme alınamadı' });
    }

    // Puan harcaması — sadakat defterine (negatif)
    if (p.pointsUsed > 0) {
      await this.prisma.loyaltyEntry.create({
        data: {
          userId,
          kind: 'spend',
          reason: 'rewards.spend.payment',
          detail: p.bookingId,
          points: -p.pointsUsed,
        },
      });
    }
    const paid = await this.prisma.payment.update({
      where: { id: p.id },
      data: { status: 'paid', providerRef: charge.providerRef, paidAt: new Date() },
    });
    // Paranın gerçekten geçtiği an — denetim izinin en kritik satırı.
    await this.audit.record({
      actorId: userId,
      actorRole: 'user',
      action: 'payment.paid',
      resourceType: 'payment',
      resourceId: p.id,
      safeDiff: {
        amount: Number(p.amount),
        cash: Number(p.cashAmount),
        pointsUsed: p.pointsUsed,
        bookingId: p.bookingId,
      },
    });
    // Brief §4.4 — "Dekont yüklendiği an randevu KESINLESTI sayılır. Admin
    // doğrulaması sonradan yapılır; dekont sahteyse randevu iptal edilir ve
    // kullanıcı platformdan yasaklanır."
    //
    // UZMAN ONAYI ADIMI KALDIRILDI: eskiden ara bir "dekont yüklendi" durumu olup uzmanın
    // "aldım" demesi bekleniyordu. Müşteri parayı ödedikten sonra randevusunun
    // uzmanın eline bakması, 10 dakikalık pencerenin anlamını yok ediyordu.
    const b = await this.prisma.booking.findUnique({ where: { id: p.bookingId } });
    if (b?.status === 'depozito_bekliyor') {
      await this.prisma.booking.update({
        where: { id: b.id },
        data: {
          status: 'kesinlesti',
          depositReceiptUri: `kaspi:${paid.id}`,
          depositDeadline: null,
        },
      });
      // §6 — "Depozito yüklendi → İKİSİNE: Randevu kesinleşti ✓"
      const alicilar = [b.userId];
      if (b.proId) {
        const sp = await this.prisma.specialist.findFirst({ where: { proId: b.proId } });
        if (sp) alicilar.push(sp.userId);
      }
      for (const uid of alicilar) {
        if (!uid) continue;
        void this.push
          .sendToUser(uid, {
            title: 'Randevu kesinleşti ✓',
            body: 'Depozito alındı. Randevunuz garanti altında.',
            data: { route: `/booking/${b.id}` },
          })
          .catch(() => undefined);
      }
    }
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
