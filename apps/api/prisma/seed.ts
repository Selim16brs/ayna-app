import 'dotenv/config';
import { PrismaClient, ProBadge, ProviderKind } from '@prisma/client';

const prisma = new PrismaClient();

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=70`;

const CATEGORIES = [
  { code: 'hair', nameTr: 'Saç', icon: 'cut-outline', tone: 'rose', sortOrder: 1 },
  { code: 'nails', nameTr: 'Tırnak', icon: 'color-palette-outline', tone: 'gold', sortOrder: 2 },
  { code: 'brows', nameTr: 'Kaş', icon: 'eye-outline', tone: 'rose', sortOrder: 3 },
  { code: 'lashes', nameTr: 'Kirpik', icon: 'sparkles-outline', tone: 'gold', sortOrder: 4 },
  { code: 'makeup', nameTr: 'Makyaj', icon: 'brush-outline', tone: 'rose', sortOrder: 5 },
  { code: 'skincare', nameTr: 'Cilt Bakımı', icon: 'water-outline', tone: 'gold', sortOrder: 6 },
  { code: 'spa', nameTr: 'Spa & Masaj', icon: 'flower-outline', tone: 'rose', sortOrder: 7 },
  { code: 'epilation', nameTr: 'Epilasyon', icon: 'flash-outline', tone: 'gold', sortOrder: 8 },
];

const SALON_IMAGES = [
  'photo-1560066984-138dadb4c035',
  'photo-1633681926022-84c23e8cb2d6',
  'photo-1522337660859-02fbefca4702',
  'photo-1540555700478-4be289fbecef',
  'photo-1596462502278-27bfdc403348',
  'photo-1604654894610-df63bc536371',
  'photo-1516975080664-ed2fc6a32937',
  'photo-1487412947147-5cebf100ffc2',
  'photo-1559599101-f09722fb4948',
  'photo-1571875257727-256c39da42af',
  'photo-1503951914875-452162b0f3f1',
  'photo-1457972729786-0411a3b2b626',
];

const DISTRICTS = [
  'Almatı · Medeu',
  'Almatı · Bostandık',
  'Almatı · Almalı',
  'Astana · Esil',
  'Astana · Almatı',
  'Şımkent · Merkez',
];

const SECTOR_SPECIALTY: Record<string, string> = {
  hair: 'Saç boyama · Balayage',
  nails: 'Manikür · Nail art',
  brows: 'Kaş tasarımı · Laminasyon',
  lashes: 'İpek kirpik · Lifting',
  makeup: 'Gelin & gece makyajı',
  skincare: 'Cilt bakımı · Hydrafacial',
  spa: 'Masaj · Vücut bakımı',
  epilation: 'Lazer · Ağda',
};

interface ProSeed {
  name: string;
  sector: string;
  kind: ProviderKind;
  rating: number;
  reviewCount: number;
  friends?: number;
  priceFrom: number;
  badge: ProBadge;
}

const PRO_SEEDS: ProSeed[] = [
  {
    name: 'Madina Studio',
    sector: 'hair',
    kind: ProviderKind.salon,
    rating: 4.9,
    reviewCount: 312,
    friends: 3,
    priceFrom: 15000,
    badge: ProBadge.campaign,
  },
  {
    name: 'Aruzhan Beauty',
    sector: 'nails',
    kind: ProviderKind.independent,
    rating: 4.8,
    reviewCount: 156,
    priceFrom: 8000,
    badge: ProBadge.today,
  },
  {
    name: 'Ailin Makeup',
    sector: 'makeup',
    kind: ProviderKind.independent,
    rating: 5.0,
    reviewCount: 204,
    friends: 5,
    priceFrom: 25000,
    badge: ProBadge.verified,
  },
  {
    name: 'Lotus Spa',
    sector: 'spa',
    kind: ProviderKind.salon,
    rating: 4.7,
    reviewCount: 98,
    priceFrom: 18000,
    badge: ProBadge.campaign,
  },
  {
    name: 'Glow Room',
    sector: 'skincare',
    kind: ProviderKind.salon,
    rating: 4.8,
    reviewCount: 142,
    friends: 2,
    priceFrom: 12000,
    badge: ProBadge.verified,
  },
  {
    name: 'Bella Nails',
    sector: 'nails',
    kind: ProviderKind.salon,
    rating: 4.6,
    reviewCount: 87,
    priceFrom: 7000,
    badge: ProBadge.today,
  },
  {
    name: 'Aru Brows',
    sector: 'brows',
    kind: ProviderKind.independent,
    rating: 4.9,
    reviewCount: 176,
    friends: 4,
    priceFrom: 5000,
    badge: ProBadge.verified,
  },
  {
    name: 'Lash Lab',
    sector: 'lashes',
    kind: ProviderKind.salon,
    rating: 4.8,
    reviewCount: 121,
    priceFrom: 14000,
    badge: ProBadge.campaign,
  },
  {
    name: 'Sezim Hair',
    sector: 'hair',
    kind: ProviderKind.independent,
    rating: 4.7,
    reviewCount: 64,
    priceFrom: 11000,
    badge: ProBadge.today,
  },
  {
    name: 'Nur Beauty Bar',
    sector: 'makeup',
    kind: ProviderKind.salon,
    rating: 4.6,
    reviewCount: 73,
    priceFrom: 13000,
    badge: ProBadge.verified,
  },
  {
    name: 'Almaty Glow',
    sector: 'skincare',
    kind: ProviderKind.independent,
    rating: 4.9,
    reviewCount: 188,
    friends: 6,
    priceFrom: 15000,
    badge: ProBadge.campaign,
  },
  {
    name: 'Zhuldyz Laser',
    sector: 'epilation',
    kind: ProviderKind.salon,
    rating: 4.7,
    reviewCount: 109,
    priceFrom: 8000,
    badge: ProBadge.verified,
  },
  {
    name: 'Kamila Nails',
    sector: 'nails',
    kind: ProviderKind.independent,
    rating: 4.8,
    reviewCount: 95,
    friends: 1,
    priceFrom: 9000,
    badge: ProBadge.today,
  },
  {
    name: 'Velvet Lashes',
    sector: 'lashes',
    kind: ProviderKind.independent,
    rating: 4.9,
    reviewCount: 132,
    priceFrom: 12000,
    badge: ProBadge.verified,
  },
  {
    name: 'Asel Hair Atelier',
    sector: 'hair',
    kind: ProviderKind.salon,
    rating: 5.0,
    reviewCount: 241,
    friends: 7,
    priceFrom: 20000,
    badge: ProBadge.campaign,
  },
  {
    name: 'Pure Skin Clinic',
    sector: 'skincare',
    kind: ProviderKind.salon,
    rating: 4.7,
    reviewCount: 156,
    priceFrom: 18000,
    badge: ProBadge.verified,
  },
  {
    name: 'Dana Brows',
    sector: 'brows',
    kind: ProviderKind.independent,
    rating: 4.6,
    reviewCount: 54,
    priceFrom: 4500,
    badge: ProBadge.today,
  },
  {
    name: 'Serenity Spa',
    sector: 'spa',
    kind: ProviderKind.salon,
    rating: 4.9,
    reviewCount: 167,
    friends: 2,
    priceFrom: 22000,
    badge: ProBadge.campaign,
  },
  {
    name: 'Zhanar Makeup',
    sector: 'makeup',
    kind: ProviderKind.independent,
    rating: 4.8,
    reviewCount: 118,
    priceFrom: 16000,
    badge: ProBadge.verified,
  },
  {
    name: 'Smooth Laser Bar',
    sector: 'epilation',
    kind: ProviderKind.independent,
    rating: 4.7,
    reviewCount: 76,
    priceFrom: 7000,
    badge: ProBadge.today,
  },
  {
    name: 'Diva Nails Lounge',
    sector: 'nails',
    kind: ProviderKind.salon,
    rating: 4.8,
    reviewCount: 134,
    friends: 3,
    priceFrom: 8500,
    badge: ProBadge.campaign,
  },
  {
    name: 'Aigerim Lashes',
    sector: 'lashes',
    kind: ProviderKind.independent,
    rating: 5.0,
    reviewCount: 199,
    friends: 4,
    priceFrom: 13000,
    badge: ProBadge.verified,
  },
  {
    name: 'Royal Hair House',
    sector: 'hair',
    kind: ProviderKind.salon,
    rating: 4.6,
    reviewCount: 89,
    priceFrom: 14000,
    badge: ProBadge.today,
  },
  {
    name: 'Botanika Skincare',
    sector: 'skincare',
    kind: ProviderKind.independent,
    rating: 4.9,
    reviewCount: 145,
    priceFrom: 13000,
    badge: ProBadge.verified,
  },
];

async function main(): Promise<void> {
  await prisma.quote.deleteMany();
  await prisma.quoteRequest.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.serviceCategory.deleteMany();

  for (const c of CATEGORIES) {
    await prisma.serviceCategory.create({ data: c });
  }

  const createdPros = [];
  for (let i = 0; i < PRO_SEEDS.length; i++) {
    const s = PRO_SEEDS[i]!;
    const created = await prisma.professional.create({
      data: {
        name: s.name,
        specialty: SECTOR_SPECIALTY[s.sector] ?? s.name,
        sector: s.sector,
        kind: s.kind,
        district: DISTRICTS[i % DISTRICTS.length]!,
        about:
          'AYNA tarafından doğrulanmış, deneyimli ekip. Hijyen ve fiyat şeffaflığı önceliğimiz.',
        rating: s.rating,
        reviewCount: s.reviewCount,
        experienceYears: 4 + (i % 12),
        priceFrom: s.priceFrom,
        friends: s.friends ?? null,
        imageUrl: img(SALON_IMAGES[i % SALON_IMAGES.length]!),
        badge: s.badge,
      },
    });
    createdPros.push(created);
  }

  // Örnek foto-teklif sonuçları (ilk 4 işletmeden)
  for (let i = 0; i < 4; i++) {
    const p = createdPros[i]!;
    await prisma.quote.create({
      data: { professionalId: p.id, price: Number(p.priceFrom) + 1000, etaMin: 60 + i * 30 },
    });
  }

  const cats = await prisma.serviceCategory.count();
  const pros = await prisma.professional.count();
  const quotes = await prisma.quote.count();
  // eslint-disable-next-line no-console
  console.log(`Seed tamam: ${cats} kategori, ${pros} uzman, ${quotes} teklif`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
