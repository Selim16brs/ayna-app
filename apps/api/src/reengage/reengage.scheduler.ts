import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { CATEGORY_DEFAULTS } from '@ayna/domain';
import { kategoriKodu } from './reengage.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

const GUN_MS = 24 * 60 * 60 * 1000;
const SAAT_MS = 60 * 60 * 1000;

/**
 * OTOMATİK GERİ ÇAĞIRMA — bakım periyodu dolan müşteriye hatırlatma.
 *
 * Eskiden bu İSTEMCİDE çalışıyordu ve tamamen kurguydu:
 *   - `SELLER_PAST_CLIENTS` yani SEED verisi üzerinde dönüyordu; gerçek
 *     müşteriler hiç bakılmıyordu,
 *   - bildirimi YEREL üretiyordu, yani uzmanın kendi cihazında görünüyor,
 *     müşteriye hiç ulaşmıyordu,
 *   - yalnız uzman uygulamayı AÇTIĞINDA çalışıyordu — periyot uzman
 *     uygulamayı açmadığı gün dolarsa hatırlatma hiç gitmiyordu.
 *
 * Artık sunucuda. Saatte bir dönüyor: bu günlük ritimli bir iş, dakikalık
 * tarama boşuna yük olurdu.
 */
@Injectable()
export class ReengageScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(ReengageScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  onModuleInit() {
    // İlk turu 1 dakika gecikmeli: konteyner açılışında veritabanı henüz
    // hazır olmayabilir ve hata log'u gürültü yapar.
    setTimeout(() => void this.tick().catch(() => undefined), 60_000);
    this.timer = setInterval(() => void this.tick().catch(() => undefined), SAAT_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  // Kategori çözümü ORTAK (`reengage.service`): uzmanın ekranda gördüğü liste
  // ile gerçekte gönderilenler ayrışmasın.

  async tick(): Promise<void> {
    const simdi = Date.now();
    // Yalnız bakım penceresine GİREBİLECEK randevular: en uzun periyot 365
    // (kalıcı makyaj). Daha eskisini taramak boşuna.
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: 'completed',
        startAt: { gte: new Date(simdi - 400 * GUN_MS), not: null },
        userId: { not: null },
        proId: { not: null },
      },
      select: { id: true, userId: true, proId: true, service: true, startAt: true },
      take: 5000,
    });
    if (bookings.length === 0) return;

    // Uzman sahiplerini ve tercihlerini TOPLU çek — randevu başına sorgu
    // açmak (N+1) saatlik turu dakikalara çıkarırdı.
    const proIds = [...new Set(bookings.map((b) => b.proId!))];
    const sps = await this.prisma.specialist.findMany({
      where: { proId: { in: proIds } },
      select: { proId: true, userId: true },
    });
    const sahipByPro = new Map(sps.filter((x) => x.proId).map((x) => [x.proId!, x.userId]));
    const sahipler = [...new Set(sahipByPro.values())];
    const [users, prefs, pros] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: sahipler } },
        select: { id: true, name: true, membershipTier: true, membershipUntil: true },
      }),
      this.prisma.userPrefs.findMany({
        where: { userId: { in: sahipler } },
        select: { userId: true, autoReengage: true },
      }),
      this.prisma.professional.findMany({
        where: { id: { in: proIds } },
        select: { id: true, name: true },
      }),
    ]);
    const userById = new Map(users.map((u) => [u.id, u]));
    // Tercih satırı YOKSA varsayılan AÇIK — şemadaki varsayılanla aynı.
    const kapali = new Set(prefs.filter((p) => !p.autoReengage).map((p) => p.userId));
    const proAdi = new Map(pros.map((p) => [p.id, p.name]));

    for (const b of bookings) {
      const kat = kategoriKodu(b.service);
      if (!kat) continue;
      const periyot = CATEGORY_DEFAULTS[kat].maintenanceDays;
      if (periyot <= 0) continue; // periyodik olmayan hizmet (gelin paketi, makyaj)

      const sahip = sahipByPro.get(b.proId!);
      if (!sahip || kapali.has(sahip)) continue;
      const u = userById.get(sahip);
      if (!u) continue;
      // §11 — PREMIUM özelliği. Kapı sunucuda: eskiden yalnız istemcide vardı.
      const uyelikGecerli = !u.membershipUntil || u.membershipUntil.getTime() > simdi;
      const odenmis =
        uyelikGecerli && (u.membershipTier === 'premium' || u.membershipTier === 'platinum');
      if (!odenmis) continue;

      const dolumMs = b.startAt!.getTime() + periyot * GUN_MS;
      const kalanGun = Math.round((dolumMs - simdi) / GUN_MS);
      const stage = kalanGun === 1 ? 'pre' : kalanGun === 0 ? 'due' : null;
      if (!stage) continue;

      // İdempotans: kayıt VARSA atla. `create` yarışta P2002 atar, onu da
      // yutuyoruz — iki konteyner aynı anda dönerse çift bildirim gitmesin.
      try {
        await this.prisma.reengageSent.create({ data: { bookingId: b.id, stage } });
      } catch {
        continue;
      }
      const ad = proAdi.get(b.proId!) ?? u.name;
      await this.push.sendToUser(b.userId!, {
        title: stage === 'pre' ? 'Bakım zamanın yaklaşıyor' : 'Bakım zamanın geldi',
        body:
          stage === 'pre'
            ? `${ad} ile son randevunun üzerinden neredeyse ${periyot} gün geçti.`
            : `${ad} ile bakım zamanın bugün doldu — yeni randevu alabilirsin.`,
        data: { route: '/bookings', proId: b.proId! },
      });
    }
  }
}
