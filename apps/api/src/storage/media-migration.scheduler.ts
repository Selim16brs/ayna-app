import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';

/**
 * Faz 6 (§27) — BASE64 MEDYA ARKA PLAN MİGRASYONU.
 * Eski kayıtlardaki data-URL görseller okuma anında değil, burada partiler
 * hâlinde object storage'a taşınır (read endpoint şişmez, yarış olmaz).
 * • Idempotent: taşınan kayıt data-URL olmaktan çıkar, sorgu onu bir daha görmez.
 * • Tekil çalıştırıcı: pg advisory lock — aynı anda iki instance işlemez.
 * • R2 yapılandırılmamışsa put() data-URL'i aynen döndürür → iş kendiliğinden atlar.
 */
@Injectable()
export class MediaMigrationScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(MediaMigrationScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  onModuleInit() {
    if (process.env.JOBS_ENABLED === 'false') return;
    this.timer = setInterval(() => void this.tick().catch(() => undefined), 10 * 60_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    // Tekil çalıştırıcı kilidi (oturum bazlı; alınamazsa başka instance çalışıyordur)
    const got = await this.prisma.$queryRaw<{ locked: boolean }[]>`
      SELECT pg_try_advisory_lock(hashtext('media-migration')) AS locked`;
    if (!got[0]?.locked) return;
    try {
      let moved = 0;

      // Kullanıcı avatar/kesik portreleri (parti: 10)
      const users = await this.prisma.user.findMany({
        where: {
          OR: [{ avatarUrl: { startsWith: 'data:' } }, { cutoutUrl: { startsWith: 'data:' } }],
        },
        select: { id: true, avatarUrl: true, cutoutUrl: true },
        take: 10,
      });
      for (const u of users) {
        const a = u.avatarUrl?.startsWith('data:')
          ? await this.storage.put(u.avatarUrl, 'avatars')
          : u.avatarUrl;
        const c = u.cutoutUrl?.startsWith('data:')
          ? await this.storage.put(u.cutoutUrl, 'avatars')
          : u.cutoutUrl;
        if (a !== u.avatarUrl || c !== u.cutoutUrl) {
          await this.prisma.user.update({
            where: { id: u.id },
            data: { avatarUrl: a, cutoutUrl: c },
          });
          moved++;
        } else {
          // R2 kapalı → put aynı değeri döndürüyor; boşa dönmemek için çık
          return;
        }
      }

      // Uzman kapak görselleri (parti: 10)
      const pros = await this.prisma.professional.findMany({
        where: { imageUrl: { startsWith: 'data:' } },
        select: { id: true, imageUrl: true },
        take: 10,
      });
      for (const p of pros) {
        const img = await this.storage.put(p.imageUrl, 'pros');
        if (img && img !== p.imageUrl) {
          await this.prisma.professional.update({ where: { id: p.id }, data: { imageUrl: img } });
          moved++;
        } else return;
      }

      if (moved > 0) this.log.log(`medya migrasyonu: ${moved} kayıt taşındı`);
    } finally {
      await this.prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext('media-migration'))`.catch(
        () => undefined,
      );
    }
  }
}
