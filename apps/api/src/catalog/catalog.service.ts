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
    const services = decorateServices(SECTOR_SERVICES[p.sector] ?? SECTOR_SERVICES.hair!, p.id);
    const staff =
      p.kind === 'salon'
        ? STAFF.slice(0, 3).map((s, i) => ({
            id: `${p.id}-u${i + 1}`,
            name: s.name,
            role: s.role,
            image: avatar(FACES[i % FACES.length]!),
            rating: Math.round((4.6 + (i % 4) * 0.1) * 10) / 10,
          }))
        : [];
    const serviceRatings = services.slice(0, 4).map((s, i) => ({
      name: s.name,
      score: i === 3 ? null : Math.round((4.5 + (i % 5) * 0.1) * 10) / 10,
    }));
    const reviews = REVIEW_POOL.slice(0, 4).map((r, i) => ({
      ...r,
      id: `${p.id}-r${i + 1}`,
      service: services[i % services.length]!.name,
    }));
    return {
      ...mapPro(p),
      about: p.about,
      staff,
      serviceRatings,
      services,
      portfolio: PORTFOLIO.map(portfolioImg),
      reviews,
    };
  }

  async quotes() {
    const rows = await this.prisma.quote.findMany({
      include: { professional: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((q: Quote & { professional: Professional }) => ({
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
    district: p.district,
    experienceYears: p.experienceYears,
  };
}

// --- Detay sentezi (sektör bazlı; mobil ile aynı mantık) ---
const avatar = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=200&q=70`;
const portfolioImg = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&q=70`;

const FACES = [
  'photo-1487412720507-e7ab37603c6f',
  'photo-1494790108377-be9c29b29330',
  'photo-1438761681033-6461ffad8d80',
];

const PORTFOLIO = [
  'photo-1562322140-8baeececf3df',
  'photo-1595476108010-b4d1f102b1b1',
  'photo-1633681926022-84c23e8cb2d6',
  'photo-1521590832167-7bcbfaa6381f',
  'photo-1516975080664-ed2fc6a32937',
  'photo-1588776814546-1ffcf47267a5',
];

const STAFF = [
  { name: 'Madina', role: 'Renk uzmanı' },
  { name: 'Aigerim', role: 'Kesim & fön' },
  { name: 'Saule', role: 'Bakım & keratin' },
];

const REVIEW_POOL = [
  {
    author: 'Dana',
    period: 'Son 30 gün içinde',
    rating: 5,
    text: 'Sonuç tam istediğim gibiydi, fiyat baştan açıktı. Kesinlikle tekrar geleceğim.',
    firstVisit: true,
  },
  {
    author: 'Doğrulanmış üye',
    period: '1–3 ay önce',
    rating: 4,
    text: 'Usta çok dikkatliydi ve zamanında başladı. Memnun kaldım.',
    firstVisit: false,
  },
  {
    author: 'Aizhan',
    period: 'Son 30 gün içinde',
    rating: 5,
    text: 'Hijyen mükemmeldi, her şey gözümün önünde sterilize edildi.',
    firstVisit: true,
  },
  {
    author: 'Gulnara',
    period: '1–3 ay önce',
    rating: 5,
    text: 'Çok ilgili bir ekip, sonuçtan ailem bile etkilendi.',
    firstVisit: false,
  },
];

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
