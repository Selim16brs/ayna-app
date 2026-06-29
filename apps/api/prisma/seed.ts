import 'dotenv/config';
import { PrismaClient, ProBadge } from '@prisma/client';

const prisma = new PrismaClient();

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=70`;

const CATEGORIES = [
  { code: 'hair', nameTr: 'Saç', icon: 'cut-outline', tone: 'rose', sortOrder: 1 },
  { code: 'nails', nameTr: 'Tırnak', icon: 'color-palette-outline', tone: 'gold', sortOrder: 2 },
  { code: 'brows', nameTr: 'Kaş & Kirpik', icon: 'eye-outline', tone: 'rose', sortOrder: 3 },
  { code: 'makeup', nameTr: 'Makyaj', icon: 'brush-outline', tone: 'gold', sortOrder: 4 },
  { code: 'spa', nameTr: 'Spa & Masaj', icon: 'flower-outline', tone: 'rose', sortOrder: 5 },
];

const PROS = [
  {
    name: 'Madina Studio',
    specialty: 'Saç boyama · Balayage',
    district: 'Almatı · Medeu',
    rating: 4.9,
    reviewCount: 47,
    experienceYears: 8,
    priceFrom: 15000,
    friends: 3,
    imageUrl: img('photo-1560066984-138dadb4c035'),
    badge: ProBadge.campaign,
    price: 16000,
    etaMin: 120,
  },
  {
    name: 'Aruzhan Beauty',
    specialty: 'Manikür · Nail art',
    district: 'Almatı · Bostandyk',
    rating: 4.8,
    reviewCount: 33,
    experienceYears: 5,
    priceFrom: 8000,
    friends: null,
    imageUrl: img('photo-1604654894610-df63bc536371'),
    badge: ProBadge.today,
    price: 12000,
    etaMin: 75,
  },
  {
    name: 'Ailin Makeup',
    specialty: 'Gelin & gece makyajı',
    district: 'Almatı · Almaly',
    rating: 5.0,
    reviewCount: 62,
    experienceYears: 10,
    priceFrom: 25000,
    friends: 5,
    imageUrl: img('photo-1596462502278-27bfdc403348'),
    badge: ProBadge.verified,
    price: 21000,
    etaMin: 90,
  },
  {
    name: 'Lotus Spa',
    specialty: 'Masaj · Cilt bakımı',
    district: 'Almatı · Esentai',
    rating: 4.7,
    reviewCount: 28,
    experienceYears: 6,
    priceFrom: 18000,
    friends: null,
    imageUrl: img('photo-1540555700478-4be289fbecef'),
    badge: ProBadge.campaign,
    price: 9500,
    etaMin: 60,
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

  for (const p of PROS) {
    const { price, etaMin, ...pro } = p;
    const created = await prisma.professional.create({ data: pro });
    await prisma.quote.create({
      data: { professionalId: created.id, price, etaMin },
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
