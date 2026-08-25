import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Professional, Quote, ServiceCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
  async ads(locale?: string) {
    const rows = await this.prisma.adBanner.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    return localizeRows(rows, locale, ['title', 'subtitle']).map((a) => ({
      id: a.id,
      proId: a.proId,
      title: a.title,
      subtitle: a.subtitle,
      image: a.image,
    }));
  }

  async professionals() {
    const rows = await this.prisma.professional.findMany({ orderBy: { rating: 'desc' } });
    // §5.1.4-8 — liste eksik alanları: konum (harita), fiyat aralığı üstü, premium rozeti.
    // Sahip eşleşmesi iki toplu sorguyla (N+1 yok): Specialist.proId + Business.professionalId.
    const ids = rows.map((r) => r.id);
    const [sps, bizs] = await Promise.all([
      this.prisma.specialist.findMany({
        where: { proId: { in: ids } },
        select: { proId: true, userId: true },
      }),
      this.prisma.business.findMany({
        where: { professionalId: { in: ids } },
        select: { professionalId: true, ownerUserId: true },
      }),
    ]);
    const ownerByPro = new Map<string, string>();
    for (const x of sps) if (x.proId) ownerByPro.set(x.proId, x.userId);
    for (const x of bizs) if (x.professionalId) ownerByPro.set(x.professionalId, x.ownerUserId);
    const owners = [...new Set(ownerByPro.values())];
    const users = owners.length
      ? await this.prisma.user.findMany({
          where: { id: { in: owners } },
          select: { id: true, status: true, membershipTier: true, membershipUntil: true },
        })
      : [];
    // Sahibi silinmiş/askıdaki hesaplar keşifte görünmez (hesap kapansa da katalog kaydı kalabiliyor).
    const hiddenOwners = new Set(
      users.filter((u) => u.status === 'deleted' || u.status === 'suspended').map((u) => u.id),
    );
    const now = Date.now();
    const premiumUsers = new Set(
      users
        .filter(
          (u) =>
            (u.membershipTier === 'premium' || u.membershipTier === 'platinum') &&
            (!u.membershipUntil || u.membershipUntil.getTime() > now),
        )
        .map((u) => u.id),
    );
    return rows
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
          priceTo: prices.length ? Math.max(...prices) : Number(r.priceFrom),
          isPremium: owner ? premiumUsers.has(owner) : false,
        };
      });
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
    // §9.5 — uzman kendi hizmet/fiyat listesini girdiyse PUBLIC profil ONU gösterir;
    // sektör şablonu yalnız liste boşken (yeni hesap) menü iskeleti olarak kalır.
    const own = safeParseServices(p.servicesJson);
    const services = own.length
      ? own
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
          select: { kycStatus: true, avatarUrl: true, cutoutUrl: true },
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
    const expertRegistered = sp?.entityType === 'ip' && /^\d{12}$/.test(sp?.iin ?? '');
    const verification = {
      identity: salonBiz?.identityVerified ?? kyc,
      business: salonBiz?.businessVerified ?? expertRegistered,
      bin: salonBiz?.binVerified ?? expertRegistered,
      address: salonBiz?.addressVerified ?? false,
      social: salonBiz?.socialVerified ?? sp?.socialVerified ?? false,
      // uzmana özel katman: doğrulanmış sertifika (salonda yok)
      cert: p.kind === 'salon' ? false : (sp?.certVerified ?? false),
    };
    // AYNA Verified (üst rozet): salon → kimlik + (işletme|BİN); uzman → kimlik + (sertifika|sosyal|kayıt).
    const aynaVerified =
      p.kind === 'salon'
        ? verification.identity && (verification.business || verification.bin)
        : verification.identity && (verification.cert || verification.social || expertRegistered);
    return {
      ...mapPro(p),
      image: ownerImage || p.imageUrl, // uzmanın gerçek fotosu esas (hesap verisi)
      about: p.about,
      ownerUserId: sp?.userId ?? null, // EK Z.1 — DM başlatma hedefi
      kycVerified: kyc, // EK Z.3 — doğrulanmış uzman rozeti
      verification, // §3.3 — katmanlı rozetler
      aynaVerified,
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

function mapPro(p: Professional) {
  return {
    id: p.id,
    name: p.name,
    specialty: p.specialty,
    sector: p.sector,
    kind: p.kind,
    rating: Number(p.rating),
    reviewCount: p.reviewCount,
    friends: p.friends ?? undefined,
    priceFrom: Number(p.priceFrom),
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
function safeParseServices(raw: string): {
  id: string;
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
      .map((x, i) => ({
        id: String(x.id ?? `svc-${i}`),
        name: String(x.name ?? ''),
        durationMin: Number(x.durationMin) || 60,
        price: Number(x.price) || 0,
        popular: false,
        discountPct: 0,
      }))
      .filter((x) => x.name);
  } catch {
    return [];
  }
}
