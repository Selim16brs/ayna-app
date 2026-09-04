import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SLOT_HOLDING_STATUSES } from '../bookings/slot-statuses';
import type { Professional, Quote, ServiceCategory } from '@prisma/client';
import {
  computeDaySlots,
  aynaOnayli,
  guvenKatmanlari,
  hizmetSatirininKimligi,
  type PromosyonKarti,
  uzmanKayitli,
  VARSAYILAN_CALISMA_SAATI,
} from '@ayna/domain';
import { PrismaService } from '../prisma/prisma.service';
import { BasariService } from '../basari/basari.service';
import { CutoutService } from '../cutout/cutout.service';
import { StorageService } from '../storage/storage.service';
import { localizeRows } from '../common/i18n';
import type { CreateQuoteRequestInput } from './catalog.dto';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly cutout: CutoutService,
    // Başarı hesabı ORTAK: uzmanın paneli de aynı servisi çağırıyor.
    private readonly basari: BasariService,
  ) {}

  // §medya taşıma — R2 öncesi kayıtlarda base64 data-URL görseller JSON yanıtı MB'larca
  // şişiriyordu (2.9MB profil = mobilde donma). Okuma anında TEMBEL taşıma: data-URL
  // görülünce R2'ye yüklenir, kayda URL yazılır; sonraki okumalar küçük ve hızlıdır.
  private async migrateOwnerMedia(
    userId: string,
    avatarUrl: string | null,
    cutoutUrl: string | null,
  ): Promise<{ avatarUrl: string | null; cutoutUrl: string | null }> {
    const needsA = !!avatarUrl?.startsWith('data:');
    const needsC = !!cutoutUrl?.startsWith('data:');
    if (!needsA && !needsC) return { avatarUrl, cutoutUrl };
    const a = needsA ? await this.storage.put(avatarUrl, 'avatars') : avatarUrl;
    const c = needsC ? await this.storage.put(cutoutUrl, 'avatars') : cutoutUrl;
    // Yükleme başarılıysa (URL döndüyse) kalıcılaştır — başarısızsa data URL kalır (geri düşüş)
    if ((needsA && a !== avatarUrl) || (needsC && c !== cutoutUrl)) {
      await this.prisma.user
        .update({ where: { id: userId }, data: { avatarUrl: a, cutoutUrl: c } })
        .catch(() => undefined);
    }
    return { avatarUrl: a, cutoutUrl: c };
  }

  private async migrateList(
    values: string[],
    prefix: string,
    persist: (next: string[]) => Promise<unknown>,
  ): Promise<string[]> {
    if (!values.some((v) => v.startsWith('data:'))) return values;
    const next = await this.storage.putMany(values, prefix);
    if (next.some((v, i) => v !== values[i])) await persist(next).catch(() => undefined);
    return next;
  }

  async categories() {
    const rows = await this.prisma.serviceCategory.findMany({ orderBy: { sortOrder: 'asc' } });
    return rows.map((c: ServiceCategory) => ({
      id: c.code,
      label: c.nameTr,
      icon: c.icon,
      tone: c.tone,
    }));
  }

  // §12 — aktif kampanyalar (keşif vitrini)
  async campaigns(locale?: string) {
    const rows = await this.prisma.campaign.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    // §14.5 — kullanıcı diline çöz (title/subtitle), sonra DTO'ya map
    return localizeRows(rows, locale, ['title', 'subtitle']).map((c) => ({
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      badge: c.badge,
      category: c.category ?? undefined,
      image: c.image,
      tone: c.tone,
    }));
  }

  // Reklam banner'ları (keşif ekranı sponsorlu şerit)
  /**
   * Yayındaki reklamlar — ücretini ödeyen uzman/salonların vitrini.
   *
   * Yayın penceresi SUNUCUDA süzülüyor. İstemciye süzmeyi bırakmak, süresi
   * biten ücretli bir reklamı eski uygulama sürümlerinde yayında bırakırdı;
   * üstelik ödenmemiş reklamı cihazın saatine emanet etmek olurdu.
   * Tarih boşsa sınırsız sayılır (eski kayıtların davranışı).
   */
  async ads(locale?: string) {
    const simdi = new Date();
    const rows = await this.prisma.adBanner.findMany({
      where: {
        active: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: simdi } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: simdi } }] },
        ],
      },
      orderBy: { sortOrder: 'asc' },
    });
    return localizeRows(rows, locale, ['title', 'subtitle', 'description']).map((a) => ({
      id: a.id,
      proId: a.proId,
      title: a.title,
      subtitle: a.subtitle,
      // Reklamın neyi anlattığı — kart tıklanınca açılan sayfa gösteriyor.
      description: a.description,
      image: a.image,
      placement: a.placement,
    }));
  }

  /**
   * PROMOSYONLAR — uzmanın KENDİ açtığı kampanyalar.
   *
   * Kurucu: "uzman panelinden oluşturulan promosyonlar, fırsatlar
   * alanında gösterilmesin. fırsatlar ve senin için seçtiklerim parayla
   * sattığımız alan ama uzmanın açtığı promosyonlar o uzmana AYNA'nın
   * sağladığı bir reklam alanı… ayrı bir sekmede müşteriye promosyonlar
   * alanı gösterilmeli, en yakın lokasyondaki 4 promosyon ekranda görünüp
   * diğerleri için tümü butonu olmalı."
   *
   * Kaynak `Offer` tablosu — uzmanın "Kampanyalarım" ekranından açtığı
   * kayıtlar. Aynı liste "Fırsatlar" şeridinde de çiziliyordu; oradan
   * çıkarıldı çünkü o şerit ÖDENMİŞ yerleşim için.
   *
   * ── ONAY KAPISI BURADA DA GEÇERLİ ──────────────────────────────────
   *
   * Onaysız uzmanın promosyonu da görünmüyor: katalogdan gizlenen bir
   * hesap promosyon üzerinden vitrine sızmamalı.
   *
   * ── MESAFE UYDURULMUYOR ────────────────────────────────────────────
   *
   * Sağlayıcının koordinatı yoksa mesafe `null`; istemci o satırda
   * mesafe yazmıyor ve sıralamada sona koyuyor.
   */
  async promotions(lat?: number, lng?: number): Promise<PromosyonKarti[]> {
    const simdi = new Date();
    const teklifler = await this.prisma.offer.findMany({
      where: { status: 'active', startsAt: { lte: simdi }, endsAt: { gt: simdi } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    if (teklifler.length === 0) return [];

    const proIds = [...new Set(teklifler.map((o) => o.proId))];
    const prolar = await this.prisma.professional.findMany({
      where: { id: { in: proIds } },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        rating: true,
        reviewCount: true,
        city: true,
        lat: true,
        lng: true,
      },
    });
    const proById = new Map(prolar.map((p) => [p.id, p]));

    const gizli = new Set<string>();
    for (const x of await this.prisma.specialist.findMany({
      where: {
        proId: { in: proIds },
        OR: [{ status: { not: 'approved' } }, { hiddenUntil: { gt: simdi } }],
      },
      select: { proId: true },
    })) {
      if (x.proId) gizli.add(x.proId);
    }
    for (const b of await this.prisma.business.findMany({
      where: { professionalId: { in: proIds }, status: { not: 'approved' } },
      select: { professionalId: true },
    })) {
      if (b.professionalId) gizli.add(b.professionalId);
    }

    const out: PromosyonKarti[] = [];
    for (const o of teklifler) {
      if (gizli.has(o.proId)) continue;
      const p = proById.get(o.proId);
      if (!p) continue;
      out.push({
        id: o.id,
        proId: o.proId,
        proAd: p.name,
        proGorsel: p.imageUrl,
        /*
         * Değerlendirilmemiş uzman "0,0" DEĞİL: puanı sıfır göstermek
         * onu en kötü puanlı gibi sunardı.
         */
        puan: p.reviewCount > 0 ? Number(p.rating) : null,
        sehir: p.city || o.city,
        mesafeKm:
          lat != null && lng != null && p.lat != null && p.lng != null
            ? mesafeKm(lat, lng, p.lat, p.lng)
            : null,
        baslik: o.title,
        aciklama: o.description,
        indirimYuzde: o.discountType === 'percent' ? Number(o.discountValue) : null,
        gorsel: o.imageUrl || null,
        basEtiket: o.startsAt.toISOString(),
        sonEtiket: o.endsAt.toISOString(),
      });
    }
    return out;
  }

  async professionals() {
    // §4.7/§4.8 — GÖRÜNMEZLİK CEZASI BURADA UYGULANIYOR. Ceza `hiddenUntil`e
    // yazılıyordu ama hiçbir yerde okunmuyordu: bayrak vardı, KAPI yoktu.
    // Cezalı uzmanın proId'leri önce toplanıp listeden çıkarılıyor.
    const cezali = await this.prisma.specialist.findMany({
      where: { hiddenUntil: { gt: new Date() }, proId: { not: null } },
      select: { proId: true },
    });
    const gizli = new Set(cezali.flatMap((x) => (x.proId ? [x.proId] : [])));
    /*
     * ── ONAYSIZ UZMAN KATALOGDA YOK ────────────────────────────────────
     *
     * Kurucu: "uzman ve salonlar admin panelinde onay verilmeden
     * açılamaz."
     *
     * Kayıt olan uzman anında listede görünüyor ve randevu alabiliyordu:
     * müşteri hiç doğrulanmamış birine gidiyordu. Salonda bu kapı zaten
     * vardı (`Business.status`), uzmanda yoktu.
     */
    const onaysiz = await this.prisma.specialist.findMany({
      where: { status: { not: 'approved' }, proId: { not: null } },
      select: { proId: true },
    });
    for (const x of onaysiz) if (x.proId) gizli.add(x.proId);
    /*
     * Onaylanmamış SALONLAR da listede yoktu — ama salonun keşif kaydı
     * `professionalId` üzerinden bağlı ve `status` orada. Aynı kapıyı
     * salon için de kapatıyoruz: `pending` bir salon vitrine düşmesin.
     */
    const onaysizSalon = await this.prisma.business.findMany({
      where: { status: { not: 'approved' }, professionalId: { not: null } },
      select: { professionalId: true },
    });
    for (const b of onaysizSalon) if (b.professionalId) gizli.add(b.professionalId);

    const tumRows = await this.prisma.professional.findMany({ orderBy: { rating: 'desc' } });
    const rows = tumRows.filter((r) => !gizli.has(r.id));
    // §5.1.4-8 — liste eksik alanları: konum (harita), fiyat aralığı üstü, premium rozeti.
    // Sahip eşleşmesi iki toplu sorguyla (N+1 yok): Specialist.proId + Business.professionalId.
    const ids = rows.map((r) => r.id);
    /**
     * TAMAMLANAN RANDEVU SAYISI.
     *
     * Kurucu arama kırılımı olarak istedi ("gerçek randevu sayısını ekle").
     * Liste modelinde böyle bir alan yoktu; mobil taraf en yakın veri olan
     * `reviewCount`u kullanmak zorunda kalıyordu — ama her randevu
     * değerlendirmeye dönüşmüyor, ikisi aynı sayı değil.
     *
     * TAMAMLANMIŞ SAYILAN DURUMLAR: `tamamlandi` (uzman ödemeyi aldı),
     * `degerlendirme` (7 günlük pencere) ve `kapandi`. Üçünde de hizmet
     * gerçekten verilmiş durumda. Öncesindeki akış durumları (hizmet_gunu,
     * odeme_bekliyor) SAYILMIYOR: randevu henüz bitmemiş olabilir.
     * İptaller ve no-show'lar da doğal olarak dışarıda.
     *
     * TEK SORGU: `groupBy` ile hepsi bir turda geliyor, uzman başına sorgu
     * (N+1) yok. (proId, status) indeksi bunun için eklendi.
     */
    const TAMAMLANMIS = ['tamamlandi', 'degerlendirme', 'kapandi'] as const;
    const [sps, bizs, randevuSayilari, basarilar, puanlar, esikAyari] = await Promise.all([
      this.prisma.specialist.findMany({
        where: { proId: { in: ids } },
        select: {
          proId: true,
          userId: true,
          // §3.3 — rozet listede de görünsün diye. Bunlar YENİ SORGU DEĞİL:
          // zaten atılan toplu sorgunun select'i genişledi.
          certVerified: true,
          socialVerified: true,
          entityType: true,
          iin: true,
        },
      }),
      this.prisma.business.findMany({
        where: { professionalId: { in: ids } },
        select: {
          professionalId: true,
          ownerUserId: true,
          identityVerified: true,
          businessVerified: true,
          binVerified: true,
          socialVerified: true,
        },
      }),
      this.prisma.booking.groupBy({
        by: ['proId'],
        where: { proId: { in: ids }, status: { in: [...TAMAMLANMIS] } },
        _count: { _all: true },
      }),
      /*
       * BAŞARI YÜZDESİ — ORTAK SERVİSTEN.
       *
       * Kurucu: "müşteriye de göster."
       *
       * Hesabı burada tekrar yazsaydım (ilk sürümde öyleydi) uzmanın
       * panelindeki yüzdeyle çelişirdi: panel cevap süresini de ölçüyor.
       * İki farklı yüzde göstermektense tek kod yolu — ayrışacak bir şey
       * kalmıyor. Servis de toplu sorgu kullanıyor, N+1 açılmıyor.
       */
      this.basari.hesapla(ids),
      /**
       * PUAN VE DEĞERLENDİRME SAYISI — GERÇEK KAYITLARDAN.
       *
       * `Professional.rating` ve `reviewCount` sütunları hiçbir yerde
       * GÜNCELLENMİYORDU: değerlendirme verildiğinde `Rating` satırı
       * açılıyor ama uzman kaydına geri yazılmıyordu. Canlıda 12 gerçek
       * değerlendirme varken listede herkesin puanı 0 görünüyordu.
       *
       * Sonuç: aramada "4,5+" seçen kullanıcı HER ZAMAN boş liste alıyordu
       * ve "Puan"/"Popülerlik" sıralamaları hiçbir şey sıralamıyordu.
       *
       * Sütunlara yazmak yerine listede HESAPLIYORUZ: tek doğruluk kaynağı
       * `Rating` tablosu kalıyor, ikinci bir yerde bayatlama riski doğmuyor.
       *
       * Görünürlük kuralları `RatingsService.summary()` ile AYNI: yalnız
       * `visible` ve yayın anı gelmiş olanlar (§4.11 bir günlük gecikme).
       */
      this.prisma.rating.groupBy({
        by: ['subjectId'],
        where: {
          subjectId: { in: ids },
          visible: true,
          OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
        },
        _avg: { score: true },
        _count: { _all: true },
      }),
      this.prisma.setting.findUnique({ where: { key: 'rating.threshold' } }),
    ]);
    const randevuByPro = new Map(
      randevuSayilari.flatMap((x) => (x.proId ? [[x.proId, x._count._all] as const] : [])),
    );
    /*
     * AÇILMA EŞİĞİ — `summary()` ile aynı: eşiğin altındayken ORTALAMA
     * gizli. Sayı görünür kalıyor (özet ucu da öyle yapıyor): "2
     * değerlendirme var ama puan henüz açılmadı" dürüst bilgi.
     * Ayar yoksa 1 — lansman kararı, tek yorum bile profilde görünür.
     */
    const esik = esikAyari?.intValue ?? 1;
    const puanByPro = new Map(
      puanlar.map((x) => {
        const adet = x._count._all;
        const ortalama =
          adet >= esik && x._avg.score != null ? Math.round(x._avg.score * 10) / 10 : 0;
        return [x.subjectId, { ortalama, adet }] as const;
      }),
    );
    const ownerByPro = new Map<string, string>();
    for (const x of sps) if (x.proId) ownerByPro.set(x.proId, x.userId);
    for (const x of bizs) if (x.professionalId) ownerByPro.set(x.professionalId, x.ownerUserId);
    const spByPro = new Map(sps.filter((x) => x.proId).map((x) => [x.proId!, x]));
    const bizByPro = new Map(
      bizs.filter((x) => x.professionalId).map((x) => [x.professionalId!, x]),
    );
    const owners = [...new Set(ownerByPro.values())];
    const users = owners.length
      ? await this.prisma.user.findMany({
          where: { id: { in: owners } },
          select: {
            id: true,
            status: true,
            kycStatus: true,
            membershipTier: true,
            membershipUntil: true,
          },
        })
      : [];
    // Sahibi silinmiş/askıdaki hesaplar keşifte görünmez (hesap kapansa da katalog kaydı kalabiliyor).
    const hiddenOwners = new Set(
      users.filter((u) => u.status === 'deleted' || u.status === 'suspended').map((u) => u.id),
    );
    const now = Date.now();
    const kycById = new Map(users.map((u) => [u.id, u.kycStatus === 'approved']));
    // Kademe listede de lazım: kart Premium ile Platinum'u ayırt edemiyordu.
    const tierById = new Map<string, string>(
      users.map((u) => [
        u.id,
        (!u.membershipUntil || u.membershipUntil.getTime() > now) &&
        (u.membershipTier === 'premium' || u.membershipTier === 'platinum')
          ? u.membershipTier
          : 'free',
      ]),
    );
    const premiumUsers = new Set(
      users
        .filter(
          (u) =>
            (u.membershipTier === 'premium' || u.membershipTier === 'platinum') &&
            (!u.membershipUntil || u.membershipUntil.getTime() > now),
        )
        .map((u) => u.id),
    );
    return (
      rows
        .filter((r) => {
          const owner = ownerByPro.get(r.id);
          return !owner || !hiddenOwners.has(owner);
        })
        .map((r) => {
          const services = safeParseServices(r.servicesJson);
          const prices = services.map((x) => x.price).filter((p) => p > 0);
          const owner = ownerByPro.get(r.id);
          return {
            ...mapPro(r),
            lat: r.lat ?? undefined,
            lng: r.lng ?? undefined,
            // Alt sınır `mapPro` içinde aynı listeden — ikisi ayrışamaz.
            priceTo: prices.length ? Math.max(...prices) : Number(r.priceFrom),
            // Hiç randevusu olmayan uzman için groupBy satır döndürmez → 0.
            completedBookings: randevuByPro.get(r.id) ?? 0,
            // Sütun değil GERÇEK kayıtlar. `mapPro` sütunu koyuyor; burada
            // üzerine yazılıyor ki liste ile profil aynı sayıyı göstersin.
            rating: puanByPro.get(r.id)?.ortalama ?? 0,
            reviewCount: puanByPro.get(r.id)?.adet ?? 0,
            isPremium: owner ? premiumUsers.has(owner) : false,
            membershipTier: owner ? (tierById.get(owner) ?? 'free') : 'free',
            // §3.3 — GÜVEN ROZETİ listede de. Eskiden yalnız detay ucundaydı:
            // müşteri aramada/keşifte kimin doğrulandığını göremiyor, her
            // profili tek tek açmak zorunda kalıyordu. Kural detayla AYNI
            // fonksiyondan geliyor, ayrışamaz.
            aynaVerified: (() => {
              const sp = spByPro.get(r.id);
              const biz = bizByPro.get(r.id);
              const kayitli = uzmanKayitli(sp?.entityType, sp?.iin);
              const kyc = owner ? (kycById.get(owner) ?? false) : false;
              return aynaOnayli(
                r.kind,
                guvenKatmanlari({
                  kind: r.kind,
                  kycOnayli: kyc,
                  kayitli,
                  salon: biz,
                  uzman: sp,
                }),
                kayitli,
              );
            })(),
            /*
             * ── BAŞARI YÜZDESİ — MÜŞTERİYE DE GÖSTERİLİYOR ─────────────
             *
             * Kurucu: "ilk 3 görünmeli (başarı durumuna göre)" ve sonra
             * "müşteriye de göster."
             *
             * Değer uzmanın kendi panelindekiyle AYNI serviste
             * hesaplanıyor; iki farklı yüzde doğamıyor. İlk sürümde hesap
             * burada ayrıca yazılıydı ve cevap süresini ölçmüyordu — tam
             * bu yüzden müşteriye göstermemiştim.
             *
             * ÖLÇÜLEMEYENDE `null`: hiç randevusu olmayan uzmana "%0"
             * yazmak, hiç çalışmamış birine kötü çalıştığını söylemek
             * olurdu. Ekran o durumda rozeti hiç çizmiyor.
             */
            /*
             * PAYLAŞIM UZMANIN TERCİHİ.
             *
             * Kurucu: "uzman eğer istiyorsa seçenek koyalım. istemiyorsa
             * paylaşılmasın müşteri ile."
             *
             * Kapalıysa yüzde yükte HİÇ GİTMİYOR — istemcide gizlemek,
             * veriyi yine göndermek olurdu.
             *
             * SIRALAMA yine gerçek değere göre (aşağıda): yüzdeyi
             * paylaşmamak bir gizlilik tercihi, sıralamada geriye
             * düşme cezası değil.
             */
            basariYuzde: r.showSuccess ? (basarilar.get(r.id)?.yuzde ?? null) : null,
          };
        })
        /*
         * BAŞARIYA GÖRE SIRALI DÖNÜYOR. İstemci ilk üçü alıyor; sıralamayı
         * burada yapmak, aynı kuralın her ekranda tekrarlanmasını önlüyor.
         *
         * Ölçülemeyen (`-1`) sona düşüyor: yeni bir uzmanı "%0 başarılı"
         * sayıp en alta atmak yerine, bilinmeyeni bilinenlerin arkasına
         * koyuyoruz — sıralama aynı ama sebep dürüst.
         */
        /*
         * Sıralama GERÇEK başarıya göre — gösterilen değere değil.
         * Gösterilene göre sıralasaydık, yüzdesini paylaşmayan uzman
         * listenin en altına düşerdi: gizlilik tercihi cezaya dönüşürdü.
         */
        .sort((a, b) => (basarilar.get(b.id)?.yuzde ?? -1) - (basarilar.get(a.id)?.yuzde ?? -1))
    );
  }

  // §4.6 — GERÇEK slot üretimi (Faz 1): çalışma saati + izin günü + mevcut randevular +
  // hizmet süresi + lead tamponu → sunucu hesaplar (istemcideki sabit 10-20 ızgara yerine).
  // Adım ve tampon admin ayarı: slot.step_min (30), slot.lead_min (120).
  async professionalSlots(id: string, dayMs: number, durationMin: number) {
    const p = await this.prisma.professional.findUnique({ where: { id } });
    if (!p) {
      throw new NotFoundException({ code: 'PRO_NOT_FOUND', message: 'İşletme bulunamadı' });
    }
    // İzin/kapalı gün → hiç slot yok (kabul kriteri: izin gününde slot oluşmaz)
    const closed = safeParseNumbers(p.closedDaysJson);
    if (closed.includes(dayMs)) return { slots: [], closed: true };

    // Çalışma penceresi: DayHours[] {wd, open, from:'HH:MM', to:'HH:MM'}; boşsa 10:00–20:00
    const wd = almatyWeekday(dayMs);
    const hours = safeParseHours(p.hoursJson);
    const day = hours.find((h) => h.wd === wd);
    if (hours.length > 0 && day && !day.open) return { slots: [], closed: true };
    /*
     * Saatini GİRMEMİŞ sağlayıcıya varsayılan pencere uygulanıyor. Sayı
     * `@ayna/domain`den: uzman paneli "müşteriye şu aralık gösteriliyor"
     * uyarısını aynı kaynaktan yazıyor, ikisi ayrışamaz.
     */
    const from = day?.open ? day.from : VARSAYILAN_CALISMA_SAATI.from;
    const to = day?.open ? day.to : VARSAYILAN_CALISMA_SAATI.to;
    const openWindows = [{ startMs: hmToMs(dayMs, from), endMs: hmToMs(dayMs, to) }];

    const [stepSetting, leadSetting] = await Promise.all([
      this.prisma.setting.findUnique({ where: { key: 'slot.step_min' } }),
      this.prisma.setting.findUnique({ where: { key: 'slot.lead_min' } }),
    ]);
    const stepMs = (stepSetting?.intValue ?? 30) * 60_000;
    const minLeadMs = (leadSetting?.intValue ?? 120) * 60_000;

    const busy = await this.professionalBusy(id, dayMs - 86_400_000, dayMs + 2 * 86_400_000);
    const slots = computeDaySlots({
      openWindows,
      busy,
      serviceDurationMs: Math.max(15, durationMin) * 60_000,
      stepMs,
      nowMs: Date.now(),
      minLeadMs,
    });
    return { slots, closed: false };
  }

  // §4.2 — uzmanın dolu aralıkları: yalnız SLOT İŞGAL EDEN durumlar (onaylı/kapora aşaması).
  // Brief §4.2 — `onay_bekliyor` DAHİL: talep gönderildiği an slot kilitlenir.
  // GİZLİLİK: müşteri adı/telefonu/hizmeti dönmez — sadece zaman aralıkları.
  async professionalBusy(id: string, fromMs?: number, toMs?: number) {
    const from = new Date(fromMs ?? Date.now());
    const to = new Date(toMs ?? Date.now() + 14 * 86_400_000); // varsayılan: önümüzdeki 14 gün
    const rows = await this.prisma.booking.findMany({
      where: {
        proId: id,
        status: { in: SLOT_HOLDING_STATUSES },
        startAt: { gte: from, lte: to },
      },
      select: { startAt: true, durationMin: true },
      orderBy: { startAt: 'asc' },
      take: 500,
    });
    return rows
      .filter((r) => r.startAt)
      .map((r) => ({
        startMs: r.startAt!.getTime(),
        endMs: r.startAt!.getTime() + (r.durationMin ?? 60) * 60_000,
      }));
  }

  async professional(id: string) {
    const p = await this.prisma.professional.findUnique({ where: { id } });
    if (!p) {
      throw new NotFoundException({ code: 'PRO_NOT_FOUND', message: 'İşletme bulunamadı' });
    }
    // Sahibi silinmiş/askıdaki hesabın public profili açılmaz (liste filtresiyle tutarlı; derin link koruması)
    const ownerLink =
      (await this.prisma.specialist.findFirst({ where: { proId: id }, select: { userId: true } }))
        ?.userId ??
      (
        await this.prisma.business.findFirst({
          where: { professionalId: id },
          select: { ownerUserId: true },
        })
      )?.ownerUserId;
    if (ownerLink) {
      const ownerStatus = await this.prisma.user.findUnique({
        where: { id: ownerLink },
        select: { status: true },
      });
      if (ownerStatus && (ownerStatus.status === 'deleted' || ownerStatus.status === 'suspended')) {
        throw new NotFoundException({ code: 'PRO_NOT_FOUND', message: 'İşletme bulunamadı' });
      }
    }
    /*
     * ONAYSIZ PROFİL DERİN BAĞLANTIYLA DA AÇILMIYOR.
     *
     * Listeden gizlemek yetmiyor: profil adresi paylaşılabiliyor ve
     * onaysız bir uzman kendi bağlantısını dağıtıp randevu toplayabilirdi.
     */
    const spOnay = await this.prisma.specialist.findFirst({
      where: { proId: id },
      select: { status: true },
    });
    const bizOnay = await this.prisma.business.findFirst({
      where: { professionalId: id },
      select: { status: true },
    });
    if ((spOnay && spOnay.status !== 'approved') || (bizOnay && bizOnay.status !== 'approved')) {
      throw new NotFoundException({ code: 'PRO_NOT_FOUND', message: 'İşletme bulunamadı' });
    }
    // §9.5 — PUBLIC profil uzmanın KENDİ hizmet listesini gösterir.
    //
    // Liste boşken sektörün varsayılan menüsü UYDURULUYORDU: uzmanın hiç
    // seçmediği hizmetler, hiç koymadığı fiyatlarla listeleniyordu. Müşteri
    // bunlardan birini seçip randevu alabiliyordu — uzman o hizmeti vermiyor
    // olsa bile. Ayrıca "her uzman her alanda çıkıyor" şikâyetinin bir
    // parçası da buydu.
    //
    // Şablon yalnız SAHİPSİZ (demo/tohum) kayıtlarda kalır; gerçek bir hesaba
    // bağlı uzmanda liste boşsa boş kalır ve ekran "henüz hizmet eklenmemiş"
    // der. Uydurma fiyat, uydurma vaattir.
    const own = safeParseServices(p.servicesJson);
    const gercekHesap = ownerLink != null;
    const services = own.length
      ? own
      : gercekHesap
        ? []
        : decorateServices(SECTOR_SERVICES[p.sector] ?? SECTOR_SERVICES.hair!, p.id);
    // Sıfır-demo: kadro GERÇEK — bu salona bağlı kayıtlı uzmanlar (yoksa boş; sahte isim/yüz YOK)
    const staff =
      p.kind === 'salon'
        ? await (async () => {
            const biz = await this.prisma.business.findFirst({ where: { professionalId: p.id } });
            if (!biz) return [];
            const members = await this.prisma.specialist.findMany({
              where: { businessId: biz.id },
              take: 12,
            });
            const users = await this.prisma.user.findMany({
              where: { id: { in: members.map((m) => m.userId) } },
              select: { id: true, name: true, avatarUrl: true },
            });
            const byId = new Map(users.map((u) => [u.id, u]));
            // Kadro avatarları da base64 olabilir → tembel taşı (kalıcılaştırarak)
            return Promise.all(
              members.map(async (m) => {
                const u = byId.get(m.userId);
                let img = u?.avatarUrl ?? '';
                if (img.startsWith('data:')) {
                  const moved = (await this.storage.put(img, 'avatars')) ?? img;
                  if (moved !== img) {
                    await this.prisma.user
                      .update({ where: { id: m.userId }, data: { avatarUrl: moved } })
                      .catch(() => undefined);
                    img = moved;
                  }
                }
                return {
                  id: m.userId,
                  /*
                   * UZMAN KAYDININ KİMLİĞİ — randevu bunu taşıyor.
                   *
                   * Randevular uzmanı yalnız ADIYLA tutuyordu; aynı
                   * salonda iki aynı adlı uzman birbirinin randevusunu
                   * görüp yönetebiliyordu. `id` burada kullanıcı kimliği
                   * (rotalar ona bağlı, değiştirmiyoruz); randevu tarafı
                   * `Specialist.id` istiyor.
                   */
                  specialistId: m.id,
                  name: u?.name ?? '',
                  role: m.bio.slice(0, 40),
                  image: img,
                  rating: 0,
                };
              }),
            );
          })()
        : [];
    // Sıfır-demo: yorumlar GERÇEK — yalnız tamamlanmış randevuya bağlı, admin görünür yaptıkları
    const ratings = await this.prisma.rating.findMany({
      where: { subjectId: p.id, raterRole: 'user', visible: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const reviews = ratings.slice(0, 10).map((r) => ({
      id: r.id,
      author: r.authorLabel,
      period: periodLabel(r.createdAt),
      rating: r.score,
      text: r.comment,
      firstVisit: false,
      service: r.serviceTag,
      photos: Array.isArray(r.photos) ? (r.photos as string[]) : [],
      ...(r.reply ? { reply: r.reply } : {}),
    }));
    const starDist = [1, 2, 3, 4, 5].map((star) => ratings.filter((r) => r.score === star).length);
    // Hizmet kırılımı: gerçek yorumların hizmet etiketinden; puan yoksa null (uydurma skor YOK)
    const byTag = new Map<string, number[]>();
    for (const r of ratings) {
      if (!r.serviceTag) continue;
      byTag.set(r.serviceTag, [...(byTag.get(r.serviceTag) ?? []), r.score]);
    }
    const serviceRatings = services.slice(0, 4).map((s) => {
      const scores = byTag.get(s.name);
      return {
        name: s.name,
        score: scores?.length
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : null,
      };
    });
    // EK Z — sahip hesap bağı: Specialist(proId→userId) join. Kayıtlı bağımsız uzmanda
    // dolu; demo/seed pro'da null. Bağ varsa DM CTA + KYC rozeti (EK Z.1/Z.3) çalışır.
    const sp = await this.prisma.specialist.findFirst({
      where: { proId: p.id },
      select: {
        userId: true,
        certificates: true,
        entityType: true,
        iin: true,
        certVerified: true,
        socialVerified: true,
        socialInstagram: true,
      },
    });
    const owner = sp
      ? await this.prisma.user.findUnique({
          where: { id: sp.userId },
          select: {
            kycStatus: true,
            avatarUrl: true,
            cutoutUrl: true,
            membershipTier: true,
            membershipUntil: true,
          },
        })
      : null;
    // §medya taşıma — base64 ise R2'ye tembel taşı (2.9MB yanıt donması düzeltmesi)
    const media =
      sp && owner
        ? await this.migrateOwnerMedia(sp.userId, owner.avatarUrl, owner.cutoutUrl)
        : { avatarUrl: owner?.avatarUrl ?? null, cutoutUrl: owner?.cutoutUrl ?? null };
    // §5.1.1 — kesik portre YOKSA ve remove.bg anahtarı tanımlıysa BİR KEZ üret + kalıcılaştır
    // (kredi tekrar yanmaz; başarısızlık profili bozmaz — düz avatarla devam edilir)
    if (sp && !media.cutoutUrl && media.avatarUrl?.startsWith('http')) {
      try {
        if (await this.cutout.available()) {
          const { dataUrl } = await this.cutout.cutout({ imageUrl: media.avatarUrl });
          const stored = await this.storage.put(dataUrl, 'avatars');
          if (stored?.startsWith('http')) {
            media.cutoutUrl = stored;
            await this.prisma.user
              .update({ where: { id: sp.userId }, data: { cutoutUrl: stored } })
              .catch(() => undefined);
          }
        }
      } catch {
        // remove.bg hatası/kota → sessiz geç, avatar gösterilir
      }
    }
    // §6.1 — public profil fotosu: uzmanın KENDİ yüklediği foto (cutout>avatar); Professional.imageUrl boşsa bu.
    const ownerImage = media.cutoutUrl || media.avatarUrl || '';
    // §3.3 — KATMANLI doğrulama rozetleri. Salon: Business bayrakları; uzman: KYC = kimlik.
    const kyc = owner?.kycStatus === 'approved';
    const salonBiz =
      p.kind === 'salon'
        ? await this.prisma.business.findFirst({
            where: { professionalId: p.id },
            select: {
              ownerUserId: true,
              identityVerified: true,
              businessVerified: true,
              binVerified: true,
              addressVerified: true,
              socialVerified: true,
              socialInstagram: true,
              socialTiktok: true,
            },
          })
        : null;
    // §6.1 — sosyal chip'ler: uzmanın/salonun bağladığı hesaplar (yoksa boş → chip çizilmez)
    const social = {
      instagram:
        (sp as { socialInstagram?: string } | null)?.socialInstagram ||
        salonBiz?.socialInstagram ||
        '',
      tiktok: salonBiz?.socialTiktok || '',
    };
    // §uzman onboarding — uzman resmî kaydı: kayıtlı ИП + geçerli IIN (public'te açık IIN yok)
    const expertRegistered = uzmanKayitli(sp?.entityType, sp?.iin);
    const verification = guvenKatmanlari({
      kind: p.kind,
      kycOnayli: kyc,
      kayitli: expertRegistered,
      salon: salonBiz,
      uzman: sp,
    });
    // §11 — UZMANIN/SALONUN ÜYELİK PAKETİ, müşteriye açık.
    //
    // Müşteri kime randevu aldığını bilmeli: rozet güveni, paket ise uzmanın
    // AYNA'ya bağlılığını gösteriyor. Liste ucu bunu zaten `isPremium` diye
    // veriyordu ama yalnız evet/hayır olarak — Premium ile Platinum ayrımı
    // kayboluyordu. Detayda gerçek kademe dönüyor.
    //
    // SÜRE KONTROLÜ liste ucuyla aynı: süresi dolmuş üyelik `free` sayılır.
    // Bunu atlarsak iptal etmiş uzman profilinde sonsuza kadar Platinum
    // görünür.
    const salonOwner =
      p.kind === 'salon' && salonBiz?.ownerUserId
        ? await this.prisma.user.findUnique({
            where: { id: salonBiz.ownerUserId },
            select: { membershipTier: true, membershipUntil: true },
          })
        : null;
    const uyelik = p.kind === 'salon' ? salonOwner : owner;
    const uyelikGecerli =
      !!uyelik && (!uyelik.membershipUntil || uyelik.membershipUntil.getTime() > Date.now());
    const membershipTier: 'free' | 'premium' | 'platinum' =
      uyelikGecerli && (uyelik.membershipTier === 'premium' || uyelik.membershipTier === 'platinum')
        ? uyelik.membershipTier
        : 'free';

    // §3.3 — üst rozet. Kural artık `packages/domain`de: üç yerde ayrı
    // yazılıydı ve ikisi ayrışmıştı (uzman kendi ekranında "değilsin"
    // görürken müşteri profilinde rozeti görüyordu).
    const aynaVerified = aynaOnayli(p.kind, verification, expertRegistered);
    return {
      ...mapPro(p),
      image: ownerImage || p.imageUrl, // uzmanın gerçek fotosu esas (hesap verisi)
      about: p.about,
      ownerUserId: sp?.userId ?? null, // EK Z.1 — DM başlatma hedefi
      kycVerified: kyc, // EK Z.3 — doğrulanmış uzman rozeti
      verification, // §3.3 — katmanlı rozetler
      aynaVerified,
      membershipTier, // §11 — müşteri uzmanın paketini görüyor
      staff,
      social,
      serviceRatings,
      services,
      // §6.1 — sertifika/galeri: base64 ise R2'ye tembel taşınır (yanıt küçük kalır)
      certs: sp
        ? await this.migrateList(sp.certificates, 'certificates', (next) =>
            this.prisma.specialist.update({
              where: { userId: sp.userId },
              data: { certificates: next },
            }),
          )
        : [],
      portfolio: await this.migrateList(p.portfolio, 'portfolio', (next) =>
        this.prisma.professional.update({ where: { id: p.id }, data: { portfolio: next } }),
      ),
      promotions: parsePromos(p.promoJson), // §11 — Platinum'un profilinde yayınladığı promosyonlar
      /*
       * BAŞARI YÜZDESİ — listedeki AYNI servisten, aynı paylaşım
       * tercihiyle. Profilde gösterip listede göstermemek (ya da tersi)
       * kullanıcıyı şaşırtırdı.
       */
      basariYuzde: p.showSuccess ? ((await this.basari.tek(p.id)).yuzde ?? null) : null,
      reviews,
      starDist,
    };
  }

  async quotes() {
    const rows = await this.prisma.quote.findMany({
      include: { professional: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows
      .filter((q): q is Quote & { professional: Professional } => q.professional !== null)
      .map((q) => ({
        id: q.id,
        proId: q.professionalId,
        name: q.professional.name,
        image: q.professional.imageUrl,
        rating: Number(q.professional.rating),
        reviewCount: q.professional.reviewCount,
        friends: q.professional.friends ?? undefined,
        price: Number(q.price),
        etaMin: q.etaMin,
      }));
  }

  async createQuoteRequest(input: CreateQuoteRequestInput) {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { code: input.categoryId },
    });
    if (!category) {
      throw new BadRequestException({ code: 'CATEGORY_NOT_FOUND', message: 'Kategori bulunamadı' });
    }
    const created = await this.prisma.quoteRequest.create({
      data: {
        categoryId: category.id,
        note: input.note ?? null,
        photoUrl: input.photoUrl ?? null,
      },
    });
    return { id: created.id, status: created.status };
  }
}

// §4.6 slot yardımcıları — timezone Intl ile çözülür (sabit UTC offset YOK; plan §5)
function almatyWeekday(ms: number): number {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Almaty', weekday: 'short' }).format(
    new Date(ms),
  );
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd);
}

function hmToMs(dayStartMs: number, hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return dayStartMs + ((h ?? 0) * 60 + (m ?? 0)) * 60_000;
}

function safeParseNumbers(raw: string): number[] {
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : [];
  } catch {
    return [];
  }
}

type DayHoursRow = { wd: number; open: boolean; from: string; to: string };
function safeParseHours(raw: string): DayHoursRow[] {
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter(
      (x): x is DayHoursRow =>
        typeof x === 'object' &&
        x !== null &&
        typeof (x as DayHoursRow).wd === 'number' &&
        typeof (x as DayHoursRow).from === 'string' &&
        typeof (x as DayHoursRow).to === 'string',
    );
  } catch {
    return [];
  }
}

/**
 * "…₸'den başlayan" fiyatı GERÇEK HİZMET LİSTESİNDEN.
 *
 * `Professional.priceFrom` sütunu kayıtta bir kez yazılıyor ve uzman
 * sonradan hizmet eklediğinde GÜNCELLENMİYOR. Canlıda görülen sonuç:
 * hizmetleri 7.000–60.000 ₸ olan uzmanın kartında "0 ₸". Üst sınır zaten
 * hizmetlerden hesaplanıyordu (`priceTo`), alt sınır sütunda kalmıştı.
 *
 * Sütun yalnızca hiç hizmeti olmayan uzman için yedek.
 */
export function baslangicFiyati(p: Professional): number {
  const fiyatlar = safeParseServices(p.servicesJson)
    .map((x) => x.price)
    .filter((x) => x > 0);
  return fiyatlar.length ? Math.min(...fiyatlar) : Number(p.priceFrom);
}

function mapPro(p: Professional) {
  return {
    id: p.id,
    name: p.name,
    specialty: p.specialty,
    sector: p.sector,
    // §5.1.4 — uzmanın hizmet verdiği TÜM alanlar; arama/kategori filtresi
    // artık bunu kullanır (tek `sector` çok alanlı uzmanı gizliyordu).
    sectors: p.sectors ?? [],
    kind: p.kind,
    rating: Number(p.rating),
    reviewCount: p.reviewCount,
    friends: p.friends ?? undefined,
    priceFrom: baslangicFiyati(p),
    image: p.imageUrl,
    badge: p.badge,
    city: p.city, // §5.1.4 — harita/arama şehir eşleşmesi
    district: p.district,
    // §5.1.4 — gerçek konum (kayıtta haritadan seçildi); yoksa null → mobil şehir merkezine yakın
    lat: p.lat ?? undefined,
    lng: p.lng ?? undefined,
    experienceYears: p.experienceYears,
  };
}

// --- Detay sentezi (sektör bazlı; mobil ile aynı mantık) ---
// Sıfır-demo: sahte STAFF/REVIEW havuzları KALDIRILDI — kadro ve yorumlar gerçek kayıtlardan.

// Yorum yaş etiketi (kimlik gizliliği: kesin tarih verilmez — §6.D)
function periodLabel(d: Date): string {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 30) return 'Son 30 gün içinde';
  if (days <= 90) return '1–3 ay önce';
  return '3 aydan eski';
}

interface SvcItem {
  id: string;
  name: string;
  durationMin: number;
  price: number;
}

// §6.E — popülerlik & şeffaflık (otomatik). Profil servisine eklenir.
interface DecoratedSvc extends SvcItem {
  popular: boolean;
  discountPct: number;
}

// §6.E — popülerlik & indirim OTOMATİK türetilir (deterministik, pro id tohumlu).
// İlk 2 hizmet "öne çıkan/TOP"; bir hizmette süreli indirim. Sahte rasgelelik yok.
export function decorateServices(services: SvcItem[], proId: string): DecoratedSvc[] {
  const seed = [...proId].reduce((a, c) => a + c.charCodeAt(0), 0);
  const discountIdx = seed % services.length;
  const discountPct = [10, 15, 20, 25][seed % 4]!;
  return services.map((s, i) => ({
    ...s,
    popular: i < 2,
    discountPct: i === discountIdx ? discountPct : 0,
  }));
}

const SECTOR_SERVICES: Record<string, SvcItem[]> = {
  hair: [
    { id: 'hair-1', name: 'Saç kesimi & fön', durationMin: 60, price: 9000 },
    { id: 'hair-2', name: 'Saç boyama', durationMin: 90, price: 15000 },
    { id: 'hair-3', name: 'Balayage', durationMin: 150, price: 28000 },
    { id: 'hair-4', name: 'Keratin bakımı', durationMin: 120, price: 22000 },
    { id: 'hair-5', name: 'Topuz / saç tasarımı', durationMin: 60, price: 12000 },
  ],
  nails: [
    { id: 'nails-1', name: 'Manikür', durationMin: 45, price: 6000 },
    { id: 'nails-2', name: 'Kalıcı oje', durationMin: 60, price: 9000 },
    { id: 'nails-3', name: 'Nail art', durationMin: 90, price: 13000 },
    { id: 'nails-4', name: 'Pedikür', durationMin: 60, price: 8000 },
    { id: 'nails-5', name: 'Protez tırnak', durationMin: 120, price: 18000 },
  ],
  brows: [
    { id: 'brows-1', name: 'Kaş şekillendirme', durationMin: 30, price: 4000 },
    { id: 'brows-2', name: 'Kaş laminasyon', durationMin: 60, price: 11000 },
    { id: 'brows-3', name: 'Kaş boyama', durationMin: 30, price: 5000 },
    { id: 'brows-4', name: 'Microblading', durationMin: 120, price: 30000 },
  ],
  lashes: [
    { id: 'lashes-1', name: 'İpek kirpik', durationMin: 90, price: 14000 },
    { id: 'lashes-2', name: 'Hacimli kirpik', durationMin: 120, price: 18000 },
    { id: 'lashes-3', name: 'Kirpik lifting', durationMin: 60, price: 10000 },
    { id: 'lashes-4', name: 'Kirpik bakımı', durationMin: 30, price: 5000 },
  ],
  makeup: [
    { id: 'makeup-1', name: 'Gündüz makyajı', durationMin: 45, price: 9000 },
    { id: 'makeup-2', name: 'Gece makyajı', durationMin: 60, price: 14000 },
    { id: 'makeup-3', name: 'Gelin makyajı', durationMin: 120, price: 30000 },
    { id: 'makeup-4', name: 'Makyaj dersi', durationMin: 90, price: 16000 },
  ],
  skincare: [
    { id: 'skin-1', name: 'Cilt analizi', durationMin: 30, price: 5000 },
    { id: 'skin-2', name: 'Klasik cilt bakımı', durationMin: 60, price: 12000 },
    { id: 'skin-3', name: 'Hydrafacial', durationMin: 75, price: 20000 },
    { id: 'skin-4', name: 'Anti-aging bakım', durationMin: 90, price: 25000 },
  ],
  spa: [
    { id: 'spa-1', name: 'İsveç masajı', durationMin: 60, price: 15000 },
    { id: 'spa-2', name: 'Aroma terapi', durationMin: 75, price: 18000 },
    { id: 'spa-3', name: 'Sıcak taş masajı', durationMin: 90, price: 22000 },
    { id: 'spa-4', name: 'Vücut bakımı', durationMin: 90, price: 20000 },
  ],
  epilation: [
    { id: 'epi-1', name: 'Lazer (tek bölge)', durationMin: 30, price: 8000 },
    { id: 'epi-2', name: 'Tüm vücut lazer', durationMin: 120, price: 35000 },
    { id: 'epi-3', name: 'Ağda', durationMin: 45, price: 6000 },
    { id: 'epi-4', name: 'İğneli epilasyon', durationMin: 60, price: 12000 },
  ],
};

/** İki koordinat arası mesafe (km, haversine). */
function mesafeKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10;
}

// §11 — promoJson güvenli çözümü (bozuk veri profili düşürmesin)
function parsePromos(raw: string): unknown[] {
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// §9.5 — servicesJson çözümü: {id,name,price,durationMin} dizisi (bozuksa boş)
/**
 * Uzmanın hizmet listesi — profil ve keşif için.
 *
 * ── KATALOG BAĞI TAŞINIYOR ──────────────────────────────────────────────
 *
 * Brief §4.1 ile satırlar `{ serviceId, name, price, durationMin }` oldu:
 * `name` uzmanın kendi adı, `serviceId` bağlı olduğu alt hizmet. Burası
 * yalnız `x.id` okuyordu ve bağ DÜŞÜYORDU — profil `svc-0`, `svc-1` gibi
 * uydurma kimliklerle geliyordu.
 *
 * Bağ olmadan brief §4.7'nin istediği "kategori → alt hizmet
 * hiyerarşisiyle gruplu" gösterim kurulamıyordu: hangi hizmetin hangi
 * kategoriye ait olduğu bilinmiyordu.
 *
 * `id` SATIR kimliği (aynı alt hizmetin iki satırı olabilir, ekranın
 * onları ayırt etmesi gerekiyor), `serviceId` KATALOG bağı.
 */
export function safeParseServices(raw: string): {
  id: string;
  serviceId: string | null;
  name: string;
  durationMin: number;
  price: number;
  popular: boolean;
  discountPct: number;
}[] {
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
      .map((x, i) => {
        const bag = hizmetSatirininKimligi(x) ?? null;
        return {
          // Satır kimliği BENZERSİZ olmalı: aynı alt hizmetin iki satırı
          // aynı kimliği taşısaydı profilde biri seçilince öteki de
          // seçili görünürdü.
          id: `${bag ?? String(x.id ?? 'svc')}#${i}`,
          serviceId: bag,
          name: String(x.name ?? ''),
          durationMin: Number(x.durationMin) || 60,
          price: Number(x.price) || 0,
          popular: false,
          discountPct: 0,
        };
      })
      .filter((x) => x.name);
  } catch {
    return [];
  }
}
