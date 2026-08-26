import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CommissionsService } from './commissions.service';

/**
 * FİNANS ZAMANLAYICISI.
 *
 * Faz 0 keşfinin en büyük bulgusu: gelir sistemi mimari olarak vardı ama
 * işlevsel olarak ATILDI. Gecikme taraması (`runOverdue`) ve abonelik sona
 * erdirme (`expireDue`) doğru yazılmıştı, ama **hiçbirini bir zamanlayıcı
 * çağırmıyordu** — ikisi de yalnız admin panelinde bir düğmeye basılınca
 * çalışıyordu. Yani:
 *
 *   · vadesi geçen komisyon faturası kimse panele girmezse hiç `overdue`
 *     olmuyordu; K5'in 45 dakikalık penceresi de bu yüzden hiç işlemezdi,
 *   · süresi dolan Premium/Platinum üyelik `active` kalmaya devam ediyordu —
 *     yani ödemesi biten uzman ayrıcalıklarını süresiz kullanıyordu.
 *
 * Tekil çalıştırıcı: pg advisory lock. Para işleri çok örnekli dağıtımda iki
 * kez çalışamaz — çift kısıtlama ve çift audit kaydı üretirdi.
 *
 * `JOBS_ENABLED=false` ile kapatılabilir (test/CI).
 */
@Injectable()
export class FinanceScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(FinanceScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  // K5 penceresi 45 dakika; 5 dakikalık tarama en fazla o kadar gecikme üretir.
  private static readonly INTERVAL_MS = 5 * 60_000;
  private static readonly LOCK_KEY = 'finance-scheduler';

  constructor(
    private readonly prisma: PrismaService,
    private readonly commissions: CommissionsService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  onModuleInit() {
    if (process.env.JOBS_ENABLED === 'false') return;
    this.timer = setInterval(
      () => void this.tick().catch(() => undefined),
      FinanceScheduler.INTERVAL_MS,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    const got = await this.prisma.$queryRaw<{ locked: boolean }[]>`
      SELECT pg_try_advisory_lock(hashtext(${FinanceScheduler.LOCK_KEY})) AS locked`;
    if (!got[0]?.locked) return;
    try {
      // İki iş birbirinden bağımsız: biri patlarsa diğeri yine çalışmalı.
      // Aksi hâlde tek bir bozuk faturanın abonelik sona erdirmeyi de
      // durdurması, sessiz bir gelir kaybına dönerdi.
      const overdue = await this.commissions.runOverdue().catch((e: unknown) => {
        this.log.error(`gecikme taraması: ${e instanceof Error ? e.message : String(e)}`);
        return null;
      });
      const expired = await this.subscriptions.expireDue().catch((e: unknown) => {
        this.log.error(`abonelik sona erdirme: ${e instanceof Error ? e.message : String(e)}`);
        return null;
      });

      // Sessiz kalma: bir şey olduğunda tek satır. PII yok, yalnız adet.
      if (overdue?.markedOverdue || overdue?.restricted || expired?.expired) {
        this.log.log(
          `finans: vadesi-geçen=${overdue?.markedOverdue ?? 0} ` +
            `kısıtlanan=${overdue?.restricted ?? 0} biten-üyelik=${expired?.expired ?? 0}`,
        );
      }
    } finally {
      await this.prisma
        .$queryRaw`SELECT pg_advisory_unlock(hashtext(${FinanceScheduler.LOCK_KEY}))`.catch(
        () => undefined,
      );
    }
  }
}
