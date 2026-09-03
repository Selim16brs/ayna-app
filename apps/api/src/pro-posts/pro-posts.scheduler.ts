import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ProPostsService } from './pro-posts.service';

/**
 * SÜRESİ BİTEN PAYLAŞIMLARI SİLER.
 *
 * Kurucu: "bu gönderilen fotoğraflar 7 gün kalacak ve sonrasında sistemden
 * silinecek."
 *
 * İKİ KATMAN VAR ve ikisi de gerekli:
 *   · Gösterim kapısı — süresi geçen gönderi hiçbir sorguda dönmüyor.
 *     Temizlik gecikse bile müşteri onu GÖRMÜYOR.
 *   · Bu iş — kaydı VE fotoğrafı depodan gerçekten siliyor. Yalnız
 *     gizlemek, kişisel veriyi sunucuda süresiz saklamak olurdu.
 *
 * Saatte bir: günde bir olsaydı süresi dolan bir fotoğraf depoda 24 saate
 * kadar fazladan durabilirdi.
 *
 * Deseni `QuotesScheduler` ile aynı — `JOBS_ENABLED=false` ile
 * kapatılabiliyor ki testler ve yerel çalıştırmalar arka planda iş
 * koşturmasın.
 */
@Injectable()
export class ProPostsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(ProPostsScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly posts: ProPostsService) {}

  onModuleInit() {
    if (process.env.JOBS_ENABLED === 'false') return;
    this.timer = setInterval(() => void this.tick().catch(() => undefined), 60 * 60_000);
    // Açılışta da bir kez: sunucu bir gün kapalı kalırsa süresi geçmiş
    // fotoğraflar bir sonraki saati beklemeden gitsin.
    void this.tick().catch(() => undefined);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick(): Promise<void> {
    const n = await this.posts.sureBitenleriTemizle();
    if (n > 0) this.log.log(`süresi biten paylaşım silindi: ${n}`);
  }
}
