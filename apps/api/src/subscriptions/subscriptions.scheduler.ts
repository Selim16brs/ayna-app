import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from './subscriptions.service';

/**
 * ABONELİK SÜRESİ DOLDURMA — 5 dakikada bir.
 *
 * Süresi biten Premium/Platinum üyelik `active` kalmaya devam ediyordu; yani
 * ödemesi biten uzman ayrıcalıklarını süresiz kullanıyordu.
 *
 * Eskiden bu iş `FinanceScheduler` içindeydi ve komisyon gecikme taramasıyla
 * aynı turda koşuyordu. Randevu brief'i (§4.4, §10) ikinci tahsilatı tümden
 * kaldırdı — depozito zaten AYNA'nın komisyonu — dolayısıyla o modül silindi.
 * Abonelik geliri AYRI bir iştir ve silinmemeli; kendi modülüne taşındı.
 *
 * Advisory lock: birden çok konteyner aynı anda dönmesin.
 */
@Injectable()
export class SubscriptionsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(SubscriptionsScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private static readonly INTERVAL_MS = 5 * 60_000;
  private static readonly LOCK_KEY = 'subscriptions-scheduler';

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  onModuleInit() {
    if (process.env.JOBS_ENABLED === 'false') return;
    this.timer = setInterval(
      () => void this.tick().catch(() => undefined),
      SubscriptionsScheduler.INTERVAL_MS,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    const got = await this.prisma.$queryRaw<{ locked: boolean }[]>`
      SELECT pg_try_advisory_lock(hashtext(${SubscriptionsScheduler.LOCK_KEY})) AS locked`;
    if (!got[0]?.locked) return;
    try {
      const expired = await this.subscriptions.expireDue().catch((e: unknown) => {
        this.log.error(`abonelik sona erdirme: ${e instanceof Error ? e.message : String(e)}`);
        return null;
      });
      // Sessiz kalma: bir şey olduğunda tek satır. PII yok, yalnız adet.
      if (expired?.expired) this.log.log(`biten üyelik: ${expired.expired}`);
    } finally {
      await this.prisma
        .$queryRaw`SELECT pg_advisory_unlock(hashtext(${SubscriptionsScheduler.LOCK_KEY}))`.catch(
        () => undefined,
      );
    }
  }
}
