import { uzmanGelmediOdulu } from '../loyalty/olay-odulleri';
import {
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Booking } from '@prisma/client';
import { createHash } from 'node:crypto';
import {
  randevuVerebilir,
  RANDEVU_KAPISI_KODU,
  canTransition,
  commissionFor,
  depositFor,
  esikGecti,
  hasConflict,
  isBookingState,
  beyanEdilenTutarGecerli,
  odenenTutar,
  paymentSplit,
  KAZANILMIS_DURUMLAR,
  YAKLASAN_DURUMLAR,
  type BookingState,
} from '@ayna/domain';
import {
  cashbackPoints,
  DEFAULT_CASHBACK_PCT,
  grantCompletionRewards,
} from '../loyalty/completion-rewards';
import { loadLedgerState, loadLoyaltyRules } from '../loyalty/loyalty.rules';
import { loadDepositRules } from './deposit.rules';
import { cevapSonu, holdDeadline, loadWindows } from './booking-windows';
import { SLOT_HOLDING_STATUSES } from './slot-statuses';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { StorageService } from '../storage/storage.service';
import { OffersService } from '../offers/offers.service';
import { slotAllowed } from '../offers/offers.rules';
import { canReschedule, cancelOutcome } from './bookings.policy';
import type { CreateBookingInput } from './bookings.dto';
import type { PushTemplateKey } from '../push/push.templates';

// §3 — iptali yapan taraf. `system` zamanlayıcı/iç çağrı demek.
export type ActorRole = 'customer' | 'provider' | 'admin' | 'system';

// Slot işgal eden durumlar artık ortak dosyada (üç kod yolu aynı listeyi kullanır).
const ACTIVE_SLOT_STATUSES = SLOT_HOLDING_STATUSES;

// Mobil istemci dateLabel/inDays göndermez — startMs'ten Almatı duvar saatiyle türetilir.
function deriveDateLabel(startMs?: number | null): string {
  if (!startMs) return '';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Asia/Almaty',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .formatToParts(new Date(startMs))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.day}/${parts.month} ${parts.hour}:${parts.minute}`;
}

function deriveInDays(startMs?: number | null): number {
  if (!startMs) return 0;
  return Math.max(0, Math.round((startMs - Date.now()) / 86_400_000));
}

// §4.7 — uzmanın aylık ücretsiz iptal hakkı ve görünmezlik cezası süresi.
const AYLIK_UCRETSIZ_IPTAL = 3;
const GORUNMEZLIK_MS = 7 * 24 * 60 * 60 * 1000;

/** §4.8 — "gelmedi" butonu randevu saatinden 15 dakika sonra açılır. */
const NO_SHOW_ACILMA_MS = 15 * 60 * 1000;
/** §4.8/§4.9 — beyana itiraz penceresi: 24 saat içinde ses çıkmazsa kabul. */
const ITIRAZ_PENCERESI_MS = 24 * 60 * 60 * 1000;
/** §4.7 — randevunun bir daha açılmayacağı durumlar; `cancelledAt` burada damgalanır. */
const KAPANIS_DURUMLARI: readonly string[] = [
  'iptal_musteri',
  'iptal_uzman',
  'otomatik_dustu',
  'no_show_musteri',
  'no_show_uzman',
];

@Injectable()
export class BookingsService {
  private readonly log = new Logger(BookingsService.name);

  /**
   * §5 — depozitoda puan kullanımı. Gerçekten düşülen puanı döner.
   *
   * Sınırları SUNUCU koyuyor: kilit (bakiye ≥ 5.000), biriken puanın %25'i ve
   * depozito tutarı. İstemcinin gönderdiği sayı hiçbir koşulda bu üçünü
   * aşamaz — aşabilseydi müşteri kendi indirimini yazardı.
   */
  private async puanDus(bookingId: string, istenen: number): Promise<number> {
    if (istenen <= 0) return 0;
    const b = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b?.userId) return 0;
    const tutar = Number(b.depositAmount ?? 0);
    if (tutar <= 0) return 0;
    const [durum, kullanici, kurallar] = await Promise.all([
      loadLedgerState(this.prisma, b.userId),
      this.prisma.user.findUnique({
        where: { id: b.userId },
        select: { pointsUnlockedAt: true },
      }),
      loadLoyaltyRules(this.prisma),
    ]);
    const split = paymentSplit(
      tutar,
      istenen,
      durum.available,
      kullanici?.pointsUnlockedAt ?? null,
      kurallar,
    );
    if (split.pointsUsed <= 0) return 0;
    // Harcama defterE yazılıyor: bakiye defterden türetiliyor, alan
    // güncellemesiyle değil (CLAUDE.md — finans ledger).
    await this.prisma.loyaltyEntry.create({
      data: {
        userId: b.userId,
        kind: 'spend',
        reason: 'rewards.spend.deposit',
        detail: bookingId,
        points: -split.pointsUsed,
      },
    });
    return split.pointsUsed;
  }

  /**
   * §4.10 — iade/ödeme hakkını kuyruğa yazar.
   *
   * `skipDuplicates`: aynı randevu+tür için ikinci kayıt açılamaz (benzersiz
   * kısıt) — çift ödeme yasak. Ama YALNIZ yineleme yutulmalı: burada eskiden
   * `.catch(() => undefined)` vardı ve gerçek bir veritabanı hatası da sessizce
   * yutuluyordu, yani müşterinin iade hakkı hiç doğmadan kaybolabiliyordu.
   * Artık gerçek hata log'a düşer ve YUKARI FIRLAR (PII yok — yalnız tutar/tür).
   */
  private async iadeHakkiYaz(
    bookingId: string,
    payeeUserId: string,
    kind: string,
    amount: number,
  ): Promise<void> {
    if (amount <= 0) return;
    try {
      await this.prisma.refundRequest.createMany({
        data: [{ bookingId, payeeUserId, kind, amount }],
        skipDuplicates: true,
      });
    } catch (e) {
      this.log.error(
        `iade hakkı YAZILAMADI: booking=${bookingId} tür=${kind} tutar=${amount} — ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      throw e;
    }
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly storage: StorageService,
    private readonly offers: OffersService,
  ) {}

  // Dekont akışı pushları: uzmanın hesabı Specialist.proId ↔ Booking.proId üzerinden bulunur
  /** Zamanlayıcı erişimi — §4.2 hatırlatmaları uzmana gidecek. */
  expertUserIdForBooking(bookingId: string): Promise<string | null> {
    return this.expertUserIdFor(bookingId);
  }

  private async expertUserIdFor(bookingId: string): Promise<string | null> {
    const b = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b?.proId) return null;
    const sp = await this.prisma.specialist.findFirst({ where: { proId: b.proId } });
    return sp?.userId ?? null;
  }

  // GİZLİLİK — filtresiz global liste kaldırıldı; kimliğe göre müşteri+sağlayıcı birleşimi.
  async listCombined(userId: string) {
    const [mine, provided] = await Promise.all([
      this.listForUser(userId),
      this.listForProvider(userId),
    ]);
    const byId = new Map<string, (typeof mine)[number]>();
    for (const b of [...mine, ...provided]) byId.set(b.id, b);
    return [...byId.values()];
  }

  // BEKLEME LİSTESİ KALDIRILDI (brief §4.2).
  //
  // Eski model: slot boşalınca bekleyenlere sırayla push, ilk alan kazanır.
  // Brief bunun tersini kuruyor — "talep gönderildiği an slot KİLİTLENİR
  // (otobüs/sinema bileti modeli). Aynı slotu ikinci bir müşteri talep edemez."
  // Yani aynı slotta bekleyen ikinci bir talep artık hiç oluşamıyor;
  // bildirilecek kimse yok.

  // §5.6 önkoşulu — kullanıcıya bağlı randevular (MÜŞTERİ olarak)
  async listForUser(userId: string) {
    const rows = await this.prisma.booking.findMany({
      where: { userId },
      orderBy: { inDays: 'asc' },
    });
    // MÜŞTERİ yolu: gizli sinyal gönderilmez (opts yok → kapalı).
    return rows.map((b) => mapBooking(b));
  }

  // §9.4 — SAĞLAYICI olarak gelen randevular: uzman (Specialist.proId) veya salon
  // (Business.professionalId) → booking.proId eşleşmesi. Gelen 'Randevu Al' talepleri buradan görünür.
  async listForProvider(userId: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    let proId = sp?.proId ?? null;
    if (!proId) {
      const biz = await this.prisma.business.findFirst({ where: { ownerUserId: userId } });
      proId = biz?.professionalId ?? null;
    }
    /*
     * §10.2 — SALON-BAĞLI uzman: kendi keşif kaydı (proId) yoktur; salonun
     * keşif kaydına gelip KENDİSİNE atanan randevuları görür. Salon sahibi
     * tüm kadroyu görürken bağlı uzman yalnız kendi randevusunu görür.
     *
     * ── EŞLEŞME ADLA DEĞİL KİMLİKLE ───────────────────────────────────
     *
     * Sorgu `uzmanName: me.name` idi: aynı salonda iki aynı adlı uzman
     * BİRBİRİNİN randevu listesini görüyordu — müşteri adı, saati,
     * hizmeti dahil. Ad kimlik değildir.
     *
     * Eski kayıtlarda `uzmanId` yok; onlar için ada DÜŞMÜYORUZ. Yanlış
     * kişiye başkasının randevusunu göstermektense hiç göstermemek doğru
     * (salon sahibi hepsini görüyor).
     */
    if (!proId && sp?.businessId) {
      const biz = await this.prisma.business.findUnique({ where: { id: sp.businessId } });
      const salonPro = biz?.professionalId ?? null;
      if (salonPro) {
        const rows = await this.prisma.booking.findMany({
          where: { proId: salonPro, uzmanId: sp.id },
          orderBy: { inDays: 'asc' },
        });
        // SAĞLAYICI yolu: kendi verdiği sinyali görür.
        return rows.map((b) => mapBooking(b, { forProvider: true }));
      }
    }
    if (!proId) return [];
    const rows = await this.prisma.booking.findMany({
      where: { proId },
      orderBy: { inDays: 'asc' },
    });
    // §7.3 — Güvenilir müşteri rozeti (yalnız POZİTİF): ≥3 tamamlanan + 0 no-show
    const uids = [...new Set(rows.map((b) => b.userId).filter((x): x is string => !!x))];
    const hist = uids.length
      ? await this.prisma.booking.findMany({
          where: { userId: { in: uids }, status: { in: ['tamamlandi', 'no_show_musteri'] } },
          select: { userId: true, status: true },
        })
      : [];
    const done = new Map<string, number>();
    const bad = new Set<string>();
    for (const h of hist) {
      if (!h.userId) continue;
      if (h.status === 'no_show_musteri') bad.add(h.userId);
      else done.set(h.userId, (done.get(h.userId) ?? 0) + 1);
    }
    /*
     * MÜŞTERİ ADLARI TEK SORGUDA. Randevu başına sorgu atmak (N+1) listeyi
     * uzman büyüdükçe yavaşlatırdı; kimlikler zaten elde.
     */
    const adlar = uids.length
      ? await this.prisma.user.findMany({
          where: { id: { in: uids } },
          select: { id: true, name: true },
        })
      : [];
    const adOf = new Map(adlar.map((u) => [u.id, u.name]));
    return rows.map((b) => ({
      ...mapBooking(b, {
        forProvider: true,
        customerName: b.userId ? (adOf.get(b.userId) ?? null) : null,
      }),
      customerTrusted: !!b.userId && (done.get(b.userId) ?? 0) >= 3 && !bad.has(b.userId),
    }));
  }

  // §5 — CRM özet istatistiği. GİZLİLİK: sağlayıcı yalnız KENDİ randevularını görür
  // (önceden global sayıyordu — her uzman platform toplamını görüyordu).
  async stats(userId?: string) {
    let where = {};
    if (userId) {
      const sp = await this.prisma.specialist.findUnique({ where: { userId } });
      let proId = sp?.proId ?? null;
      if (!proId) {
        const biz = await this.prisma.business.findFirst({ where: { ownerUserId: userId } });
        proId = biz?.professionalId ?? null;
      }
      where = proId ? { proId } : { userId };
    }
    const rows = await this.prisma.booking.findMany({ where });
    const base = computeBookingStats(
      // Ciro ve komisyon TABANI kasada ödenen tutardır: fiyat değiştiyse
      // uzmanın raporu da gerçekte tahsil ettiğini göstermeli, rezervasyon
      // anındaki tahmini değil.
      rows.map((b) => ({ status: b.status, price: odenenTutar(b), userId: b.userId })),
    );
    // §12.8 — ödenecek komisyon: online ciro × oran(%); oran admin parametresi (varsayılan %15)
    const s = await this.prisma.setting.findUnique({ where: { key: 'commission.rate' } });
    const commissionRate = s?.intValue ?? 10;
    const commission = commissionFor(base.commissionBase, commissionRate);
    return { ...base, commission, commissionRate };
  }

  async create(input: CreateBookingInput, userId?: string) {
    /*
     * ── DOĞRULANMAMIŞ MÜŞTERİ RANDEVU VEREMİYOR ───────────────────────
     *
     * Kurucu: "bir müşteri ya admin panelinden onaylanmalı ya da mutlaka
     * telefon ile doğrulama yapmalı. aksi takdirde uygulamada kesinlikle
     * randevu veremez."
     *
     * Doğrulanmamış numarayla açılan hesap randevu alabiliyordu: uzman
     * hazırlanıp bekliyor, gelen olmuyor ve ulaşılacak bir numara da yok.
     *
     * Kapı BURADA — uygulamadaki düğme de kapanıyor ama tek gerçek kapı
     * sunucu. Salon/uzmanın KENDİ eklediği çevrimdışı kayıt (`userId`
     * yok) bu kapıdan geçmiyor: orada müşteri hesabı zaten yok.
     */
    if (userId) {
      const kisi = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { phoneVerified: true, adminApproved: true, role: true },
      });
      if (kisi?.role === 'user' && !randevuVerebilir(kisi)) {
        throw new ForbiddenException({
          code: RANDEVU_KAPISI_KODU,
          message: 'Randevu için telefon doğrulaması gerekiyor',
        });
      }
    }
    // §keşif Modül 2 — kampanyadan randevu: sunucu doğrular (aktif + hedef uzman +
    // gün/saat penceresi + kota) ve fiyatı KAMPANYA fiyatına sabitler (client'a güvenilmez).
    let offerPrice: number | null = null;
    if (input.offerId) {
      const offer = await this.offers.findActive(input.offerId);
      if (!offer) {
        throw new BadRequestException({
          code: 'OFFER_UNAVAILABLE',
          message: 'Kampanya sona erdi ya da kotası doldu',
        });
      }
      if (input.proId && offer.proId !== input.proId) {
        throw new BadRequestException({
          code: 'OFFER_MISMATCH',
          message: 'Kampanya bu uzmana ait değil',
        });
      }
      if (input.startMs && !slotAllowed(offer, input.startMs)) {
        throw new BadRequestException({
          code: 'OFFER_SLOT_INVALID',
          message: 'Seçilen saat kampanyanın geçerli gün/saat penceresi dışında',
        });
      }
      offerPrice = Number(offer.finalPrice);
    }

    // §5.3 — zaman pencereleri admin ayarından; kod içine gömülü değil.
    const windows = await loadWindows(this.prisma);
    // id istemciden gelir → upsert ile idempotent (tekrar gönderim güvenli)
    // §4.1.1 — ÇOKLU HİZMET. Toplam süre ve tutar, uzmanın KAYITLI hizmet
    // listesinden sunucuda hesaplanıyor: istemciden gelen fiyata güvenmek,
    // müşterinin kendi depozitosunu belirlemesi demekti.
    const secilen = await this.secilenHizmetler(input.proId ?? null, input.serviceNames);
    const toplamFiyat = secilen.reduce((t, h) => t + h.price, 0);
    const toplamSure = secilen.reduce((t, h) => t + h.durationMin, 0);

    const data = {
      source: input.source,
      service: secilen.length ? secilen.map((h) => h.name).join(' + ') : input.service,
      ...(secilen.length ? { servicesJson: secilen } : {}),
      proId: input.proId ?? null,
      proName: input.proName,
      proImage: input.proImage,
      uzmanName: input.uzmanName ?? null,
      // Uzmanın KİMLİĞİ — ad değişebilir, kimlik değişmez.
      uzmanId: input.uzmanId ?? null,
      customerName: input.customerName ?? null,
      customerPhone: input.customerPhone ?? null,
      bySalon: input.bySalon ?? false,
      bookingKind: input.bookingKind ?? 'normal',
      groupSize: input.groupSize ?? null,
      dateLabel: input.dateLabel ?? deriveDateLabel(input.startMs),
      inDays: input.inDays ?? deriveInDays(input.startMs),
      startAt: input.startMs ? new Date(input.startMs) : null,
      durationMin: toplamSure || (input.durationMin ?? null),
      // Kampanya fiyatı > çoklu hizmet toplamı > istemcinin gönderdiği tutar.
      price: offerPrice ?? (toplamFiyat || input.price),
      // Brief §4.1–4.2: talep gönderilince ONAY_BEKLIYOR doğar ve slot kilitlenir.
      status: input.status ?? 'onay_bekliyor',
      ...(input.offerId ? { offerId: input.offerId } : {}),
      // §4.2 — uzmanın 3 saati SUNUCUDA damgalanır; mobil sayaç buna bakar.
      ...((input.status ?? 'onay_bekliyor') === 'onay_bekliyor'
        ? /*
           * Pencere randevu saatine göre ORANTILI: sabit 3 saat, aynı gün
           * randevularında anlamsızdı ve ayrı bir kural o talepleri anında
           * düşürüyordu. Saatsiz talepte (teklif toplama) tam pencere.
           */
          { responseDeadline: cevapSonu(windows, input.startMs ?? null) }
        : {}),
    };
    const existing = await this.prisma.booking.findUnique({ where: { id: input.id } });
    // Faz 4 (§15) — SALON, üye adına kayıt eklerken üyenin seçtiği yetki modu uygulanır:
    // view_availability_only → 403; create_requires_approval → uzman onayına ZORLA;
    // manage_calendar → doğrudan kesinleşebilir (fiyat/gelir görünürlüğü değişmez).
    /*
     * ── YETKİ MODU KİMLİKTEN OKUNUYOR ──────────────────────────────────
     *
     * Kadro üyesi ADLA bulunuyordu (`user.name === input.uzmanName`).
     * Aynı salonda iki aynı adlı uzman varsa YANLIŞ KİŞİNİN takvim izni
     * uygulanıyordu: takvimini salona kapatmış uzman adına, izin veren
     * adaşının ayarıyla kayıt açılabiliyordu.
     */
    if (!existing && input.uzmanId && input.bySalon && input.proId) {
      const biz = await this.prisma.business.findFirst({
        where: { professionalId: input.proId },
        select: { id: true },
      });
      let member: { calendarPermission: string } | null = null;
      if (biz) {
        member = await this.prisma.specialist.findFirst({
          where: { id: input.uzmanId, businessId: biz.id },
          select: { calendarPermission: true },
        });
      }
      /*
       * Üye BULUNAMAZSA en güvenli mod. Eskiden de varsayılan buydu ama
       * artık bilinçli: kimliği o salonda olmayan biri adına kayıt
       * açılıyorsa uzman onayı şart.
       */
      const mode = member?.calendarPermission ?? 'create_requires_approval';
      if (mode === 'view_availability_only') {
        throw new ForbiddenException({
          code: 'CALENDAR_FORBIDDEN',
          message: 'Uzman, salonun adına kayıt eklemesine izin vermiyor',
        });
      }
      if (mode === 'create_requires_approval' && data.status === 'kesinlesti') {
        data.status = 'onay_bekliyor';
        data.responseDeadline = cevapSonu(windows, input.startMs ?? null);
      }
      // manage_calendar → `kesinlesti` kalabilir; çakışma kontrolü yine çalışır.
      // OFFLINE kayıtta depozito akışı YOK: AYNA müşterisi yok, dolayısıyla
      // tahsil edilecek komisyon da yok. Kayıt yalnız takvimde yer tutar (§0).
    }
    // Faz 1/3 — OFFLINE-CONFIRMED kayıt: aynı uzmanın dolu slotuna yazılamaz.
    // Advisory lock ile serileşir; çakışmada 409 SLOT_CONFLICT (istemci kuyruğu conflict işler).
    const row = await this.prisma.$transaction(async (tx) => {
      if (
        !existing &&
        data.status === 'kesinlesti' &&
        input.proId &&
        input.startMs &&
        input.durationMin
      ) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.proId}))`;
        const candidate = {
          startMs: input.startMs,
          endMs: input.startMs + input.durationMin * 60_000,
        };
        const others = await tx.booking.findMany({
          where: {
            proId: input.proId,
            status: { in: ACTIVE_SLOT_STATUSES },
            startAt: { not: null },
          },
          select: { startAt: true, durationMin: true },
        });
        const busy = others
          .filter((o) => o.startAt && o.durationMin)
          .map((o) => ({
            startMs: o.startAt!.getTime(),
            endMs: o.startAt!.getTime() + (o.durationMin ?? 60) * 60_000,
          }));
        if (hasConflict(candidate, busy)) {
          throw new ConflictException({
            code: 'SLOT_CONFLICT',
            message: 'Bu saat başka bir randevuyla çakışıyor',
          });
        }
      }
      return tx.booking.upsert({
        where: { id: input.id },
        // userId yalnızca oluşturmada; sahibi sonradan değişmez (offline upsert'te bozulmaz)
        create: { id: input.id, ...data, ...(userId ? { userId } : {}) },
        update: data,
      });
    });
    // Kota yalnız İLK oluşturmada düşer (idempotent tekrar gönderim çift saymaz)
    if (input.offerId && !existing) await this.offers.incrementUsed(input.offerId);
    // MD_000 §4.1-1 — YENİ randevu talebi: sağlayıcıya uygulama kapalıyken de düşen
    // gerçek push (yalnız ilk oluşturmada; upsert tekrarında spam yok)
    if (!existing && row.status === 'onay_bekliyor' && row.proId) {
      void this.notifyNewRequest(row).catch(() => undefined);
    }
    /*
     * SALONUN AÇTIĞI KAYITTA ROL UZMAN.
     *
     * `create` çoğunlukla müşterinin talebi ama salon da çevrimdışı kayıt
     * açıyor (`bySalon`). O kayıt salona MÜŞTERİ görünümüyle dönüyordu:
     * kendi açtığı randevuda müşteri düğmelerini görüyordu.
     */
    return mapBooking(row, { forProvider: row.bySalon === true });
  }

  // Talebin muhatapları: bağımsız uzman (Specialist.proId) VE/VEYA salon sahibi
  // (Business.professionalId) + salonda belirli uzman seçildiyse o üye.
  /**
   * §4.1.1 — seçilen hizmet adlarını uzmanın KAYITLI listesiyle eşler.
   *
   * Eşleşmeyen ad sessizce atılır: uzmanın sunmadığı bir hizmet üzerinden
   * randevu doğması, hem fiyatı hem süreyi uydurmak olurdu. Hiçbiri
   * eşleşmezse boş döner ve çağıran eski tek-hizmet yoluna düşer.
   */
  private async secilenHizmetler(
    proId: string | null,
    adlar?: string[],
  ): Promise<{ name: string; price: number; durationMin: number }[]> {
    if (!proId || !adlar?.length) return [];
    const pro = await this.prisma.professional.findUnique({
      where: { id: proId },
      select: { servicesJson: true },
    });
    if (!pro?.servicesJson) return [];
    let kayitli: unknown;
    try {
      kayitli = JSON.parse(pro.servicesJson);
    } catch {
      return [];
    }
    if (!Array.isArray(kayitli)) return [];
    const bul = (ad: string) =>
      (kayitli as Record<string, unknown>[]).find(
        (x) => !!x && typeof x === 'object' && String(x.name ?? '') === ad,
      );
    const sonuc: { name: string; price: number; durationMin: number }[] = [];
    // Aynı hizmet iki kez seçilemez (liste tek seçimli kutucuklardan geliyor);
    // yine de yinelenen ad gelirse bir kez sayılır.
    for (const ad of [...new Set(adlar)]) {
      const h = bul(ad);
      if (!h) continue;
      sonuc.push({
        name: String(h.name ?? ad),
        price: Number(h.price ?? 0),
        durationMin: Number(h.durationMin ?? 60),
      });
    }
    return sonuc;
  }

  private async notifyNewRequest(b: Booking) {
    const targets = new Set<string>();
    const sp = await this.prisma.specialist.findFirst({ where: { proId: b.proId! } });
    if (sp) targets.add(sp.userId);
    const biz = await this.prisma.business.findFirst({
      where: { professionalId: b.proId! },
    });
    if (biz?.ownerUserId) targets.add(biz.ownerUserId);
    /*
     * Bildirim KİMLİĞE gidiyor. Adla bulunuyordu ve `findMany` olduğu
     * için aynı adlı HERKESE bildirim düşüyordu: adaşı, kendisine ait
     * olmayan bir randevunun bildirimini alıyordu.
     */
    if (biz && b.uzmanId) {
      const uye = await this.prisma.specialist.findFirst({
        where: { id: b.uzmanId, businessId: biz.id },
        select: { userId: true },
      });
      if (uye) targets.add(uye.userId);
    }
    for (const uid of targets) {
      void this.push
        .sendTemplate(
          uid,
          'booking.new_request',
          { hizmet: b.service, tarih: b.dateLabel },
          { route: '/seller/agenda' },
        )
        .catch(() => undefined);
    }
  }

  // §6.C/§4.4 — iptal. Kapora yakma/iade kararını SUNUCU verir (client'a güvenilmez):
  // geç iptal (<3sa, kapora ödenmiş) → kapora yanar; serbest iptal → uzman iade eder.
  async cancel(id: string, reason?: string, actorId?: string) {
    // §3 — iptali KİM yaptı: bu uç her iki tarafa da açık, o yüzden rol
    // assertParty'nin çözdüğü sonuçtan alınıyor.
    const rol = await this.assertParty(id, actorId, 'either');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    const outcome = cancelOutcome(b.status, b.startAt?.getTime() ?? null, Date.now());
    // §4.7 — UZMAN İPTALİ ayrı bir durum: müşteri iptali değil.
    const uzmanIptali = rol === 'provider';
    const row = await this.transition(
      id,
      {
        status: uzmanIptali ? 'iptal_uzman' : outcome.status,
        cancelReason: reason ?? null,
        cancelledBy: rol,
        ...(outcome.forfeit ? { depositForfeited: true } : {}),
      },
      rol,
    );
    // §keşif Modül 2 — kampanya randevusu iptal → kota iadesi
    if (b.offerId) void this.offers.refundQuota(b.offerId);

    if (uzmanIptali) {
      // §4.7 — uzman iptalinde depozito HER ZAMAN müşteriye iade edilir;
      // "3 saatten az kala" durumunda ayrıca no-show muamelesi görür.
      await this.uzmanIptalCezasi(b, Date.now());
    } else if (!outcome.forfeit && b.depositAmount) {
      // Müşteri eşikten ÖNCE iptal etti → iade hakkı doğdu. Talep §4.10
      // kuyruğundan yürüyecek; burada kayıt AÇILMIYOR çünkü müşteriden hesap
      // bilgisi alınması gerekiyor (ekran o bilgiyi topluyor).
    }
    // §A1 — slot boşaldı: aynı uzmanın bekleme listesindekilere haber ver
    /*
     * Sebep KULLANICININ yazdığı metin: çevrilemez, olduğu gibi taşınıyor.
     * Sebep yoksa şablonun kendi cümlesi kullanılıyor.
     */
    if (reason?.trim())
      this.notifyParties(id, 'booking.cancelled_reason', { sebep: reason.trim() });
    else this.notifyParties(id, 'booking.cancelled');
    return row;
  }

  /**
   * Brief §4.7 — UZMAN İPTALİ CEZALARI.
   *
   * | ne zaman            | sonuç                                           |
   * |---------------------|-------------------------------------------------|
   * | 3 saatten fazla var | depozito iade; AYDA 3 KEZ ücretsiz.             |
   * |                     | Aynı ay 4. iptal → 1 hafta görünmezlik          |
   * | 3 saatten az kala   | NO-SHOW ile aynı: iade + 1 hafta görünmezlik    |
   * |                     | (aylık 3 hakka SAYILMAZ)                        |
   *
   * Sayaç AY BAZLI ve hangi aya ait olduğu saklanıyor: ay değişince sıfırlanması
   * gerekiyor ama "her ay 1'inde toplu sıfırla" diye bir iş kurmak, o iş
   * çalışmadığında cezaları sessizce dondururdu. Ay etiketi karşılaştırılıyor.
   */
  private async uzmanIptalCezasi(
    b: {
      id: string;
      proId: string | null;
      userId: string | null;
      startAt: Date | null;
      depositAmount: unknown;
    },
    nowMs: number,
  ) {
    // Depozito HER İKİ durumda da müşteriye iade edilir.
    const tutar = Number(b.depositAmount ?? 0);
    if (b.userId && tutar > 0) {
      await this.iadeHakkiYaz(b.id, b.userId, 'musteri_iade', tutar);
    }
    if (!b.proId) return;
    const sp = await this.prisma.specialist.findFirst({ where: { proId: b.proId } });
    if (!sp) return;

    const gecIptal = b.startAt != null && esikGecti(b.startAt.getTime(), nowMs);
    const ay = new Date(nowMs).toISOString().slice(0, 7); // "2026-08"
    // Ay değiştiyse sayaç sıfırdan başlar.
    const sayac = sp.cancelCountMonth === ay ? sp.cancelCount : 0;

    // Geç iptal aylık hakka SAYILMAZ (§4.7) — doğrudan cezalı.
    const yeniSayac = gecIptal ? sayac : sayac + 1;
    const cezaGerek = gecIptal || yeniSayac > AYLIK_UCRETSIZ_IPTAL;

    const veri: Record<string, unknown> = { cancelCount: yeniSayac, cancelCountMonth: ay };
    if (cezaGerek) {
      // Zaten cezalıysa süre UZATILIR, sıfırlanmaz.
      const bas =
        sp.hiddenUntil && sp.hiddenUntil.getTime() > nowMs ? sp.hiddenUntil : new Date(nowMs);
      veri.hiddenUntil = new Date(bas.getTime() + GORUNMEZLIK_MS);
    }
    await this.prisma.specialist.update({ where: { id: sp.id }, data: veri });
  }

  // §6.C — uzman/işletme randevuyu "gelmedi" işaretler (CRM tarafı).
  // Kural: randevu saatinin üzerinden EN AZ 1 saat geçmeden işaretlenemez (erken damga önlenir).
  /**
   * §4.8 — MÜŞTERİ GELMEDİ (uzman işaretler).
   *
   * Pencere randevu saatinden 15 DAKİKA sonra açılır; öncesinde basılamaz.
   * Eskiden 1 saatti ve depozito "uzmanda kaldı" diye anında yakılıyordu.
   * Brief bunu tersine çevirdi: beyan TEK BAŞINA sonuç doğurmaz — karşı tarafa
   * bildirim gider, 24 saat içinde itiraz yoksa kabul edilir ve depozito
   * dağıtımı (%1 AYNA, %9 uzman) §4.10 kuyruğundan yürür.
   */
  async noShow(id: string, actorId?: string) {
    const rol = await this.assertParty(id, actorId, 'provider');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (b?.startAt && Date.now() < b.startAt.getTime() + NO_SHOW_ACILMA_MS) {
      throw new BadRequestException({
        code: 'NO_SHOW_TOO_EARLY',
        message: 'Gelmedi işareti randevu saatinden 15 dakika sonra açılır',
      });
    }
    const row = await this.transition(
      id,
      {
        status: 'no_show_musteri',
        finalizeDeadline: new Date(Date.now() + ITIRAZ_PENCERESI_MS),
      },
      rol,
    );
    // §keşif Modül 2 — kampanya randevusu no-show → kota iadesi
    if (b?.offerId) void this.offers.refundQuota(b.offerId);
    // §4.8 — beyan KARŞI TARAFA bildirilir; itiraz hakkı 24 saat.
    if (b?.userId)
      void this.push.sendTemplate(b.userId, 'booking.no_show_marked', undefined, {
        route: `/booking/${id}`,
      });
    return row;
  }

  // §4.1.7 — uzman hizmeti tamamladı → randevu 'completed' (değerlendirme daveti uçları buna dayanır)
  // §4.9 — uzman beyanı TEK TARAFLI kesinleşmez: ödeme el sıkışması + müşteri teyit
  // penceresi (policy.confirm_hours, varsayılan 24). Pencere sonunda itiraz yoksa
  // scheduler otomatik kesinleştirir; itiraz varsa finansal durum donar (disputed).
  /**
   * ADIM 1 — uzman "işlemi bitirdim" der.
   *
   * Randevu anında hizmet bedelinin YALNIZ %10'u alındı; kalan bakiye
   * hizmetten sonra ödenir. Bu düğme müşteride "ödemeyi yap" adımını açar.
   *
   * Eskiden burada doğrudan "tamamlandı bekliyor"a geçiliyordu, yani para
   * el değiştirmeden randevu "tamamlandı" sayılıyordu ve komisyon saati
   * uzman parayı almadan işlemeye başlıyordu.
   */
  async complete(id: string, actorId?: string) {
    const rol = await this.assertParty(id, actorId, 'provider');
    const cfg = await this.prisma.setting.findUnique({ where: { key: 'policy.confirm_hours' } });
    const hours = cfg?.intValue ?? 24;
    const row = await this.transition(
      id,
      {
        status: 'odeme_bekliyor',
        finalizeDeadline: new Date(Date.now() + hours * 60 * 60 * 1000),
      },
      rol,
    );
    void this.prisma.booking.findUnique({ where: { id } }).then((b) => {
      if (b?.userId)
        void this.push.sendTemplate(b.userId, 'booking.completed_confirm', undefined, {
          route: `/booking/${id}`,
        });
    });
    return row;
  }

  /** ADIM 2 — müşteri "ödemeyi yaptım" der; uzmanda "ödemeyi aldım" açılır. */
  /** Brief §4.9 adım 2 — müşteri "ÖDEME YAPTIM" der; uzmanda buton belirir. */
  /**
   * MÜŞTERİ "ÖDEMEYİ YAPTIM" der — ve para hesabı BU AN kurulur.
   *
   * Kurucu (05.09.2026): "müşteri salona gittiğinde hizmet saati başladığında
   * otomatik olarak müşteri ekranında ilgili randevuda Ödeme Yap butonu aktif
   * olmalı. şu anda yok ve randevu açık kalıyor ve tamamlanmıyor. Müşteri
   * ödeme yaptım butonuna bastığında ayna para kazanıyor. eğer bunu yapmazsa
   * kazanamaz."
   *
   * Üç şey değişti:
   *
   * 1. HİZMET GÜNÜNDE DE KABUL EDİLİYOR. Eskiden beyan yalnız uzman "işlemi
   *    bitirdim" dedikten sonra (`odeme_bekliyor`) mümkündü: uzman düğmeye
   *    basmazsa randevu sonsuza kadar açık kalıyor, müşteri ödediği hâlde
   *    hiçbir şey yapamıyordu. Artık hizmet saati başlar başlamaz müşteri
   *    kendi başına kapatabiliyor.
   * 2. TUTAR BEYAN EDİLEBİLİYOR. Kasada fiyat değiştiyse müşteri ödediğini
   *    girer; puan ve komisyon o tutardan doğar (`odenenTutar`).
   * 3. PUAN BU ANDA YAZILIYOR. "Basmazsa kazanamaz" kuralının karşılığı bu:
   *    ödül artık tamamlanma anına değil, MÜŞTERİNİN BEYANINA bağlı.
   *    (`grantCompletionCashback` beyanı olmayan randevuyu atlıyor.)
   */
  async balancePaid(id: string, actorId?: string, beyanEdilenTutar?: number) {
    const rol = await this.assertParty(id, actorId, 'owner');
    const mevcut = await this.prisma.booking.findUnique({ where: { id } });
    if (!mevcut) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    }
    // Hizmet başlamadan ödeme beyanı kabul edilmez: aksi hâlde randevu daha
    // yaşanmadan "para el değiştirdi" sayılır ve puan doğardı.
    const acikDurumlar = ['kesinlesti', 'hizmet_gunu', 'odeme_bekliyor'];
    if (!acikDurumlar.includes(mevcut.status)) {
      throw new BadRequestException({
        code: 'ODEME_BEYANI_KAPALI',
        message: `'${mevcut.status}' durumundaki randevuda ödeme beyan edilemez`,
      });
    }
    // `kesinlesti`: zamanlayıcı hizmet gününe henüz çevirmemiş olabilir (60 sn
    // tur, kapatılabilir bayrak). Saat geldiyse müşteriyi bekletmiyoruz —
    // beklettiği için randevu "açık kalıyordu".
    if (mevcut.status === 'kesinlesti') {
      const basladi = mevcut.startAt != null && mevcut.startAt.getTime() <= Date.now();
      if (!basladi) {
        throw new BadRequestException({
          code: 'ODEME_ERKEN',
          message: 'Ödeme beyanı hizmet saati başladığında açılır',
        });
      }
      await this.transition(id, { status: 'hizmet_gunu' }, rol);
    }

    // Tutar YALNIZ değiştiyse yazılır: aynı tutarı `finalPrice`e kopyalamak,
    // "fiyat değişti mi" sorusunu kayıttan okunamaz hâle getirirdi.
    const rezervasyonTutari = Number(mevcut.price);
    let yeniTutar: number | undefined;
    if (beyanEdilenTutar !== undefined) {
      if (!beyanEdilenTutarGecerli(beyanEdilenTutar)) {
        throw new BadRequestException({
          code: 'BAD_VALUE',
          message: 'Ödenen tutar geçerli bir para tutarı olmalı',
        });
      }
      if (beyanEdilenTutar !== rezervasyonTutari) yeniTutar = beyanEdilenTutar;
    }

    const cfg = await this.prisma.setting.findUnique({ where: { key: 'policy.confirm_hours' } });
    const hours = cfg?.intValue ?? 24;
    // Beyan iki şeyi birden yapıyor: durumu ödeme beklemeye taşıyor (uzmanın
    // "ödeme aldım" düğmesi buna bakıyor) ve itiraz penceresini başlatıyor.
    // Pencere olmasaydı uzman sessiz kaldığında randevu yine kapanmazdı.
    const veri: Record<string, unknown> = {
      balanceDeclaredAt: new Date(),
      ...(yeniTutar !== undefined ? { finalPrice: yeniTutar } : {}),
      ...(mevcut.status === 'odeme_bekliyor'
        ? {}
        : {
            status: 'odeme_bekliyor' as BookingState,
            finalizeDeadline: new Date(Date.now() + hours * 60 * 60 * 1000),
          }),
    };
    const row = await this.transition(id, veri, rol);

    // §12 — fiyat değişikliği KRİTİK bir para olayı: kim, hangi randevuda,
    // hangi tutarı beyan etti. Denetim kaydı olmadan komisyon itirazı
    // çözülemezdi.
    if (yeniTutar !== undefined)
      void this.prisma.auditLog
        .create({
          data: {
            action: 'booking.final_price',
            resourceType: 'booking',
            resourceId: id,
            actorId: actorId ?? null,
            actorRole: 'party',
            safeDiff: { price: rezervasyonTutari, finalPrice: yeniTutar },
          },
        })
        .catch(() => undefined);

    /*
     * PUAN BURADA YAZILMIYOR — İKİ TARAFIN ONAYI ŞART.
     *
     * Kurucu (05.09.2026): "her iki tarafın onayı adminde müşterinin ayna
     * parasını aktif hale getirir."
     *
     * Müşterinin beyanı ÖN KOŞUL — beyan yoksa hiç puan doğmuyor
     * (`grantCompletionCashback` beyansız randevuyu eliyor). Ama tek başına
     * yeterli değil: uzman parayı aldığını teyit edene kadar puan yazılmıyor.
     * Aksi hâlde ödemediği hâlde "ödedim" diyen müşteri, uzman itiraz etmeye
     * fırsat bulamadan puanı almış olurdu.
     *
     * Ödül iki yolda yazılıyor: uzmanın "ödemeyi aldım" teyidi
     * (`balanceReceived`) ve §4.9.4 — uzman 24 saat sessiz kalırsa onaylamış
     * sayılıyor, zamanlayıcı kesinleştiriyor.
     */

    void this.expertUserIdFor(id).then((uid) => {
      if (!uid) return;
      // Tutar değiştiyse uzman BUNU görmeli: onaylayacağı rakam artık
      // rezervasyondaki değil. Aynıysa eski, sade bildirim gidiyor.
      const [anahtar, params] =
        yeniTutar !== undefined
          ? (['booking.payment_declared_amount', { tutar: String(yeniTutar) }] as const)
          : (['booking.payment_declared', undefined] as const);
      void this.push
        .sendTemplate(uid, anahtar, params, { route: `/booking/${id}` })
        .catch(() => undefined);
    });
    return row;
  }

  /**
   * ADIM 3 — uzman "ödemeyi aldım" der. Randevu KAPANIR ve bu anda:
   *   · komisyon faturası doğar, 45 dakikalık ödeme süresi BAŞLAR,
   *   · müşterinin AYNA puanı aktifleşir.
   *
   * İkisi de bu ana bağlı: para gerçekten el değiştirmeden ne komisyon
   * istenebilir ne de puan verilebilir.
   */
  async balanceReceived(id: string, actorId?: string) {
    const rol = await this.assertParty(id, actorId, 'provider');
    const row = await this.transition(id, { status: 'tamamlandi' }, rol);
    void this.prisma.booking.findUnique({ where: { id } }).then(async (b) => {
      if (!b?.userId) return;
      // §4.9.3 — puan yüklemesi. Sessizce yutulmuyor: yutulursa müşteri
      // hak ettiği puanı hiç almaz ve kimse fark etmez. Zamanlayıcı yolu da
      // aynı fonksiyonu çağırıyor; çift yazım orada da engelli.
      const odul = await grantCompletionRewards(this.prisma, [b]).catch((e: unknown) => {
        this.log.error(
          `puan/ödül yazılamadı: booking=${id} — ${e instanceof Error ? e.message : String(e)}`,
        );
        return { cashback: 0, referrals: 0 };
      });
      // §6 — "Uzman 'Ödeme aldım' | Müşteri | X puan kazandınız — Değerlendir".
      // Kazanılan puanı YAZMAK şart: "teşekkürler" tek başına ödülün gerçekten
      // yüklendiğini göstermiyor ve puan sessizce birikmiş oluyordu.
      //
      // AMA YALNIZ GERÇEKTEN YAZILDIYSA. Puan artık müşterinin ödeme beyanına
      // bağlı (kurucu: "eğer bunu yapmazsa kazanamaz"); beyan yoksa hiçbir
      // puan doğmuyor ve "X puan kazandınız" bildirimi YALAN olurdu. Beyan
      // varsa puan zaten beyan ANINDA yazılmıştı; o zaman da aynı puanı ikinci
      // kez müjdelemek yerine randevunun kapandığını ve değerlendirme
      // davetini gönderiyoruz — müşteri hiçbir bildirim almadan kalmasın.
      if (odul.cashback === 0) {
        void this.push.sendTemplate(b.userId, 'booking.completed_rate', undefined, {
          route: `/review/new?id=${id}`,
        });
        return;
      }
      const kazanilan = cashbackPoints(odenenTutar(b), DEFAULT_CASHBACK_PCT);
      /*
       * Sayı `tr-TR` ile biçimlendiriliyordu; Rusça/Kazakça bildirimde de
       * Türkçe ayraç görünürdü. Ham sayı gidiyor, biçim şablonun dilinde
       * kalıyor (üç dilde de binlik ayracı boşluk ya da nokta değil, sade
       * sayı — puan değerleri dört haneyi geçmiyor).
       */
      void this.push.sendTemplate(
        b.userId,
        'loyalty.points_earned',
        { n: String(kazanilan) },
        { route: `/review/new?id=${id}` },
      );
    });
    return row;
  }

  /**
   * Aynı bildirimi randevunun İKİ TARAFINA da gönderir.
   *
   * §6'da "İkisi" yazan satırlar için: tek tarafa göndermek, karşı tarafın
   * durumu ancak uygulamayı açınca öğrenmesi demekti.
   */
  private async taraflaraBildir(
    bookingId: string,
    musteriId: string | null,
    key: PushTemplateKey,
    data: Record<string, string>,
  ): Promise<void> {
    // ANAHTAR taşınıyor, metin değil: iki taraf farklı dil kullanıyor
    // olabilir ve her biri kendi dilinde almalı.
    const uzmanId = await this.expertUserIdFor(bookingId).catch(() => null);
    for (const uid of [musteriId, uzmanId]) {
      if (uid) void this.push.sendTemplate(uid, key, undefined, data).catch(() => undefined);
    }
  }

  // K1 — DİNAMİK kapora: clamp(round100(fiyat × yüzde), min, max). Hesabın kendisi
  // `@ayna/domain` içinde saf fonksiyon; burada yalnız admin ayarları okunur.
  // İstemciden gelen hiçbir değere güvenilmez: fiyat sunucudaki kayıttan okunur.
  private async depositAmountFor(price: number): Promise<number> {
    return depositFor(Number(price), await loadDepositRules(this.prisma));
  }

  // §4.3 — uzman onaylar → ATOMİK slot lock (çift-rezervasyon önlenir) → depozito_bekliyor
  async approve(id: string, actorId?: string) {
    const rol = await this.assertParty(id, actorId, 'provider');
    // §5.3 — hold (dekont) penceresi admin ayarı; kod içine gömülü değil.
    const deadline = holdDeadline(await loadWindows(this.prisma));
    // Tek transaction içinde: çakışma kontrolü + durum güncelleme (atomik kilit)
    const row = await this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.findUnique({ where: { id } });
      if (!b)
        throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
      // Faz 1 — AYNI UZMANIN eşzamanlı onayları DB seviyesinde serileşir (advisory lock):
      // 20 paralel onaydan yalnız biri kazanır; kilit transaction bitince kendiliğinden düşer.
      if (b.proId) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${b.proId}))`;
      /**
       * §4.4 — DEPOZİTO HER ZAMAN ALINIR.
       *
       * Burada "kimliği doğrulanmamış uzman kapora alamaz" diye bir kapı
       * vardı (`policy.require_kyc_for_deposit`). Brief bu istisnayı kaldırdı
       * ve DURUM tarafında kaldırılmıştı da — ama TUTAR tarafında kalıntısı
       * duruyordu: KYC onaylı değilse randevu `depozito_bekliyor` durumuna
       * geçiyor, tutarı 0 ve süresi null yazılıyordu. Sonuç, müşterinin
       * "Ödenecek tutar 0 ₸" yazan, hiç ilerlemeyen bir depozito ekranıydı.
       * (Kurucu 01.09.2026'da tam bunu bildirdi.)
       *
       * Kapı zaten yanlış yerdeydi: depozito UZMANA değil AYNA'ya gidiyor
       * (§10 — depozito AYNA'nın komisyonu). Uzmanın kimlik durumu, AYNA'nın
       * kendi komisyonunu tahsil etmesini engellememeli. Kimliği
       * doğrulanmamış uzman gerekiyorsa RANDEVU ALAMAMALI — bu ayrı bir kapı.
       */
      const amount = await this.depositAmountFor(Number(b.price));
      // Kesin zaman varsa aynı uzmanda çakışan aktif randevu var mı?
      if (b.startAt && b.durationMin && b.proId) {
        const candidate = {
          startMs: b.startAt.getTime(),
          endMs: b.startAt.getTime() + b.durationMin * 60_000,
        };
        const others = await tx.booking.findMany({
          where: {
            proId: b.proId,
            id: { not: id },
            status: { in: ACTIVE_SLOT_STATUSES },
            startAt: { not: null },
          },
          select: { startAt: true, durationMin: true },
        });
        const busy = others
          .filter((o) => o.startAt && o.durationMin)
          .map((o) => ({
            startMs: o.startAt!.getTime(),
            endMs: o.startAt!.getTime() + (o.durationMin ?? 0) * 60_000,
          }));
        if (hasConflict(candidate, busy)) {
          throw new ConflictException({
            code: 'SLOT_TAKEN',
            message: 'Bu saat başka bir randevuyla dolu',
          });
        }
      }
      return tx.booking.update({
        where: { id },
        data: {
          // Brief §4.4 — DEPOZİTOSUZ ONAY YOLU YOK. Depozito AYNA'nın tek
          // tahsilatı (§10); atlanırsa randevu komisyonsuz doğar. Eski
          // "kapora izni yoksa doğrudan kesinleşir" istisnası kaldırıldı.
          status: 'depozito_bekliyor',
          proposedDateLabel: null,
          depositAmount: amount,
          depositDeadline: deadline,
          respondedAt: new Date(), // §9.2 — ortalama yanıt süresi metriği
        },
      });
    });
    // Rol ÇAĞIRANDAN: uzman onayladığında ona uzman görünümü dönmeli.
    return mapBooking(row, { forProvider: rol === 'provider' });
  }

  // §4.2 — kullanıcı kapora dekontunu yükler → uzman onayı bekler
  /**
   * §4.4 — DEPOZİTO DEKONTU + §5 PUAN KULLANIMI.
   *
   * Puan kullanımı buraya taşındı. Ekran bir süredir "puanlarımı kullan"
   * seçeneği sunuyordu ama hiçbir yer puanı DÜŞMÜYOR ve sunucuya haber
   * VERMİYORDU: müşteri daha az para gönderiyor, bakiyesi olduğu gibi
   * kalıyor, admin de eksik ödenmiş dekontu sahte sanıyordu.
   *
   * Ne kadar puan kullanıldığını SUNUCU belirliyor (§5: bakiye ≥ 5.000 ve
   * biriken puanın en çok %25'i). İstemciden gelen sayı yalnız bir ÜST sınır.
   */
  async submitDepositReceipt(id: string, receiptUriRaw: string, puanIstenen = 0, actorId?: string) {
    const rol = await this.assertParty(id, actorId, 'owner');
    // Faz 2 — AYNI DEKONT İKİ KEZ KULLANILAMAZ: içerik sha256'sı benzersiz saklanır
    const hash = createHash('sha256').update(receiptUriRaw).digest('hex');
    const reused = await this.prisma.booking.findFirst({
      where: { id: { not: id }, OR: [{ receiptHash: hash }, { refundReceiptHash: hash }] },
      select: { id: true },
    });
    if (reused) {
      throw new ConflictException({
        code: 'RECEIPT_REUSED',
        message: 'Bu dekont daha önce başka bir randevuda kullanılmış',
      });
    }
    const receiptUri = (await this.storage.put(receiptUriRaw, 'receipts')) ?? receiptUriRaw;
    const kullanilan = await this.puanDus(id, Math.max(0, Math.floor(puanIstenen)));
    const kayit = await this.prisma.booking.findUnique({
      where: { id },
      select: { userId: true },
    });
    // §4.4 — "Dekont yüklendiği an randevu KESINLESTI sayılır." Admin
    // doğrulaması SONRA gelir (§8 dekont kuyruğu) ve yalnız sahte dekontu
    // geri alır. Eskiden araya `deposit_submitted` + uzman onayı giriyordu:
    // müşteri parayı göndermiş olmasına rağmen randevusu kesin değildi.
    const res = await this.transition(
      id,
      {
        status: 'kesinlesti',
        depositReceiptUri: receiptUri,
        receiptHash: hash,
        ...(kullanilan > 0 ? { pointsUsed: kullanilan } : {}),
      },
      rol,
    );
    // §6 — "Depozito yüklendi | İKİSİ | Randevu kesinleşti ✓".
    //
    // Eskiden yalnız uzmana, üstelik "kontrol edip onayla" diyen bir şablonla
    // gidiyordu: onay adımı §4.4 ile kaldırıldığı hâlde metin kalmıştı ve
    // parayı gönderen MÜŞTERİ hiçbir bildirim almıyordu.
    void this.taraflaraBildir(id, kayit?.userId ?? null, 'booking.confirmed', {
      route: `/booking/${id}`,
    });
    return res;
  }

  /**
   * §4.8/§4.9 — itiraz → admin uzlaşma kaydı (`uyusmazlik`).
   *
   * İtiraz teyit penceresini KAPATIR: zamanlayıcı artık beyanı otomatik kabul
   * edemez. AYNA hakem değildir; kayıt yalnız iki tarafı bir araya getirir.
   */
  async dispute(id: string, actorId?: string) {
    const rol = await this.assertParty(id, actorId, 'either');
    return this.transition(id, { status: 'uyusmazlik', finalizeDeadline: null }, rol);
  }

  // §4.4-b — UZMAN gelmedi: iade akışı + 1.000 ₸ uzmanın komisyon borcuna (ceza faturası).
  // (Kullanıcıya 1000 puan telafisi mobil earn ile verilir; burada komisyon borcu doğar.)
  // §4.4 — bir Professional'ın sahip User'ı: önce salon (Business.ownerUserId),
  // yoksa bağımsız uzman (Specialist.proId → userId). Böylece bağımsız uzman da kısıtlanır.
  private async proOwnerUserId(proId: string): Promise<string | null> {
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

  /**
   * Brief §4.8 — UZMAN GELMEDİ / hizmet vermedi.
   *
   *   "depozito AYNA tarafından müşteriye iade edilir; uzmana 1 hafta
   *    görünmezlik cezası."
   *
   * ESKİ DAVRANIŞ KALDIRILDI: uzmana kapora kadar KOMİSYON BORCU yazılıyor ve
   * hesabı kısıtlı moda düşürülüyordu. Brief §4.4/§10 ikinci tahsilatı tümden
   * kaldırdı; ceza para değil GÖRÜNÜRLÜK. Hesabı kısıtlamak yerine yalnız yeni
   * iş almasını engellemek de bilinçli: mevcut randevuları mağdur olmamalı.
   */
  /**
   * Brief §4.10 — DEPOZİTO İADE TALEBİ.
   *
   *   "İade hakkı doğduğunda müşteri kartında 'Depozito iade et' butonu açılır.
   *    Butona basınca müşteriden iade yapılacak Kaspi/hesap bilgisi istenir.
   *    Talep, admin panelinde 'İadeler' kuyruğuna düşer."
   *
   * İade hakkı YALNIZ şu durumlarda doğar (§4.7/§4.8):
   *   · uzman iptal etti,
   *   · uzman gelmedi,
   *   · müşteri 3 saat eşiğinden ÖNCE iptal etti.
   * Eşikten sonraki müşteri iptalinde depozito yanar; buton hiç açılmaz.
   */
  async iadeTalep(id: string, payoutInfo: string, actorId?: string) {
    await this.assertParty(id, actorId, 'owner');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu yok' });
    if (!b.userId)
      throw new BadRequestException({
        code: 'NO_CUSTOMER',
        message: 'Bu randevunun müşterisi yok',
      });

    const hakVar =
      b.status === 'iptal_uzman' ||
      b.status === 'no_show_uzman' ||
      (b.status === 'iptal_musteri' && !b.depositForfeited);
    if (!hakVar)
      throw new BadRequestException({
        code: 'NO_REFUND_RIGHT',
        message: 'Bu randevuda iade hakkı doğmadı',
      });

    const tutar = Number(b.depositAmount ?? 0);
    if (tutar <= 0)
      throw new BadRequestException({ code: 'NO_DEPOSIT', message: 'İade edilecek depozito yok' });

    // Benzersiz (bookingId, kind) kısıtı ikinci talebi engelliyor: çift iade
    // ödemek, para akışındaki en pahalı hata olurdu.
    try {
      await this.prisma.refundRequest.create({
        data: {
          bookingId: id,
          payeeUserId: b.userId,
          kind: 'musteri_iade',
          amount: tutar,
          payoutInfo,
        },
      });
    } catch {
      throw new BadRequestException({
        code: 'ALREADY_REQUESTED',
        message: 'Bu randevu için iade talebi zaten açık',
      });
    }
    return { ok: true, amount: tutar };
  }

  async providerNoShow(id: string, actorId?: string) {
    await this.assertParty(id, actorId, 'owner');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    const now = new Date();
    const updated = await this.prisma.booking.update({
      where: { id },
      // §4.8 — beyan; karşı tarafın 24 saatlik itiraz penceresi açılır.
      data: {
        status: 'no_show_uzman',
        providerNoShow: true,
        cancelledBy: 'provider',
        finalizeDeadline: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    // Depozito müşteriye iade — §4.10 kuyruğuna düşer (tek ödeme yolu).
    if (b.userId) {
      const tutar = b.depositAmount != null ? Number(b.depositAmount) : 0;
      if (tutar > 0) {
        await this.iadeHakkiYaz(id, b.userId, 'musteri_iade', tutar);
      }
    }

    /*
     * TELAFİ PUANI BURADA — randevu GERÇEKTEN `no_show_uzman` olduktan sonra.
     *
     * Eskiden istemci bu puanı kendisi istiyordu ve sunucu olaya hiç
     * bakmıyordu: canlıda 1000 puan verilmişti ama o kullanıcının
     * `no_show_uzman` durumunda SIFIR randevusu vardı. 1000 puan = 1000 ₸.
     */
    await uzmanGelmediOdulu(this.prisma, id);

    // 1 HAFTA GÖRÜNMEZLİK. Zaten cezalıysa süre UZATILIR, sıfırlanmaz.
    if (b.proId) {
      const sp = await this.prisma.specialist.findFirst({ where: { proId: b.proId } });
      if (sp) {
        const bas = sp.hiddenUntil && sp.hiddenUntil > now ? sp.hiddenUntil : now;
        await this.prisma.specialist.update({
          where: { id: sp.id },
          data: { hiddenUntil: new Date(bas.getTime() + GORUNMEZLIK_MS) },
        });
      }
    }
    return mapBooking(updated);
  }

  /**
   * §7.8 — BİR KEZ ADİL ERTELEME.
   *
   * Kodda müşterinin elinde yalnız İPTAL vardı: saatini değiştirmek isteyen
   * müşteri iptal etmek zorunda kalıyor, geç iptal penceresindeyse kaporasını
   * yakıyordu — hâlbuki hizmetten vazgeçmemişti.
   *
   * Kapora AKTARILIR (yeni tutar hesaplanmaz; fiyat değişmiyor). Yeni slot
   * diğer üç yolla aynı desende yeniden tutulur: advisory lock + çakışma
   * kontrolü, üstüne veritabanı slot kısıtı.
   */
  /**
   * §4.6 — ERTELEME ÖNERİSİ.
   *
   *   "Ertele → aynı takvim seçici → yeni slot → karşı tarafa Kabul/Red talebi.
   *    Kabul: depozito aynen yeni tarihe taşınır, yeni ödeme yok.
   *    Red: eski randevu geçerli kalır."
   *
   * Bu metot eskiden randevunun saatini DOĞRUDAN değiştiriyordu: karşı tarafa
   * sorulmuyor, `erteleme_onerildi` durumu hiç yazılmıyordu. Yani uzman
   * takvimini müşteri tek başına kaydırabiliyordu — ve tersi.
   *
   * Öneriyi iki taraf da yapabilir (§4.6: "Uzman da erteleme önerebilir").
   */
  async reschedule(id: string, newStartMs: number, actorId?: string) {
    const rol = await this.assertParty(id, actorId, 'either');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });

    const [limitRow, windowRow] = await Promise.all([
      this.prisma.setting.findUnique({ where: { key: 'policy.free_reschedules' } }),
      this.prisma.setting.findUnique({ where: { key: 'rate.cancel_window_h' } }),
    ]);
    const karar = canReschedule({
      status: b.status,
      startAtMs: b.startAt?.getTime() ?? null,
      nowMs: Date.now(),
      used: b.rescheduleCount,
      limit: limitRow?.intValue ?? 1,
      windowMs: (windowRow?.intValue ?? 3) * 60 * 60 * 1000,
    });
    if (!karar.ok) {
      throw new BadRequestException({
        code: karar.code,
        message:
          karar.code === 'RESCHEDULE_LIMIT'
            ? 'Bu randevu için erteleme hakkın doldu'
            : karar.code === 'RESCHEDULE_TOO_LATE'
              ? 'Randevuya 3 saatten az kaldı — erteleme penceresi kapandı'
              : 'Bu randevu ertelenemez',
      });
    }
    if (!Number.isFinite(newStartMs) || newStartMs <= Date.now()) {
      throw new BadRequestException({ code: 'BAD_SLOT', message: 'Geçmiş bir saat seçilemez' });
    }
    // Dolu bir saati ÖNERMEK, karşı tarafı reddetmek zorunda bırakmak olurdu.
    await this.slotBosMu(b, newStartMs);

    const row = await this.transition(
      id,
      {
        status: 'erteleme_onerildi',
        proposedStartAt: new Date(newStartMs),
        proposedBy: rol,
      },
      rol,
    );
    // §6 — "Erteleme önerisi — Kabul / Red" karşı tarafa.
    const hedef = rol === 'customer' ? await this.expertUserIdFor(id) : (b.userId ?? null);
    if (hedef)
      void this.push
        .sendTemplate(
          hedef,
          'booking.reschedule_offer',
          { slot: deriveDateLabel(newStartMs) },
          { route: `/booking/${id}` },
        )
        .catch(() => undefined);
    return row;
  }

  /**
   * §4.6 — erteleme önerisini KABUL: depozito AYNEN taşınır, yeni ödeme yok.
   *
   * Kabul karşı tarafın: öneren kendi önerisini onaylayamaz, yoksa "öner ve
   * kabul et" tek taraflı saat değiştirmenin uzun yoluna dönerdi.
   */
  async ertelemeKabul(id: string, actorId?: string) {
    const rol = await this.assertParty(id, actorId, 'either');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b || !b.proposedStartAt)
      throw new BadRequestException({ code: 'NO_PROPOSAL', message: 'Bekleyen erteleme yok' });
    if (b.proposedBy === rol) {
      throw new ForbiddenException({
        code: 'OWN_PROPOSAL',
        message: 'Kendi erteleme önerini onaylayamazsın',
      });
    }
    const yeniMs = b.proposedStartAt.getTime();
    // Öneri ile kabul arasında slot kapanmış olabilir; kabul anında YENİDEN
    // bakılmazsa çift rezervasyon doğar.
    await this.slotBosMu(b, yeniMs);
    return this.transition(
      id,
      {
        status: 'kesinlesti',
        startAt: new Date(yeniMs),
        dateLabel: deriveDateLabel(yeniMs),
        inDays: deriveInDays(yeniMs),
        proposedStartAt: null,
        proposedBy: null,
        // Depozito AYNEN kalır — yeni randevuya taşınmış olur (§4.6).
        rescheduleCount: { increment: 1 },
      },
      rol,
    );
  }

  /** §4.6 — erteleme reddedildi: ESKİ randevu geçerli kalır. */
  async ertelemeRed(id: string, actorId?: string) {
    const rol = await this.assertParty(id, actorId, 'either');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b || !b.proposedStartAt)
      throw new BadRequestException({ code: 'NO_PROPOSAL', message: 'Bekleyen erteleme yok' });
    if (b.proposedBy === rol) {
      throw new ForbiddenException({
        code: 'OWN_PROPOSAL',
        message: 'Kendi erteleme önerini reddedemezsin',
      });
    }
    return this.transition(
      id,
      {
        status: 'kesinlesti',
        proposedStartAt: null,
        proposedBy: null,
      },
      rol,
    );
  }

  /**
   * Uzmanın takviminde bu saat boş mu? Doluysa ÇAKIŞMA fırlatır.
   *
   * Randevunun kendi eski saati çakışma sayılmaz — ertelerken kendisiyle
   * çarpışırdı.
   */
  private async slotBosMu(b: Booking, startMs: number): Promise<void> {
    if (!b.proId) return;
    const sure = b.durationMin ?? 60;
    const digerleri = await this.prisma.booking.findMany({
      where: {
        proId: b.proId,
        id: { not: b.id },
        status: { in: SLOT_HOLDING_STATUSES },
        startAt: { not: null },
      },
      select: { startAt: true, durationMin: true },
    });
    const dolu = digerleri
      .filter((o) => o.startAt)
      .map((o) => ({
        startMs: o.startAt!.getTime(),
        endMs: o.startAt!.getTime() + (o.durationMin ?? 60) * 60_000,
      }));
    if (hasConflict({ startMs, endMs: startMs + sure * 60_000 }, dolu)) {
      throw new ConflictException({
        code: 'SLOT_CONFLICT',
        message: 'Bu saat başka bir randevuyla çakışıyor',
      });
    }
  }

  /**
   * §4.3 — uzman DEĞİŞİKLİK ÖNERİR (tarih/saat).
   *
   * Karar müşteriye geçer: kabul ederse depozito adımına, karşı öneri yaparsa
   * `karsi_oneri` (tek tur) durumuna gider.
   */
  async propose(id: string, proposedStartMs: number, actorId?: string) {
    const rol = await this.assertParty(id, actorId, 'provider');
    const row = await this.transition(
      id,
      {
        status: 'degisiklik_onerildi',
        respondedAt: new Date(),
        proposedStartAt: new Date(proposedStartMs),
      },
      rol,
    );
    void this.prisma.booking.findUnique({ where: { id } }).then((b) => {
      if (b?.userId)
        void this.push.sendTemplate(b.userId, 'booking.expert_proposed', undefined, {
          route: `/booking/${id}`,
        });
    });
    return row;
  }

  // §1.6 — kullanıcı önerilen alternatifi kabul eder (başlangıç güncellenir, onaylanır)
  async setCustomerSignal(id: string, signal: 'up' | 'down', actorId?: string) {
    await this.assertParty(id, actorId, 'provider');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    const gecti = (b.startAt?.getTime() ?? Number.POSITIVE_INFINITY) < Date.now();
    if (!gecti) {
      throw new BadRequestException({
        code: 'SIGNAL_TOO_EARLY',
        message: 'Sinyal ancak hizmet saatinden sonra verilebilir',
      });
    }
    const row = await this.prisma.booking.update({
      where: { id },
      data: { providerSignal: signal },
    });
    await this.prisma.auditLog
      .create({
        data: {
          actorId: actorId ?? null,
          actorRole: 'provider',
          action: 'booking.customer_signal',
          resourceType: 'booking',
          resourceId: id,
          // Yalnız DEĞER: kimin kim hakkında ne düşündüğü kayda GİRMEZ.
          safeDiff: { signal },
        },
      })
      .catch(() => undefined);
    return mapBooking(row, { forProvider: true });
  }

  /**
   * §4.3 — müşteri, uzmanın önerdiği değişikliği KABUL eder.
   *
   * Kabul randevuyu kesinleştirmez: önerilen saat yerleşir ve akış §4.4
   * depozito penceresine geçer. Eskiden doğrudan `confirmed` yazılıyordu, yani
   * depozito hiç alınmadan randevu kesin sayılıyordu.
   */
  async accept(id: string, actorId?: string) {
    const rol = await this.assertParty(id, actorId, 'owner');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    const yeniBaslangic = b.proposedStartAt ?? b.startAt;
    return this.transition(
      id,
      {
        status: 'depozito_bekliyor',
        startAt: yeniBaslangic,
        proposedStartAt: null,
        depositAmount: await this.depositAmountFor(Number(b.price)),
        depositDeadline: holdDeadline(await loadWindows(this.prisma)),
        ...(yeniBaslangic ? { dateLabel: deriveDateLabel(yeniBaslangic.getTime()) } : {}),
      },
      rol,
    );
  }

  /**
   * §4.3 — müşteri KARŞI ÖNERİ yapar. TEK TUR: uzman yalnız Kabul/Red eder,
   * yeniden değişiklik öneremez (`karsi_oneri` durum makinesinde
   * `degisiklik_onerildi`ye dönemez — pazarlık ping-pongu bilinçli kapalı).
   */
  async counter(id: string, proposedStartMs: number, actorId?: string) {
    const rol = await this.assertParty(id, actorId, 'owner');
    const row = await this.transition(
      id,
      {
        status: 'karsi_oneri',
        startAt: new Date(proposedStartMs),
        dateLabel: deriveDateLabel(proposedStartMs),
        inDays: deriveInDays(proposedStartMs),
        proposedStartAt: null,
      },
      rol,
    );
    void this.expertUserIdFor(id).then((uid) => {
      if (uid)
        void this.push.sendTemplate(uid, 'booking.customer_proposed', undefined, {
          route: `/booking/${id}`,
        });
    });
    return row;
  }

  // §güvenlik — eylemi yapan, randevunun TARAFI olmalı (owner=müşteri, provider=uzman/salon).
  // actorId verilmediyse (iç çağrı) kontrol atlanır; admin rolü her eylemi yapabilir.
  // Yetkiyi doğrular VE aktörün rolünü döndürür. Rol zaten burada hesaplanıyor;
  // iptali kimin yaptığını kaydetmek için ikinci kez hesaplamak hem israf hem de
  // iki mantığın ayrışma riski olurdu.
  private async assertParty(
    bookingId: string,
    actorId: string | undefined,
    who: 'owner' | 'provider' | 'either',
  ): Promise<ActorRole> {
    this.lastActorId = actorId;
    if (!actorId) return 'system';
    const [b, actor] = await Promise.all([
      this.prisma.booking.findUnique({ where: { id: bookingId } }),
      this.prisma.user.findUnique({ where: { id: actorId } }),
    ]);
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    if (actor?.role === 'admin') return 'admin';
    const isOwner = !!b.userId && b.userId === actorId;
    let isProvider = false;
    if (b.proId) {
      const uid = await this.expertUserIdFor(bookingId);
      isProvider = uid === actorId;
      if (!isProvider) {
        const biz = await this.prisma.business.findFirst({ where: { professionalId: b.proId } });
        isProvider = biz?.ownerUserId === actorId;
      }
      /*
       * §10.2 — salona-bağlı uzman KENDİSİNE atanan salon randevusunu
       * yönetebilir.
       *
       * ── YETKİ ADLA VERİLİYORDU ────────────────────────────────────
       *
       * Koşul `actor?.name === b.uzmanName` idi: aynı salonda iki
       * "Madina" varsa biri diğerinin randevusunu iptal edebilir,
       * erteleyebilir, tamamlandı işaretleyebilirdi. Adını değiştiren
       * biri de aynı kapıyı açardı. Ad kimlik değildir; yetki kimliğe
       * bağlı.
       *
       * Eski randevularda `uzmanId` yok. O kayıtlar için ADA DÜŞMÜYORUZ:
       * yetkiyi yanlış kişiye vermektense vermemek doğru — salon sahibi
       * zaten yönetebiliyor.
       */
      if (!isProvider && b.uzmanId) {
        const sp = await this.prisma.specialist.findUnique({ where: { userId: actorId } });
        if (sp && sp.id === b.uzmanId && sp.businessId) {
          const myBiz = await this.prisma.business.findUnique({ where: { id: sp.businessId } });
          isProvider = myBiz?.professionalId === b.proId;
        }
      }
    }
    const ok = who === 'owner' ? isOwner : who === 'provider' ? isProvider : isOwner || isProvider;
    if (!ok)
      throw new ForbiddenException({
        code: 'NOT_BOOKING_PARTY',
        message: 'Bu randevu üzerinde işlem yetkin yok',
      });
    return isOwner ? 'customer' : 'provider';
  }

  /**
   * Durum geçişinin TEK kapısı.
   *
   * `status` bilerek `BookingState` olarak TİPLİ: burası eskiden
   * `Record<string, unknown>` idi ve `status: 'confirmed'` gibi ARTIK VAR
   * OLMAYAN bir durum adı derleyiciden sessizce geçip yalnız çalışma anında
   * "Bilinmeyen randevu durumu" hatası veriyordu. Tip, brief §3 sözlüğünün
   * dışına çıkan her satırı derleme anında yakalar.
   */
  /**
   * ROLÜ ÇAĞIRAN SÖYLÜYOR — ZORUNLU PARAMETRE.
   *
   * Dönen kayıt `benimRolum` taşıyor ve uygulama ekranı ona bakıyor. Burası
   * rolü BİLMİYORDU: her eylem ucu `mapBooking(row)` diye dönüyor, o da
   * varsayılan olarak 'musteri' damgalıyordu. Uzman "İşlemi bitirdim"e
   * basınca sunucu ona MÜŞTERİ görünümü geri veriyordu — kurucu bunu canlıda
   * gördü: uzman ekranında "Ödemeyi yaptım" düğmesi çıkıyordu.
   *
   * Parametre isteğe bağlı DEĞİL: yeni bir eylem ucu yazan kişi rolü
   * geçmeyi unutamasın diye derleyici zorluyor. Sınıf alanında tutmak
   * (`lastActorId` gibi) eşzamanlı iki isteğin birbirinin rolünü ezmesine
   * açıktı — `assertParty` ile `transition` arasında `await` var.
   */
  private async transition(
    id: string,
    data: Record<string, unknown> & { status?: BookingState },
    rol: ActorRole,
  ) {
    const existing = await this.prisma.booking.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    }
    // §4 — durum makinesi. Eskiden burada bir KARA LİSTE vardı: yalnız kapalı
    // durumlardan çıkış engelleniyordu, dolayısıyla `depozito_bekliyor → tamamlandi`
    // gibi kapora adımını tümden atlayan geçişler serbestti. Artık BEYAZ LİSTE
    // (`@ayna/domain`): izin verilmeyen her geçiş reddedilir.
    // Çift POST idempotent kabul edilir: aynı hedef → mevcut kayıt döner.
    const target = typeof data.status === 'string' ? data.status : null;
    if (target) {
      if (existing.status === target)
        return mapBooking(existing, { forProvider: rol === 'provider' }); // idempotent tekrar
      if (!isBookingState(target)) {
        throw new BadRequestException({
          code: 'INVALID_TRANSITION',
          message: `Bilinmeyen randevu durumu: ${target}`,
        });
      }
      if (!canTransition(existing.status, target)) {
        throw new BadRequestException({
          code: 'INVALID_TRANSITION',
          message: `Randevu '${existing.status}' durumundan '${target}' durumuna geçemez`,
        });
      }
    }
    // §4.9 — tamamlanma ANI tek yerde damgalanır; hiçbir yol atlayamaz.
    if (target === 'tamamlandi' && !existing.completedAt) data.completedAt = new Date();
    // §4.7 — kapanış anı. İade artık randevunun durumu DEĞİL, ayrı bir kayıt
    // (`RefundRequest`), o yüzden burada yalnız gerçek kapanışlar var.
    if (target && KAPANIS_DURUMLARI.includes(target) && !existing.cancelledAt) {
      data.cancelledAt = new Date();
    }
    const row = await this.prisma.booking.update({ where: { id }, data });
    // §12 — kritik eylem audit log'u (kim, ne zaman, hangi geçiş)
    if (target)
      void this.prisma.auditLog
        .create({
          data: {
            action: `booking.${target}`,
            resourceType: 'booking',
            resourceId: id,
            actorId: this.lastActorId ?? null,
            actorRole: this.lastActorId ? 'party' : 'system',
          },
        })
        .catch(() => undefined);
    return mapBooking(row, { forProvider: rol === 'provider' });
  }

  // assertParty'den geçen son aktör — transition audit'i için (istek başına tek akış)
  private lastActorId: string | undefined;

  // Durum geçişlerinde İKİ TARAFA push (sahip müşteri + uzman) — kapalıyken de haber gitsin
  private notifyParties(
    bookingId: string,
    key: PushTemplateKey,
    params?: Record<string, string>,
  ): void {
    /*
     * ANAHTAR alıyor, METİN değil: metni `sendTemplate` her tarafın KENDİ
     * dilinde çözüyor. Eskiden hazır Türkçe cümle geçiyordu ve müşteriyle
     * uzman farklı dil kullansa bile ikisi de Türkçe bildirim alıyordu.
     */
    void this.prisma.booking.findUnique({ where: { id: bookingId } }).then((b) => {
      if (!b) return;
      const data = { route: `/booking/${bookingId}` };
      if (b.userId) void this.push.sendTemplate(b.userId, key, params, data);
      void this.expertUserIdFor(bookingId).then((uid) => {
        if (uid && uid !== b.userId) void this.push.sendTemplate(uid, key, params, data);
      });
    });
  }
}

/**
 * Randevuyu istemci biçimine çevirir.
 *
 * `forProvider` — §7.3 gizli müşteri sinyali YALNIZ sağlayıcıya gönderilir.
 * Varsayılan KAPALI: bir alanı yanlışlıkla açık bırakmak, kadına "sorunlu"
 * etiketlendiğini göstermek demekti. Açmak bilinçli bir hareket olmalı.
 */
function mapBooking(b: Booking, opts?: { forProvider?: boolean; customerName?: string | null }) {
  return {
    // §7.3 — gizli sinyal; müşteri yolunda alan HİÇ bulunmaz (undefined).
    providerSignal: opts?.forProvider ? (b.providerSignal ?? undefined) : undefined,
    /*
     * ROLÜ SUNUCU SÖYLÜYOR.
     *
     * Uygulama rolü HANGİ UÇTAN geldiğine bakarak kendisi etiketliyordu;
     * etiket düşerse (yerel kayıt, eski sürüm, yarım eşitleme) randevu
     * "müşteri" sayılıyor ve uzman KENDİ ekranında müşteri ekranını
     * görüyordu: başlıkta kendi adı, altında "randevu gününü bekliyorsun".
     * Kurucu bunu canlıda gördü. Rol artık kaydın kendisiyle geliyor.
     */
    benimRolum: opts?.forProvider ? ('uzman' as const) : ('musteri' as const),
    id: b.id,
    source: b.source,
    service: b.service,
    proId: b.proId ?? '',
    proName: b.proName,
    proImage: b.proImage,
    uzmanName: b.uzmanName ?? undefined,
    // Kimlik de dönüyor: uygulama tarafı da adla eşleştirmeyi bıraksın.
    uzmanId: b.uzmanId ?? undefined,
    /*
     * MÜŞTERİNİN ADI SAĞLAYICIYA GİDİYOR.
     *
     * `customerName` yalnız salonun elle açtığı çevrimdışı kayıtta
     * doluydu; uygulamadan gelen randevuda NULL kalıyordu ve uzman
     * ekranında "Müşteri" diye genel bir etiket görünüyordu — kimin
     * geleceğini bilmiyordu. Ad hesaptan okunup burada dolduruluyor.
     *
     * YALNIZ SAĞLAYICI YOLUNDA: müşteri kendi randevusunda kendi adını
     * görmek zorunda değil ve alan boş yere taşınmasın.
     */
    customerName: b.customerName ?? opts?.customerName ?? undefined,
    bookingKind: b.bookingKind,
    groupSize: b.groupSize ?? undefined,
    dateLabel: b.dateLabel,
    proposedDateLabel: b.proposedDateLabel ?? undefined,
    inDays: b.inDays,
    startMs: b.startAt?.getTime() ?? undefined,
    proposedStartMs: b.proposedStartAt?.getTime() ?? undefined,
    // §4.6 — kart Kabul/Red düğmesini buna bakarak gösteriyor: öneren taraf
    // kendi önerisini yanıtlayamaz.
    proposedBy: (b.proposedBy as 'customer' | 'provider' | null) ?? undefined,
    durationMin: b.durationMin ?? undefined,
    price: Number(b.price),
    // Kasada ödendiği beyan edilen tutar — yalnız rezervasyon fiyatından
    // FARKLIYSA dolu. Ekran "ödenen tutar"ı bundan yazıyor.
    finalPrice: b.finalPrice != null ? Number(b.finalPrice) : undefined,
    status: b.status,
    cancelReason: b.cancelReason ?? undefined,
    // §3 — iptali kim yaptı. İstemci "sen iptal ettin" ile "uzman iptal etti"
    // ayrımını artık tahmin etmek yerine okuyor.
    cancelledBy: b.cancelledBy ?? undefined,
    cancelledAt: b.cancelledAt?.getTime() ?? undefined,
    // §4.1-4.4 — depozito/iade alanları (mobil Appointment alan adlarıyla hizalı)
    depositAmount: b.depositAmount ?? undefined,
    receiptUri: b.depositReceiptUri ?? undefined, // mobil `receiptUri` bekler (hydrate uyumu)
    refundReceiptUri: b.refundReceiptUri ?? undefined,
    // mobil Appointment.depositDeadline = UTC ms bekler (ISO string geri sayımı bozar)
    depositDeadline: b.depositDeadline?.getTime() ?? undefined,
    // §4.9 — müşterinin "ödeme yaptım" beyanı. Uzmanın butonu buna bakar.
    balanceDeclaredAt: b.balanceDeclaredAt?.getTime() ?? undefined,
    // §4.8 — itiraz penceresi / §4.9 otomatik onay anı. Ekran sayacı buna bakar.
    finalizeDeadline: b.finalizeDeadline?.getTime() ?? undefined,
    depositForfeited: b.depositForfeited,
    providerNoShow: b.providerNoShow,
    // §10 — salon offline alanları (hydrate'te kaybolmaz) + kampanya bağı + yanıt metrikleri
    customerPhone: b.customerPhone ?? undefined,
    bySalon: b.bySalon,
    offerId: b.offerId ?? undefined,
    responseDeadline: b.responseDeadline?.getTime() ?? undefined,
    respondedAt: b.respondedAt?.getTime() ?? undefined,
    reviewed: b.reviewed,
  };
}

// §5 — saf istatistik hesabı (DB'den bağımsız; test edilebilir)
export function computeBookingStats(
  rows: { status: string; price: number; userId?: string | null }[],
) {
  const count = (s: string) => rows.filter((b) => b.status === s).length;
  const completedRows = rows.filter((b) =>
    (KAZANILMIS_DURUMLAR as readonly string[]).includes(b.status),
  );
  const revenue = completedRows.reduce((sum, b) => sum + b.price, 0);
  // §gelir modeli — komisyon TABANI yalnız online (AYNA aracılı, userId dolu) randevular; offline hariç.
  const commissionBase = completedRows
    .filter((b) => b.userId != null)
    .reduce((sum, b) => sum + b.price, 0);
  // §4.8 — no-show iki taraflı: hangi taraf gelmediyse randevu gerçekleşmedi.
  const noShow = count('no_show_musteri') + count('no_show_uzman');
  const cancelled = count('iptal_musteri') + count('iptal_uzman') + count('otomatik_dustu');
  const upcoming = rows.filter((b) =>
    (YAKLASAN_DURUMLAR as readonly string[]).includes(b.status),
  ).length;
  const realized = completedRows.length + noShow; // tamamlanan + gelmeyen
  const noShowRate = realized ? Math.round((noShow / realized) * 100) : 0;
  return {
    total: rows.length,
    completed: completedRows.length,
    cancelled,
    noShow,
    noShowRate,
    upcoming,
    revenue,
    commissionBase,
    currency: 'KZT' as const,
  };
}
