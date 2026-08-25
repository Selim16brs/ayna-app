import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { QuotesService } from './quotes.service';

/**
 * Faz 5 (§19) — talep dalga genişletici: ilk dalgadan 30 dk sonra yeterli teklif
 * yoksa havuz kademeli büyür (en fazla 4 dalga). Idempotent: waveAt/notifyWave
 * güncellemeleri aynı işi iki kez koşturmayı zararsız kılar.
 */
@Injectable()
export class QuotesScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(QuotesScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly quotes: QuotesService) {}

  onModuleInit() {
    if (process.env.JOBS_ENABLED === 'false') return;
    this.timer = setInterval(() => void this.tick().catch(() => undefined), 5 * 60_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    const sent = await this.quotes.expandStaleWaves();
    if (sent > 0) this.log.log(`talep dalga genişletme: ${sent} uzmana push`);
  }
}
