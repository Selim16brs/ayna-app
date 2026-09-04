import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { altHizmetBul, depositFor, hasConflict, kategoriBul, ucDil } from '@ayna/domain';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { loadDepositRules } from '../bookings/deposit.rules';
import { holdDeadline, loadWindows } from '../bookings/booking-windows';
import { SLOT_HOLDING_STATUSES } from '../bookings/slot-statuses';
import type { CreateQuoteRequestInput, SelectQuoteInput, SubmitQuoteInput } from './quotes.dto';

// §5.2 Faz A — reverse marketplace ÇEKİRDEK akışı buluttan:
// talep aç → aynı şehirdeki uzmanlara push → uzman teklif verir → sahibine push →
// kullanıcı seçer → randevu (depozito_bekliyor) + kapanış pushları.
// Yanıt şekilleri mobil DemandRequest/DemandOffer ile birebir hizalı (ms sayıları).

type QuoteRow = {
  id: string;
  requestId: string | null;
  professionalId: string | null;
  userId: string | null;
  price: unknown;
  discountPercent: number;
  discountReason: string;
  etaMin: number;
  note: string | null;
  slotsJson: string;
  createdAt: Date;
  professional: {
    id: string;
    name: string;
    imageUrl: string;
    rating: unknown;
    reviewCount: number;
    /** Gerçek konum — mesafe bundan hesaplanıyor; yoksa mesafe YAZILMIYOR. */
    lat: number | null;
    lng: number | null;
  } | null;
};

function almatyLabel(ms: number): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Asia/Almaty',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  // §7.3 — güvenilir müşteri kümesi: ≥3 tamamlanan randevu + hiç no-show (tek toplu sorgu)
  private async trustedUserSet(userIds: string[]): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();
    const rows = await this.prisma.booking.findMany({
      where: { userId: { in: userIds }, status: { in: ['tamamlandi', 'no_show_musteri'] } },
      select: { userId: true, status: true },
    });
    const done = new Map<string, number>();
    const bad = new Set<string>();
    for (const b of rows) {
      if (!b.userId) continue;
      if (b.status === 'no_show_musteri') bad.add(b.userId);
      else done.set(b.userId, (done.get(b.userId) ?? 0) + 1);
    }
    return new Set(userIds.filter((u) => (done.get(u) ?? 0) >= 3 && !bad.has(u)));
  }

  private mapOffer(q: QuoteRow, expertNames: Map<string, string>) {
    const pro = q.professional;
    let slots: number[] = [];
    try {
      const parsed: unknown = JSON.parse(q.slotsJson);
      if (Array.isArray(parsed)) slots = parsed.filter((x): x is number => typeof x === 'number');
    } catch {
      slots = [];
    }
    return {
      id: q.id,
      proId: pro?.id ?? q.userId ?? q.id,
      // §müşteri→uzman profili: yalnız keşif kartı OLAN uzmanda gezinilebilir
      // (salon-bağlı uzmanın kendi kartı yok — null ise isim buton olmaz)
      profileId: pro?.id ?? null,
      proName: pro?.name ?? (q.userId ? (expertNames.get(q.userId) ?? 'Uzman') : 'Uzman'),
      proImage: pro?.imageUrl ?? '',
      rating: pro ? Number(pro.rating) : 0,
      reviewCount: pro?.reviewCount ?? 0,
      /*
       * MESAFE UYDURULMUYOR.
       *
       * Buradan `estKm(q.id)` dönüyordu: teklifin KİMLİK DİZESİNDEN
       * hesaplanan 1–9 km arası bir sayı. Müşteri kartta "3 km" okuyor,
       * "Yakınlık" sıralaması ve "Önerilen" skoru da bu sayıya bakıyordu —
       * yani sıralama kısmen rastgeleydi.
       *
       * Artık uzmanın GERÇEK koordinatı gidiyor; mesafeyi uygulama, keşif
       * ve arama ekranlarıyla AYNI kuralla hesaplıyor. Koordinat yoksa
       * mesafe yazılmıyor (uydurmaktansa boş bırakmak).
       */
      lat: pro?.lat ?? null,
      lng: pro?.lng ?? null,
      price: Number(q.price),
      // §A2 — ⚡Fırsat rozeti (indirim >0 ise müşteri kartında görünür)
      discountPercent: q.discountPercent,
      discountReason: q.discountReason,
      etaMin: q.etaMin,
      ...(q.note ? { note: q.note } : {}),
      slots,
      // Seçim → randevu bağlamak için (mobil bunu backend'e geri yollar)
      expertUserId: q.userId,
    };
  }

  private mapRequest(
    r: {
      id: string;
      mode: string;
      city: string;
      note: string | null;
      photoUrl: string | null;
      budget: unknown;
      collectMin: number;
      serviceId: string | null;
      /** Brief §4.5 — çoklu hizmet listesi. Eski satırlarda yok. */
      serviceIdsJson?: string;
      createdAt: Date;
      expiresAt: Date | null;
      status: string;
      bookingId: string | null;
      selectedQuoteId: string | null;
      category: { code: string };
    },
    quotes: QuoteRow[],
    expertNames: Map<string, string>,
  ) {
    const expiresMs = r.expiresAt?.getTime() ?? r.createdAt.getTime() + r.collectMin * 60_000;
    const status =
      r.status === 'closed' && r.bookingId
        ? 'booked'
        : expiresMs < Date.now() && r.status === 'open'
          ? 'expired'
          : r.status === 'closed'
            ? 'expired'
            : 'collecting';
    return {
      id: r.id,
      mode: r.mode as 'photo' | 'describe',
      category: r.category.code,
      city: r.city,
      ...(r.note ? { note: r.note } : {}),
      ...(r.photoUrl ? { photoUrl: r.photoUrl } : {}),
      ...(r.budget != null ? { budget: Number(r.budget) } : {}),
      collectMin: r.collectMin,
      ...(r.serviceId ? { serviceId: r.serviceId } : {}),
      /*
       * Brief §4.5 — talebin TÜM hizmetleri. Eski kayıtlarda liste yok;
       * o zaman tek `serviceId`den türetiliyor ki uzman ekranı boş
       * kalmasın.
       */
      serviceIds: ((): string[] => {
        try {
          const v: unknown = JSON.parse(r.serviceIdsJson ?? '[]');
          const liste = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
          return liste.length ? liste : r.serviceId ? [r.serviceId] : [];
        } catch {
          return r.serviceId ? [r.serviceId] : [];
        }
      })(),
      preferredSlots: ((): number[] => {
        try {
          const v: unknown = JSON.parse(
            (r as { preferredSlotsJson?: string }).preferredSlotsJson ?? '[]',
          );
          return Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : [];
        } catch {
          return [];
        }
      })(),
      createdAt: r.createdAt.getTime(),
      expiresAt: expiresMs,
      status,
      offers: quotes.map((q) => this.mapOffer(q, expertNames)),
      ...(r.selectedQuoteId ? { bookedOfferId: r.selectedQuoteId } : {}),
      ...(r.bookingId ? { bookingId: r.bookingId } : {}),
    };
  }

  private async expertNamesFor(quotes: QuoteRow[]): Promise<Map<string, string>> {
    const ids = [...new Set(quotes.map((q) => q.userId).filter((x): x is string => !!x))];
    if (ids.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    return new Map(users.map((u) => [u.id, u.name]));
  }

  // ── Talep aç (müşteri) ────────────────────────────────────────────────
  async create(userId: string, input: CreateQuoteRequestInput) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'NO_USER', message: 'Kullanıcı yok' });
    const category = await this.prisma.serviceCategory.findUnique({
      where: { code: input.category },
    });
    if (!category)
      throw new BadRequestException({ code: 'BAD_CATEGORY', message: 'Kategori bulunamadı' });

    /*
     * Brief §4.5 — çoklu hizmet. Gelin paketi isteyen müşteri üç ayrı
     * talep açmak zorundaydı: üç teklif turu, üç pazarlık, aynı gün için
     * birbirinden habersiz üç randevu.
     *
     * KATALOGDA OLMAYAN kimlik ATILIYOR: uzman ekranında karşılığı
     * olmayan bir satır görünürdü. `serviceId` listenin İLKİ olarak
     * saklanıyor — eski okuyanlar (uzman kartı, bildirim) bozulmuyor.
     */
    const hizmetler = [
      ...new Set([...(input.serviceIds ?? []), ...(input.serviceId ? [input.serviceId] : [])]),
    ].filter((id) => altHizmetBul(id));

    const now = Date.now();
    const row = await this.prisma.quoteRequest.create({
      data: {
        userId,
        categoryId: category.id,
        mode: input.mode,
        city: user.city ?? '',
        note: input.note ?? null,
        photoUrl: input.photoDataUrl ?? null,
        budget: input.budget ?? null,
        collectMin: input.collectMin,
        expiresAt: new Date(now + input.collectMin * 60_000),
        serviceId: hizmetler[0] ?? null,
        serviceIdsJson: JSON.stringify(hizmetler),
        preferredSlotsJson: JSON.stringify(input.preferredSlots ?? []),
      },
      include: { category: { select: { code: true } } },
    });

    // §5.2 — bildirim hedeflemesi: aynı şehirdeki uzman/salon hesaplarına push (fire-and-forget).
    void this.notifyNextWave(row.id).catch(() => undefined); // Faz 5 — ilk dalga (kademeli)

    return this.mapRequest({ ...row, selectedQuoteId: null }, [], new Map());
  }

  /** Kategori kodunu alıcının dilindeki ada çevirir; bilinmiyorsa genel sözcük. */
  private kategoriAdi(kod: string | undefined, dil: string | null | undefined): string {
    const k = kod ? kategoriBul(kod) : undefined;
    return k ? ucDil(k.ad, dil ?? 'tr') : 'hizmet';
  }

  // Faz 5 (§19) — KADEMELİ dalga: tek talep şehirdeki HERKESE aynı anda gönderilmez.
  // Dalga boyu Setting marketplace.wave_size (vars. 5); sıralama: kimliği doğrulanmış
  // (KYC) uzmanlar önce, sonra kıdem. Engellenen taraflar zaten liste dışı (openForExpert).
  // Eşleştirme kararı açıklanabilir: yalnız şehir + rol + KYC + kayıt sırası (hassas nitelik YOK).
  async notifyNextWave(requestId: string): Promise<number> {
    const row = await this.prisma.quoteRequest.findUnique({ where: { id: requestId } });
    if (!row || row.status !== 'open') return 0;
    const sizeSetting = await this.prisma.setting.findUnique({
      where: { key: 'marketplace.wave_size' },
    });
    const size = sizeSetting?.intValue ?? 5;
    const cat = await this.prisma.serviceCategory.findUnique({ where: { id: row.categoryId } });
    const experts = await this.prisma.user.findMany({
      where: {
        role: { in: ['professional', 'salon'] },
        status: 'active',
        ...(row.userId ? { id: { not: row.userId } } : {}),
        ...(row.city ? { city: row.city } : {}),
      },
      // `defaultLocale` bildirim metnini ALICININ dilinde kurmak için
      // (brief §4.11). Aynı sorguda geliyor; ek tur yok.
      select: { id: true, kycStatus: true, createdAt: true, defaultLocale: true },
    });
    const ordered = [...experts].sort((a, b) => {
      const ka = a.kycStatus === 'approved' ? 0 : 1;
      const kb = b.kycStatus === 'approved' ? 0 : 1;
      return ka - kb || a.createdAt.getTime() - b.createdAt.getTime();
    });
    const wave = ordered.slice(row.notifyWave * size, (row.notifyWave + 1) * size);
    if (wave.length === 0) return 0;
    await Promise.all(
      wave.map((e) =>
        this.push
          .sendTemplate(
            e.id,
            'quote.new_request',
            /*
             * BRIEF §4.11 — kategori adı ALICININ DİLİNDE, katalogdan.
             *
             * Buraya `cat.code` gidiyordu: uzmanın telefonunda "Yeni
             * lashes_brows talebi" yazıyordu. Kod bir kimliktir, kullanıcıya
             * gösterilecek bir metin değil — üstelik hiçbir dile çevrilmiyordu.
             *
             * Katalogda karşılığı yoksa şablonun kendi genel sözcüğüne
             * düşülüyor; uydurma bir ad yazmak yerine "hizmet" demek doğru.
             */
            { cat: this.kategoriAdi(cat?.code, e.defaultLocale) },
            {
              route: '/seller/requests',
              requestId,
            },
          )
          .catch(() => undefined),
      ),
    );
    await this.prisma.quoteRequest.update({
      where: { id: requestId },
      data: { notifyWave: row.notifyWave + 1, waveAt: new Date() },
    });
    return wave.length;
  }

  // Faz 5 — scheduler kancası: 30 dk'da yeterli teklif yoksa havuzu kademeli genişlet
  async expandStaleWaves(): Promise<number> {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const stale = await this.prisma.quoteRequest.findMany({
      where: {
        status: 'open',
        notifyWave: { gt: 0, lt: 4 }, // en fazla 4 dalga — sonrası çekme (pull) ile
        waveAt: { lt: cutoff },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true },
      take: 50,
    });
    let sent = 0;
    for (const r of stale) {
      const cnt = await this.prisma.quote.count({ where: { requestId: r.id } });
      if (cnt >= 3) {
        // yeterli teklif geldi — dalga durdurulur (waveAt güncellenir ki tekrar bakılmasın)
        await this.prisma.quoteRequest.update({
          where: { id: r.id },
          data: { notifyWave: 4 },
        });
        continue;
      }
      sent += await this.notifyNextWave(r.id);
    }
    return sent;
  }

  // ── Açık talepler (uzman/salon havuzu — §9.3 şehir filtresi) ──────────
  async openForExpert(expertUserId: string) {
    const me = await this.prisma.user.findUnique({ where: { id: expertUserId } });
    if (!me) throw new NotFoundException({ code: 'NO_USER', message: 'Kullanıcı yok' });
    // §B5 (ayna2) — uzmanın SESSİZCE engellediği müşterilerin talepleri havuza düşmez
    // (platform banından bağımsız kişisel tercih; UserBlock DM engeliyle ortak tablo)
    const blocked = await this.prisma.userBlock.findMany({
      where: { blockerId: expertUserId },
      select: { blockedId: true },
    });
    const blockedIds = blocked.map((b) => b.blockedId);
    const rows = await this.prisma.quoteRequest.findMany({
      where: {
        status: 'open',
        expiresAt: { gt: new Date() },
        userId: { not: expertUserId, ...(blockedIds.length ? { notIn: blockedIds } : {}) },
        // Şehri boş müşterinin talebi de görünür (yoksa talep kimseye düşmüyordu)
        ...(me.city ? { city: { in: [me.city, ''] } } : {}),
      },
      orderBy: { expiresAt: 'asc' },
      take: 100,
      include: {
        category: { select: { code: true } },
        quotes: {
          include: {
            professional: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                rating: true,
                reviewCount: true,
                lat: true,
                lng: true,
              },
            },
          },
        },
      },
    });
    const allQuotes = rows.flatMap((r) => r.quotes as unknown as QuoteRow[]);
    const names = await this.expertNamesFor(allQuotes);

    // §11 — PREMIUM MÜŞTERİNİN TALEBİ ÖNCE GÖRÜNÜR.
    //
    // Pasaport ekranı Premium avantajı olarak "öne çıkan görünürlük" vaat
    // ediyordu ama hiçbir yerde karşılığı yoktu — para alınan bir vaadin
    // uygulaması yoktu. Müşterinin uzmanlara göründüğü TEK yer talep havuzu;
    // öne çıkma burada anlamlı.
    //
    // Kimlik SIZDIRILMIYOR: yalnız `priority` bayrağı dönüyor, talep sahibinin
    // kimliği havuz görünümünde zaten yok (§gizlilik).
    const sahipler = [...new Set(rows.map((r) => r.userId).filter((x): x is string => !!x))];
    const premiumSahipler = new Set(
      sahipler.length
        ? (
            await this.prisma.user.findMany({
              where: {
                id: { in: sahipler },
                membershipTier: { in: ['premium', 'platinum'] },
                OR: [{ membershipUntil: null }, { membershipUntil: { gt: new Date() } }],
              },
              select: { id: true },
            })
          ).map((u) => u.id)
        : [],
    );

    // Uzman havuz görünümü: talep sahibi kimliği YOK (privacy); kendi teklifi işaretli.
    return (
      rows
        .map((r) => ({
          ...this.mapRequest(r, r.quotes as unknown as QuoteRow[], names),
          myQuoteId: r.quotes.find((q) => q.userId === expertUserId)?.id ?? null,
          priority: !!r.userId && premiumSahipler.has(r.userId),
        }))
        // Premium önce; eşitlikte SÜRESİ DOLMAYA EN YAKIN önce (sorgunun kendi
        // sıralaması korunuyor — aciliyet sırası Premium içinde de geçerli).
        .sort((a, b) => Number(b.priority) - Number(a.priority))
    );
  }

  // ── Taleplerim (müşteri) ──────────────────────────────────────────────
  async mine(userId: string) {
    const rows = await this.prisma.quoteRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        category: { select: { code: true } },
        quotes: {
          orderBy: { createdAt: 'asc' },
          include: {
            professional: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                rating: true,
                reviewCount: true,
                lat: true,
                lng: true,
              },
            },
          },
        },
      },
    });
    const allQuotes = rows.flatMap((r) => r.quotes as unknown as QuoteRow[]);
    const names = await this.expertNamesFor(allQuotes);
    // §7.3 — Güvenilir müşteri rozeti (yalnız POZİTİF sinyal): ≥3 tamamlanan + 0 no-show
    const ownerIds = [...new Set(rows.map((r) => r.userId).filter((x): x is string => !!x))];
    const trustedSet = await this.trustedUserSet(ownerIds);
    return rows.map((r) => ({
      ...this.mapRequest(r, r.quotes as unknown as QuoteRow[], names),
      trusted: !!r.userId && trustedSet.has(r.userId),
    }));
  }

  // ── Teklif ver (uzman/salon) ──────────────────────────────────────────
  async submit(requestId: string, expertUserId: string, input: SubmitQuoteInput) {
    const req = await this.prisma.quoteRequest.findUnique({
      where: { id: requestId },
      include: { category: { select: { code: true } } },
    });
    if (!req) throw new NotFoundException({ code: 'NO_REQUEST', message: 'Talep bulunamadı' });
    const expired = (req.expiresAt?.getTime() ?? 0) < Date.now();
    if (req.status !== 'open' || expired)
      throw new BadRequestException({ code: 'REQUEST_CLOSED', message: 'Talep kapandı' });
    if (req.userId === expertUserId)
      throw new BadRequestException({
        code: 'OWN_REQUEST',
        message: 'Kendi talebine teklif veremezsin',
      });

    // Uzmanın keşif kataloğu bağı (bağımsız uzmanda dolu) — profil/puan gösterimi için
    const specialist = await this.prisma.specialist.findUnique({
      where: { userId: expertUserId },
    });
    const proId = specialist?.proId ?? null;

    const quote = await this.prisma.quote.upsert({
      where: { requestId_userId: { requestId, userId: expertUserId } },
      create: {
        requestId,
        userId: expertUserId,
        professionalId: proId,
        price: input.price,
        discountPercent: input.discountPercent,
        discountReason: input.discountReason ?? '',
        etaMin: input.etaMin,
        note: input.note ?? null,
        slotsJson: JSON.stringify(input.slots),
      },
      update: {
        price: input.price,
        discountPercent: input.discountPercent,
        discountReason: input.discountReason ?? '',
        etaMin: input.etaMin,
        note: input.note ?? null,
        slotsJson: JSON.stringify(input.slots),
      },
    });

    // Talep sahibine push — doğrudan gelen teklifler sayfasına (deep-link kuralı)
    if (req.userId) {
      void this.push.sendToUser(req.userId, {
        title: 'Yeni teklifin var 💌',
        body: 'Talebine bir uzman teklif gönderdi. Teklifleri incele.',
        data: { route: `/quote/results?id=${requestId}` },
      });
    }
    return { id: quote.id, ok: true };
  }

  // ── Teklifi seç → randevu (müşteri) ───────────────────────────────────
  /**
   * TALEBİ KALDIR — sahibi kendi talebini siler.
   *
   * Böyle bir uç YOKTU: kullanıcı talep oluşturabiliyor, teklif alabiliyor ve
   * seçebiliyordu ama ölü bir talebi ASLA kaldıramıyordu. Süresi dolmuş,
   * 0 teklif almış talepler "Taleplerim" listesinde sonsuza kadar asılı
   * kalıyor ve hiçbir müdahale edilemiyordu.
   *
   * `booked` talep silinmez: o bir randevuya bağlı ve geçmiş kaydı — silmek
   * randevuyu sahipsiz bırakırdı. Kullanıcıya ne olduğu söyleniyor.
   */
  async remove(requestId: string, ownerId: string) {
    const req = await this.prisma.quoteRequest.findUnique({ where: { id: requestId } });
    if (!req || req.userId !== ownerId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Talep yok' });
    }
    // Randevuya DÖNÜŞMÜŞ talep silinmez: o bir geçmiş kaydı ve randevuya
    // bağlı — silmek randevuyu sahipsiz bırakırdı. Ölçüt `bookingId`;
    // `status` yalnız open/closed olduğu için tek başına yetmez (iptal
    // edilmiş talep de closed olabilir).
    if (req.bookingId) {
      throw new BadRequestException({
        code: 'BOOKED',
        message: 'Randevuya dönüşmüş talep silinemez',
      });
    }
    // Teklifler önce: yabancı anahtar kısıtı satırı bırakmasın.
    await this.prisma.quote.deleteMany({ where: { requestId } });
    await this.prisma.quoteRequest.delete({ where: { id: requestId } });
    return { ok: true };
  }

  async select(requestId: string, ownerId: string, input: SelectQuoteInput) {
    const req = await this.prisma.quoteRequest.findUnique({
      where: { id: requestId },
      include: {
        category: { select: { code: true } },
        quotes: {
          include: {
            professional: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                rating: true,
                reviewCount: true,
                lat: true,
                lng: true,
              },
            },
          },
        },
      },
    });
    if (!req) throw new NotFoundException({ code: 'NO_REQUEST', message: 'Talep bulunamadı' });
    if (req.userId !== ownerId)
      throw new ForbiddenException({ code: 'NOT_OWNER', message: 'Bu talep sana ait değil' });
    if (req.status !== 'open')
      throw new BadRequestException({ code: 'ALREADY_CLOSED', message: 'Talep zaten kapandı' });
    const quote = req.quotes.find((q) => q.id === input.quoteId);
    if (!quote) throw new NotFoundException({ code: 'NO_QUOTE', message: 'Teklif bulunamadı' });

    const names = await this.expertNamesFor([quote as unknown as QuoteRow]);
    const offer = this.mapOffer(quote as unknown as QuoteRow, names);

    // §4.3 — teklif zaten uzmanın kabulü → randevu doğrudan DEPOZİTO adımına doğar.
    // K1 — kapora oranlı; uzmanın onay yoluyla aynı hesap (`@ayna/domain`).
    const deposit = depositFor(Number(quote.price), await loadDepositRules(this.prisma));
    // Bu yol `depositDeadline` YAZMIYORDU. `depozito_bekliyor` slotu işgal ettiği için
    // ödemeyen müşterinin randevusu o saati süresiz kilitliyordu: scheduler'ın süre
    // dolum sorgusu `depositDeadline: { lt: now }` arıyor, NULL olan kayda hiç değmiyor.
    const holdUntil = holdDeadline(await loadWindows(this.prisma));
    const bookingId = `bk_q_${randomUUID().slice(0, 8)}`;
    const inDays = Math.max(0, Math.round((input.slotMs - Date.now()) / 86_400_000));
    const durationMin = quote.etaMin ?? 60;

    // A3 — ÇAKIŞMA KORUMASI. Bu yol (müşterinin teklif seçmesi) ters-pazaryerinin
    // ana müşteri yoluydu ve tek bir kontrolü yoktu: iki müşteri aynı uzmanın aynı
    // saatine teklif seçtiğinde ikisi de başarılı oluyor, ikisi de kapora göndermeye
    // yönlendiriliyordu. Diğer iki yolla aynı desen: advisory lock ile serileştir,
    // kilit altında oku, çakışmada 409.
    //
    // Talebin kapanışı da AYNI transaction'da: eskiden randevu ile talep iki ayrı
    // yazımdı; araya düşen bir hata talebi açık bırakıp randevuyu doğurabiliyordu.
    await this.prisma.$transaction(async (tx) => {
      if (offer.proId) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${offer.proId}))`;
        const others = await tx.booking.findMany({
          where: {
            proId: offer.proId,
            status: { in: SLOT_HOLDING_STATUSES },
            startAt: { not: null },
          },
          select: { startAt: true, durationMin: true },
        });
        const busy = others
          .filter((o) => o.startAt)
          .map((o) => ({
            startMs: o.startAt!.getTime(),
            endMs: o.startAt!.getTime() + (o.durationMin ?? 60) * 60_000,
          }));
        const candidate = { startMs: input.slotMs, endMs: input.slotMs + durationMin * 60_000 };
        if (hasConflict(candidate, busy)) {
          throw new ConflictException({
            code: 'SLOT_CONFLICT',
            message: 'Bu saat az önce doldu — başka bir saat seç',
          });
        }
      }
      await tx.booking.create({
        data: {
          id: bookingId,
          userId: ownerId,
          source: req.mode === 'photo' ? 'photo_quote' : 'demand',
          service: `${req.category.code} (teklif)`,
          proId: offer.proId,
          proName: offer.proName,
          proImage: offer.proImage,
          dateLabel: almatyLabel(input.slotMs),
          inDays,
          startAt: new Date(input.slotMs),
          durationMin,
          price: Number(quote.price),
          status: 'depozito_bekliyor',
          depositAmount: deposit,
          depositDeadline: holdUntil,
        },
      });
      await tx.quoteRequest.update({
        where: { id: requestId },
        data: { status: 'closed', bookingId, selectedQuoteId: quote.id },
      });
    });

    // Kazanan uzmana push — takvimine düştü
    if (quote.userId) {
      void this.push.sendToUser(quote.userId, {
        title: 'Teklifin seçildi 🎉',
        body: `${almatyLabel(input.slotMs)} için randevu oluştu. Takvimini kontrol et.`,
        data: { route: '/seller/agenda' },
      });
    }
    // §5.2 — seçilmeyen uzmanlara nazik kapanış
    for (const q of req.quotes) {
      if (q.id !== quote.id && q.userId) {
        void this.push.sendToUser(q.userId, {
          title: 'Talep kapandı',
          body: 'Bu talepte başka bir teklif seçildi — ilgin için teşekkürler 💛',
          data: { route: '/seller/requests' },
        });
      }
    }
    return { bookingId, ok: true };
  }
}
