import { grantCompletionRewards } from '../loyalty/completion-rewards';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { BookingsService } from './bookings.service';

/**
 * RANDEVU ZAMAN İŞLERİ — brief §4.2, §4.4, §4.5, §4.8, §4.9.
 *
 * Akışın kendiliğinden ilerleyen kısmı burada: süresi dolan talepler düşer,
 * randevu saati gelince hizmet gününe geçer, bekleme dönemi hatırlatmaları
 * gider, sessiz kalan beyanlar kabul edilir.
 *
 * Pencerelerin kaynağı istemci sayacı DEĞİL: telefonu kapalı kullanıcının
 * randevusu da aynı anda düşmeli. updateMany + koşullu where = IDEMPOTENT.
 * PII loglanmaz — yalnız sayılar.
 */

/** §4.5/§6 hatırlatma bit maskesi — `Booking.gunHatirlatmalari`. */
const H_IPTAL_ESIGI = 1;
const H_BIR_SAAT = 2;
const H_OTUZ_DK = 4;
const H_DEPOZITO_SON = 8;
/** §4.7 — ücretsiz iptal eşiği (3 saat) ve §4.2 talep düşme eşiği aynı sınır. */
const ESIK_MS = 3 * 60 * 60 * 1000;
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

  /**
   * Bir uzmanın (Professional) bildirim gidecek kullanıcı kimliği.
   * Önce salon sahibi, yoksa bağımsız uzmanın kendi hesabı.
   */
  private async uzmanKullanicisi(proId: string | null): Promise<string | null> {
    if (!proId) return null;
    const biz = await this.prisma.business.findFirst({
      where: { professionalId: proId },
      select: { ownerUserId: true },
    });
    if (biz?.ownerUserId) return biz.ownerUserId;
    const sp = await this.prisma.specialist.findFirst({
      where: { proId },
      select: { userId: true },
    });
    return sp?.userId ?? null;
  }

  async tick() {
    const now = new Date();

    // 0) Brief §4.2 — "1. ve 2. saatte uzmana hatırlatma push'u."
    //
    // Hatırlatma SAYACI şart: zamanlayıcı 5 dakikada bir dönüyor, sayaç olmadan
    // her turda tekrar gönderir ve uzmanı spam'lardı. Kaç hatırlatma gittiği
    // randevuda tutuluyor.
    //
    // Geçen süre, kalan süreden hesaplanıyor: `responseDeadline` sunucuda
    // damgalandığı için pencere uzunluğu (3 saat) oradan türetilebiliyor ve
    // ayarı değiştirmek hatırlatmaları da kendiliğinden kaydırıyor.
    const bekleyen = await this.prisma.booking.findMany({
      where: {
        status: 'onay_bekliyor',
        responseDeadline: { gt: now },
        responseReminders: { lt: 2 },
      },
      select: {
        id: true,
        proId: true,
        proName: true,
        responseDeadline: true,
        responseReminders: true,
      },
      take: 200,
    });
    let hatirlatildi = 0;
    for (const b of bekleyen) {
      if (!b.responseDeadline) continue;
      const kalanDk = (b.responseDeadline.getTime() - now.getTime()) / 60_000;
      // 3 saatlik pencerede: 1 saat geçince kalan 120 dk, 2 saat geçince 60 dk.
      const gerekenTur = kalanDk <= 60 ? 2 : kalanDk <= 120 ? 1 : 0;
      if (gerekenTur <= b.responseReminders) continue;
      const uid = await this.bookings.expertUserIdForBooking(b.id);
      if (uid) {
        void this.push
          .sendToUser(uid, {
            title: 'Bekleyen randevu talebin var',
            body: 'Yanıtlamazsan talep düşer ve slot açılır.',
            data: { route: `/booking/${b.id}` },
          })
          .catch(() => undefined);
      }
      await this.prisma.booking.update({
        where: { id: b.id },
        data: { responseReminders: gerekenTur },
      });
      hatirlatildi += 1;
    }

    // 1) Yanıt penceresi dolan talepler → expired (+ müşteriye bilgi push'u)
    const expiredRequests = await this.prisma.booking.findMany({
      where: { status: 'onay_bekliyor', responseDeadline: { lt: now } },
      select: { id: true, userId: true, proName: true },
      take: 200,
    });
    if (expiredRequests.length) {
      await this.prisma.booking.updateMany({
        where: { id: { in: expiredRequests.map((b) => b.id) } },
        // Brief §4.2: süre dolarsa OTOMATIK_DUSTU; slot açılır.
        data: { status: 'otomatik_dustu', cancelReason: 'Uzman yanıt vermedi' },
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
      where: { status: 'depozito_bekliyor', depositDeadline: { lt: now } },
      take: 200,
    });
    if (expiredDeposits.length) {
      await this.prisma.booking.updateMany({
        where: { id: { in: expiredDeposits.map((b) => b.id) } },
        // Brief §4.4: 10 dakika dolarsa OTOMATIK_DUSTU; slot açılır.
        data: { status: 'otomatik_dustu', cancelReason: 'Depozito süresi doldu' },
      });
      for (const b of expiredDeposits) {
        if (b.userId) {
          void this.push
            .sendTemplate(b.userId, 'booking.deposit_expired', undefined, {
              route: '/(tabs)/bookings',
            })
            .catch(() => undefined);
        }
      }
    }

    // 3) Brief §4.9.4 — "Uzman 24 saat içinde ne onay ne itiraz ederse otomatik
    //    onaylanmış sayılır." Müşteri parasını ödedi; uzmanın sessizliği
    //    randevuyu süresiz askıda bırakmamalı.
    const finalize = await this.prisma.booking.findMany({
      where: { status: 'odeme_bekliyor', finalizeDeadline: { lt: now } },
      select: { id: true, userId: true, price: true },
      take: 200,
    });
    if (finalize.length) {
      await this.prisma.booking.updateMany({
        where: { id: { in: finalize.map((b) => b.id) } },
        // Bu yol transition()'ı ATLIYOR (updateMany); tamamlanma anı burada
        // da yazılmalı, yoksa değerlendirme penceresi hiç başlamaz.
        data: { status: 'tamamlandi', completedAt: now },
      });
      // K3 — bu yolla kesinleşenlerin komisyonu da ŞİMDİ faturalanır. Müşteri
      // teyidi yoluyla zaten faturalanmışsa benzersiz `bookingId` ikinciyi
      // düşürür (çifte tahsilat imkânsız).
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

    // 4) Brief §4.8 — "24 saat içinde itiraz yoksa beyan kabul edilir ve
    //    depozito buna göre dağıtılır." İtiraz gelmişse durum zaten
    //    `uyusmazlik`e geçmiştir ve buraya düşmez.
    const forfeit = await this.prisma.booking.updateMany({
      where: {
        status: { in: ['no_show_musteri', 'no_show_uzman'] },
        finalizeDeadline: { lt: now },
        depositForfeited: false,
      },
      data: { depositForfeited: true, finalizeDeadline: null },
    });

    // 5) Brief §4.2 — "VEYA randevu saatine 3 saatten az kalırsa talep
    //    OTOMATIK_DUSTU olur." Uzmanın 3 saatlik cevap penceresi henüz
    //    dolmamış olabilir; randevu saatine 3 saatten az kaldıysa o pencere
    //    zaten anlamsızdır — müşteri son anda "belki gelir" diye bekletilmez.
    //
    //    Aynı sınır §4.4 ASKIDA KALMA KORUMASI için de geçerli: push'u hiç
    //    açmayan müşterinin 10 dakikası hiç başlamaz ve randevu sonsuza kadar
    //    slotu tutardı.
    const esikNoktasi = new Date(now.getTime() + ESIK_MS);
    const gecKalanlar = await this.prisma.booking.findMany({
      where: {
        status: { in: ['onay_bekliyor', 'depozito_bekliyor'] },
        startAt: { not: null, lt: esikNoktasi },
      },
      select: { id: true, userId: true, status: true },
      take: 200,
    });
    if (gecKalanlar.length) {
      await this.prisma.booking.updateMany({
        where: { id: { in: gecKalanlar.map((b) => b.id) } },
        data: { status: 'otomatik_dustu', cancelReason: 'Randevu saatine 3 saatten az kaldı' },
      });
      for (const b of gecKalanlar) {
        if (!b.userId) continue;
        void this.push
          .sendToUser(b.userId, {
            title: 'Randevu talebin düştü',
            body:
              b.status === 'onay_bekliyor'
                ? 'Uzman zamanında yanıt vermedi — başka bir saat seçebilirsin'
                : 'Depozito ödenmediği için randevu düştü — dilersen yeniden dene',
            data: { route: '/(tabs)/bookings' },
          })
          .catch(() => undefined);
      }
    }

    // 6) Brief §3 — randevu saati geldi: KESINLESTI → HIZMET_GUNU.
    //
    //    Bu geçiş olmadan uzmanın "İşlemi bitirdim" ve "Müşteri gelmedi"
    //    butonları HİÇ açılmıyordu: akış `kesinlesti`de takılıp kalıyordu.
    const hizmetGunu = await this.prisma.booking.updateMany({
      where: { status: 'kesinlesti', startAt: { not: null, lte: now } },
      data: { status: 'hizmet_gunu' },
    });

    // 7) Brief §4.5 — bekleme dönemi hatırlatmaları. Maske sayesinde her
    //    hatırlatma randevu başına EN FAZLA BİR kez gider.
    const yaklasan = await this.prisma.booking.findMany({
      where: {
        status: { in: ['kesinlesti', 'hizmet_gunu'] },
        startAt: { not: null, gt: now },
      },
      select: { id: true, userId: true, startAt: true, gunHatirlatmalari: true, proId: true },
      take: 200,
    });
    let gunHatirlatma = 0;
    for (const b of yaklasan) {
      if (!b.startAt) continue;
      const kalanMs = b.startAt.getTime() - now.getTime();
      let ekle = 0;
      let baslik = '';
      let govde = '';
      // Sıra ÖNEMLİ: en yakın eşik kazanır, yoksa 30 dk kala hem "1 saat" hem
      // "30 dk" push'u aynı turda giderdi.
      if (kalanMs <= 30 * 60_000 && !(b.gunHatirlatmalari & H_OTUZ_DK)) {
        ekle = H_OTUZ_DK;
        baslik = 'Randevuna 30 dakika kaldı';
        govde = 'Yola çıkma vakti';
      } else if (kalanMs <= 60 * 60_000 && !(b.gunHatirlatmalari & H_BIR_SAAT)) {
        ekle = H_BIR_SAAT;
        baslik = 'Randevuna 1 saat kaldı';
        govde = 'Hazırlanmaya başlayabilirsin';
      } else if (kalanMs <= ESIK_MS && !(b.gunHatirlatmalari & H_IPTAL_ESIGI)) {
        // §4.5.1 — ücretsiz iptal için SON ŞANS. Yalnız müşteriye: depozitoyu
        // kaybedecek olan taraf o.
        ekle = H_IPTAL_ESIGI;
        baslik = 'Depozitonu kaybetmeden iptal için son şans';
        govde = 'Bu saatten sonra iptal edersen depozito iade edilmez';
      }
      if (!ekle) continue;
      await this.prisma.booking.update({
        where: { id: b.id },
        data: { gunHatirlatmalari: { increment: ekle } },
      });
      gunHatirlatma += 1;
      const veri = { route: `/booking/${b.id}` };
      if (b.userId)
        void this.push
          .sendToUser(b.userId, { title: baslik, body: govde, data: veri })
          .catch(() => undefined);
      // §4.5 — 1 saat ve 30 dk hatırlatmaları İKİ TARAFA; iptal eşiği yalnız müşteriye.
      if (ekle !== H_IPTAL_ESIGI) {
        const uzmanId = await this.uzmanKullanicisi(b.proId);
        if (uzmanId)
          void this.push
            .sendToUser(uzmanId, { title: baslik, body: govde, data: veri })
            .catch(() => undefined);
      }
    }

    // 8) Brief §6 — depozito penceresi bitmeden SON UYARI ("4 dk kaldı").
    //    10 dakikalık pencere sessizce dolarsa müşteri randevusunu neden
    //    kaybettiğini anlamıyor.
    const sonUyari = await this.prisma.booking.findMany({
      where: {
        status: 'depozito_bekliyor',
        depositDeadline: { gt: now, lt: new Date(now.getTime() + 4 * 60_000) },
      },
      select: { id: true, userId: true, gunHatirlatmalari: true },
      take: 200,
    });
    for (const b of sonUyari) {
      if (b.gunHatirlatmalari & H_DEPOZITO_SON) continue;
      await this.prisma.booking.update({
        where: { id: b.id },
        data: { gunHatirlatmalari: { increment: H_DEPOZITO_SON } },
      });
      if (b.userId)
        void this.push
          .sendToUser(b.userId, {
            title: 'Depozito için son dakikalar',
            body: 'Randevun düşmeden önce dekontu yükle',
            data: { route: `/booking/${b.id}` },
          })
          .catch(() => undefined);
    }

    if (
      hatirlatildi ||
      expiredRequests.length ||
      expiredDeposits.length ||
      finalize.length ||
      forfeit.count ||
      gecKalanlar.length ||
      hizmetGunu.count ||
      gunHatirlatma
    ) {
      this.log.log(
        `süre aşımı: talep=${expiredRequests.length} kapora=${expiredDeposits.length} ` +
          `kesinleşen=${finalize.length} no-show-forfeit=${forfeit.count} ` +
          `eşik-düşen=${gecKalanlar.length} hizmet-günü=${hizmetGunu.count} hatırlatma=${gunHatirlatma}`,
      );
    }
  }
}
