import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Professional, Quote, ServiceCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { localizeRows } from '../common/i18n';
import type { CreateQuoteRequestInput } from './catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

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
    return rows.map(mapPro);
  }

  async professional(id: string) {
    const p = await this.prisma.professional.findUnique({ where: { id } });
    if (!p) {
      throw new NotFoundException({ code: 'PRO_NOT_FOUND', message: 'İşletme bulunamadı' });
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
            return members.map((m) => ({
              id: m.userId,
              name: byId.get(m.userId)?.name ?? '',
              role: m.bio.slice(0, 40),
              image: byId.get(m.userId)?.avatarUrl ?? '',
              rating: 0,
            }));
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
      select: { userId: true, certificates: true },
    });
    const owner = sp
      ? await this.prisma.user.findUnique({ where: { id: sp.userId }, select: { kycStatus: true } })
      : null;
    return {
      ...mapPro(p),
      about: p.about,
      ownerUserId: sp?.userId ?? null, // EK Z.1 — DM başlatma hedefi
      kycVerified: owner?.kycStatus === 'approved', // EK Z.3 — doğrulanmış uzman rozeti
      staff,
      serviceRatings,
      services,
      certs: sp?.certificates ?? [], // §6.1 — uzmanın yüklediği gerçek sertifikalar
      portfolio: p.portfolio, // uzmanın KENDİ yüklediği galeri (hesap verisi)
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
