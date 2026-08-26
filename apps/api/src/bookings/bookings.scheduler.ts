import { grantCompletionRewards } from '../loyalty/completion-rewards';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { BookingsService } from './bookings.service';

/**
 * Faz 1 (iyileştirme planı §17) — SÜRE AŞIMI SUNUCU İŞLERİ.
 * Pencerelerin (yanıt 6sa, dekont 3sa) kaynağı artık yalnız istemci sayacı değil:
 * bu servis her dakika süresi dolan kayıtları `expired` durumuna düşürür.
 * updateMany + koşullu where = IDEMPOTENT (aynı iş iki kez koşarsa yan etki üretmez).
 * PII loglanmaz — yalnız sayılar.
 */
@Injectable()
export class BookingsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(BookingsScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly bookings: BookingsService,
  ) {}

  onModuleInit() {
    // JOBS_ENABLED=false ile kapatılabilir (test/CI). Varsayılan AÇIK.
    if (process.env.JOBS_ENABLED === 'false') return;
    this.timer = setInterval(() => void this.tick().catch(() => undefined), 60_000);
    // Açılışta bir kez hemen koş — yeniden başlatmada birikmiş süresi dolanlar bekletilmez
    void this.tick().catch(() => undefined);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    const now = new Date();

    // 1) Yanıt penceresi dolan talepler → expired (+ müşteriye bilgi push'u)
    const expiredRequests = await this.prisma.booking.findMany({
      where: { status: 'awaiting_provider', responseDeadline: { lt: now } },
      select: { id: true, userId: true, proName: true },
      take: 200,
    });
    if (expiredRequests.length) {
      await this.prisma.booking.updateMany({
        where: { id: { in: expiredRequests.map((b) => b.id) } },
        data: { status: 'expired', cancelReason: 'Yanıt süresi doldu' },
      });
      for (const b of expiredRequests) {
        if (!b.userId) continue;
        void this.push
          .sendTemplate(
            b.userId,
            'booking.request_expired',
            { pro: b.proName },
            {
              route: '/(tabs)/bookings',
            },
          )
          .catch(() => undefined);
      }
    }

    // 2) Dekont penceresi dolan kaporalar → expired + slot boşaldı → bekleme listesi
    const expiredDeposits = await this.prisma.booking.findMany({
      where: { status: 'deposit_pending', depositDeadline: { lt: now } },
      take: 200,
    });
    if (expiredDeposits.length) {
      await this.prisma.booking.updateMany({
        where: { id: { in: expiredDeposits.map((b) => b.id) } },
        data: { status: 'expired', cancelReason: 'Kapora süresi doldu' },
      });
      for (const b of expiredDeposits) {
        // Slot boşaldı — bekleme listesindekilere sırayla haber ver (mevcut akış)
        void this.bookings.notifyWaitlistFor(b).catch(() => undefined);
        if (b.userId) {
          void this.push
            .sendTemplate(b.userId, 'booking.deposit_expired', undefined, {
              route: '/(tabs)/bookings',
            })
            .catch(() => undefined);
        }
      }
    }

    // 3) Faz 2 — teyit penceresi dolan 'tamamlandı' beyanları otomatik kesinleşir
    const finalize = await this.prisma.booking.findMany({
      where: { status: 'completed_pending', finalizeDeadline: { lt: now } },
      select: { id: true, userId: true, price: true },
      take: 200,
    });
    if (finalize.length) {
      await this.prisma.booking.updateMany({
        where: { id: { in: finalize.map((b) => b.id) } },
        // §12.8 — bu yol transition()'ı ATLIYOR (updateMany). Tamamlanma anı
        // burada da yazılmazsa o randevular hiçbir komisyon dönemine düşmez.
        data: { status: 'completed', completedAt: now },
      });
      // K4.1 geri kazanım + D9 referans ödülü. İki kez yazılmaz: müşteri teyidi
      // yoluyla zaten yazılmışsa her iki ödül de atlanır.
      await grantCompletionRewards(this.prisma, finalize).catch((e: unknown) =>
        this.log.error(`ödüller yazılamadı: ${e instanceof Error ? e.message : String(e)}`),
      );
      for (const b of finalize) {
        if (!b.userId) continue;
        void this.push
          .sendToUser(b.userId, {
            title: 'Hizmetin tamamlandı ✨',
            body: 'Deneyimini değerlendir — 30 saniye sürer',
            data: { route: `/review/new?id=${b.id}` },
          })
          .catch(() => undefined);
      }
    }

    // 4) Faz 2 — no-show teyit penceresi doldu (itiraz yok) → kapora yanar (kesinleşme)
    const forfeit = await this.prisma.booking.updateMany({
      where: { status: 'no_show', finalizeDeadline: { lt: now }, depositForfeited: false },
      data: { depositForfeited: true, finalizeDeadline: null },
    });

    if (expiredRequests.length || expiredDeposits.length || finalize.length || forfeit.count) {
      this.log.log(
        `süre aşımı: talep=${expiredRequests.length} kapora=${expiredDeposits.length} kesinleşen=${finalize.length} no-show-forfeit=${forfeit.count}`,
      );
    }
  }
}
