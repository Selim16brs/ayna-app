import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KEEP_SENT_DAYS } from './outbox.rules';
import { PushService } from './push.service';

/**
 * §10.3 — outbox tahliyesi.
 *
 * Teslim edilemeyen bildirimleri artan aralıklarla tekrar dener ve teslim
 * edilmişleri budar. Push artık "gönderdim, tuttuysa tuttu" değil.
 *
 * Tekil çalıştırıcı: pg advisory lock — iki örnek aynı satırı iki kez teslim
 * etmesin (kullanıcı aynı bildirimi iki kez görürdü).
 */
@Injectable()
export class OutboxScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(OutboxScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  private static readonly INTERVAL_MS = 60_000;
  private static readonly LOCK_KEY = 'notification-outbox';
  private static readonly BATCH = 50;

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  onModuleInit() {
    if (process.env.JOBS_ENABLED === 'false') return;
    this.timer = setInterval(
      () => void this.tick().catch(() => undefined),
      OutboxScheduler.INTERVAL_MS,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    const got = await this.prisma.$queryRaw<{ locked: boolean }[]>`
      SELECT pg_try_advisory_lock(hashtext(${OutboxScheduler.LOCK_KEY})) AS locked`;
    if (!got[0]?.locked) return;
    try {
      const now = new Date();
      const bekleyen = await this.prisma.notificationOutbox.findMany({
        where: { status: 'pending', nextAttemptAt: { lte: now } },
        select: { id: true },
        orderBy: { nextAttemptAt: 'asc' },
        take: OutboxScheduler.BATCH,
      });

      let teslim = 0;
      for (const r of bekleyen) {
        // Tek satırın hatası partiyi durdurmasın.
        if (await this.push.deliver(r.id).catch(() => false)) teslim += 1;
      }

      // Teslim edilmiş satırlar süresiz durmaz: title/body kullanıcı adı taşıyabilir.
      const budandi = await this.prisma.notificationOutbox.deleteMany({
        where: {
          status: 'sent',
          sentAt: { lt: new Date(now.getTime() - KEEP_SENT_DAYS * 86_400_000) },
        },
      });

      if (bekleyen.length || budandi.count) {
        this.log.log(
          `outbox: denenen=${bekleyen.length} teslim=${teslim} budanan=${budandi.count}`,
        );
      }
    } finally {
      await this.prisma
        .$queryRaw`SELECT pg_advisory_unlock(hashtext(${OutboxScheduler.LOCK_KEY}))`.catch(
        () => undefined,
      );
    }
  }
}
