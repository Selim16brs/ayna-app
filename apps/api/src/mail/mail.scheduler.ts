import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from './mailer.service';

/**
 * YAŞAM DÖNGÜSÜ ZAMANLAYICISI.
 *
 * AIVIO'daki zamanlayıcıdan uyarlandı; iskelet aynı, tetikleyiciler AYNA'nın
 * kendi akışından:
 *
 *   AIVIO                          AYNA
 *   ─────────────────────────      ──────────────────────────────────────
 *   kayıt oldu, ders başlamadı  →  kayıt oldu, hiç randevu almadı
 *   seriyi bozma (streak)       →  yarın randevun var
 *   satın alma hatırlatması     →  hizmet bitti, değerlendirme yok
 *   —                           →  iaden hazır, hesap bilgisi girilmedi
 *   geri kazanım                →  geri kazanım
 *
 * ÜÇ KURAL (üçü de AIVIO'da öğrenildi):
 *   1. GEÇ gönder, SIK değil. Her şablon kullanıcı başına bir kez; tekrar
 *      engelleme veritabanında.
 *   2. Sessiz düşme yok — her gönderim `email_log`a yazılıyor.
 *   3. Bir adresin düşmesi koşuyu durdurmuyor.
 */
@Injectable()
export class MailScheduler {
  private readonly logger = new Logger(MailScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  private gunOnce(gun: number): Date {
    return new Date(Date.now() - gun * 24 * 60 * 60 * 1000);
  }

  /**
   * Kayıt olalı 2 günü geçmiş ama HİÇ randevusu olmayan kullanıcılar.
   *
   * 2 gün beklemenin sebebi: aynı gün kayıt olup akşam randevu alan çok;
   * hemen göndermek "neden aramıyorsun" diye dürtmek olurdu.
   */
  private async ilkRandevu(): Promise<number> {
    /*
     * `user.bookings` diye bir ilişki YOK — şemada User ile Booking arasında
     * Prisma ilişkisi tanımlı değil, bağ yalnız `booking.userId` kolonu.
     * Bu yüzden "hiç randevusu olmayan" iç içe sorguyla değil, iki adımda
     * bulunuyor.
     */
    const adaylar = await this.prisma.user.findMany({
      where: {
        status: 'active',
        email: { not: null },
        role: 'user',
        createdAt: { lt: this.gunOnce(2) },
      },
      select: { id: true },
      take: 500,
    });
    if (adaylar.length === 0) return 0;
    const randevusuOlan = new Set(
      (
        await this.prisma.booking.findMany({
          where: { userId: { in: adaylar.map((u) => u.id) } },
          select: { userId: true },
          distinct: ['userId'],
        })
      ).map((b) => b.userId),
    );
    let n = 0;
    for (const u of adaylar) {
      if (randevusuOlan.has(u.id)) continue;
      if (await this.mailer.gonder(u.id, 'ilk_randevu')) n += 1;
    }
    return n;
  }

  /**
   * Yarın randevusu olanlar.
   *
   * Hatırlatma İŞLEMSEL: abonelikten çıkma bağlantısı yok ve bir randevu
   * için bir kez gider. Tekrar engelleme `(userId, template)` üzerinden
   * olduğu için ikinci bir randevuda TEKRAR GİTMEZ — bilinçli bir sınır:
   * hatırlatmanın asıl kanalı push, e-posta yalnız yedek. Randevu başına
   * hatırlatma istenirse şablon anahtarına randevu kimliği eklenmeli.
   */
  private async randevuHatirlatma(): Promise<number> {
    const bas = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const son = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const randevular = await this.prisma.booking.findMany({
      where: { status: 'kesinlesti', startAt: { gte: bas, lt: son }, userId: { not: null } },
      select: { userId: true, proName: true, startAt: true },
      take: 200,
    });
    let n = 0;
    for (const r of randevular) {
      if (!r.userId) continue;
      const ok = await this.mailer.gonder(r.userId, 'randevu_hatirlatma', {
        uzman: r.proName ?? '',
        zaman: r.startAt?.toISOString() ?? '',
      });
      if (ok) n += 1;
    }
    return n;
  }

  /** Hizmeti biteli 1 günü geçmiş, henüz değerlendirmemiş kullanıcılar. */
  private async degerlendirme(): Promise<number> {
    const randevular = await this.prisma.booking.findMany({
      where: {
        status: 'tamamlandi',
        completedAt: { lt: this.gunOnce(1), gt: this.gunOnce(14) },
        // Şemada hazır bayrak var; "yorum var mı" diye ayrı sorgu atmaya gerek yok.
        reviewed: false,
        userId: { not: null },
      },
      select: { userId: true, proName: true },
      take: 200,
    });
    let n = 0;
    for (const r of randevular) {
      if (!r.userId) continue;
      if (await this.mailer.gonder(r.userId, 'degerlendirme', { uzman: r.proName ?? '' })) n += 1;
    }
    return n;
  }

  /**
   * İade hakkı doğmuş ama hesap bilgisi girilmemiş randevular.
   *
   * Bu, listedeki en DEĞERLİ posta: kullanıcının parası bekliyor ve onu
   * almak için tek eksik hesap bilgisi. Uygulamada bandı görmemiş olabilir.
   */
  private async depozitoIadesi(): Promise<number> {
    const randevular = await this.prisma.booking.findMany({
      where: {
        status: { in: ['iptal_uzman', 'no_show_uzman', 'iptal_musteri'] },
        depositAmount: { gt: 0 },
        // Geç iptalde depozito YANAR — iade hakkı yoktur. Bu bayrağı
        // atlamak, olmayan bir parayı vaat etmek olurdu.
        depositForfeited: false,
        userId: { not: null },
      },
      select: { id: true, userId: true, depositAmount: true },
      take: 200,
    });
    if (randevular.length === 0) return 0;
    /*
     * `booking.refundRequestedAt` diye bir alan YOK: iade talebi ayrı bir
     * tabloda (`RefundRequest`). Talebi açılmış randevular buradan eleniyor.
     */
    const talepAcilmis = new Set(
      (
        await this.prisma.refundRequest.findMany({
          where: { bookingId: { in: randevular.map((r) => r.id) }, kind: 'musteri_iade' },
          select: { bookingId: true },
        })
      ).map((t) => t.bookingId),
    );
    let n = 0;
    for (const r of randevular) {
      if (!r.userId || talepAcilmis.has(r.id)) continue;
      const tutar = `${Number(r.depositAmount).toLocaleString('tr-TR')} ₸`;
      if (await this.mailer.gonder(r.userId, 'depozito_iadesi', { tutar })) n += 1;
    }
    return n;
  }

  /** 60 gündür hiç randevu almamış eski kullanıcılar. */
  private async geriKazanim(): Promise<number> {
    const adaylar = await this.prisma.user.findMany({
      where: {
        status: 'active',
        email: { not: null },
        role: 'user',
        createdAt: { lt: this.gunOnce(60) },
      },
      select: { id: true },
      take: 500,
    });
    if (adaylar.length === 0) return 0;
    const sonDonemdeHareketli = new Set(
      (
        await this.prisma.booking.findMany({
          where: { userId: { in: adaylar.map((u) => u.id) }, createdAt: { gt: this.gunOnce(60) } },
          select: { userId: true },
          distinct: ['userId'],
        })
      ).map((b) => b.userId),
    );
    let n = 0;
    for (const u of adaylar) {
      if (sonDonemdeHareketli.has(u.id)) continue;
      if (await this.mailer.gonder(u.id, 'geri_kazanim')) n += 1;
    }
    return n;
  }

  /** Tüm seriyi koşturur; her adım kendi hatasını yutar, koşu devam eder. */
  async calistir(): Promise<Record<string, number>> {
    const sonuc: Record<string, number> = {};
    const adimlar: [string, () => Promise<number>][] = [
      ['ilkRandevu', () => this.ilkRandevu()],
      ['randevuHatirlatma', () => this.randevuHatirlatma()],
      ['degerlendirme', () => this.degerlendirme()],
      ['depozitoIadesi', () => this.depozitoIadesi()],
      ['geriKazanim', () => this.geriKazanim()],
    ];
    for (const [ad, calis] of adimlar) {
      try {
        sonuc[ad] = await calis();
      } catch (hata) {
        // Bir adımın düşmesi ötekileri engellemesin: iade postası,
        // geri kazanım sorgusu patladı diye gitmemezlik edemez.
        sonuc[ad] = -1;
        this.logger.error(`[mail] ${ad} düştü: ${String(hata)}`);
      }
    }
    return sonuc;
  }
}
