import 'dotenv/config';
import { PrismaClient, ProBadge, ProviderKind } from '@prisma/client';
import { encryptField, hashPassword, normalizePhone, phoneHash } from '../src/common/crypto';

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

const MARKET_BASE: Record<string, number> = {
  hair: 15000,
  nails: 9000,
  brows: 6000,
  lashes: 13000,
  makeup: 16000,
  skincare: 14000,
  spa: 18000,
  epilation: 9000,
};

// §12 — kampanyalar (keşif vitrini)
const CAMPAIGNS: {
  title: string;
  subtitle: string;
  badge: string;
  category: string | null;
  image: string;
  tone: string;
  sortOrder: number;
}[] = [
  {
    title: 'Yaz saç bakımı',
    subtitle: 'Seçili salonlarda keratin & bakım',
    badge: '%25',
    category: 'hair',
    image: img('photo-1560066984-138dadb4c035'),
    tone: 'rose',
    sortOrder: 1,
  },
  {
    title: 'İlk randevuna özel',
    subtitle: 'AYNA’da ilk randevunda indirim',
    badge: '%20',
    category: null,
    image: img('photo-1522337660859-02fbefca4702'),
    tone: 'plum',
    sortOrder: 2,
  },
  {
    title: 'Tırnak günleri',
    subtitle: 'Kalıcı oje + nail art fırsatı',
    badge: '2+1',
    category: 'nails',
    image: img('photo-1604654894610-df63bc536371'),
    tone: 'gold',
    sortOrder: 3,
  },
];

async function main(): Promise<void> {
  await prisma.campaign.deleteMany();
  await prisma.marketPrice.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.quoteRequest.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.serviceCategory.deleteMany();
  // §12.6 blog — tekrar seed'de kopya olmaması için önce temizle
  await prisma.blogArticle.deleteMany();
  await prisma.weeklyTheme.deleteMany();
  await prisma.blogApplication.deleteMany();

  for (const c of CATEGORIES) {
    await prisma.serviceCategory.create({ data: c });
  }

  // Platform admini (işletme onayları için) — telefon: +7 700 000 00 00 / şifre: admin12345
  const key = process.env.FIELD_ENCRYPTION_KEY ?? '';
  const adminPhone = '+7 700 000 00 00';
  const adminHash = phoneHash(adminPhone, key);
  if (!(await prisma.user.findUnique({ where: { phoneHash: adminHash } }))) {
    await prisma.user.create({
      data: {
        phoneHash: adminHash,
        phoneEnc: Uint8Array.from(encryptField(normalizePhone(adminPhone), key)),
        passwordHash: hashPassword('admin12345'),
        name: 'AYNA Admin',
        email: 'admin@ayna.kz',
        role: 'admin',
        defaultLocale: 'tr',
      },
    });
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

  // Örnek randevular (mobil tohumla aynı id'ler; merge idempotent)
  const madina = createdPros[0]!;
  const aruzhan = createdPros[1]!;
  const ailin = createdPros[2]!;
  const lotus = createdPros[3]!;
  const bella = createdPros[5]!;
  const BOOKINGS = [
    {
      id: 'a1',
      source: 'direct' as const,
      service: 'Saç kesimi & fön',
      pro: madina,
      uzmanName: 'Aigerim',
      dateLabel: 'Cuma · 14:00',
      inDays: 3,
      price: 9000,
      status: 'confirmed' as const,
    },
    {
      id: 'a2',
      source: 'direct' as const,
      service: 'Cilt bakımı',
      pro: lotus,
      dateLabel: 'Geçen hafta · 16:00',
      inDays: -7,
      price: 18000,
      status: 'completed' as const,
    },
    {
      id: 'a3',
      source: 'photo_quote' as const,
      service: 'Balayage (fotoğraflı teklif)',
      pro: ailin,
      dateLabel: 'Pazartesi · 11:00',
      inDays: 6,
      price: 21000,
      status: 'pending' as const,
    },
    {
      id: 'a4',
      source: 'demand' as const,
      service: 'Gelin makyajı (talep)',
      pro: aruzhan,
      dateLabel: 'Cumartesi · 09:00',
      inDays: 4,
      price: 18000,
      status: 'confirmed' as const,
    },
    {
      id: 'a5',
      source: 'direct' as const,
      service: 'Manikür',
      pro: bella,
      uzmanName: 'Kamila',
      dateLabel: 'Geçen ay · 13:00',
      inDays: -24,
      price: 6000,
      status: 'completed' as const,
      reviewed: true,
    },
  ];
  for (const b of BOOKINGS) {
    await prisma.booking.create({
      data: {
        id: b.id,
        source: b.source,
        service: b.service,
        proId: b.pro.id,
        proName: b.pro.name,
        proImage: b.pro.imageUrl,
        uzmanName: b.uzmanName ?? null,
        dateLabel: b.dateLabel,
        inDays: b.inDays,
        price: b.price,
        status: b.status,
        reviewed: b.reviewed ?? false,
      },
    });
  }

  // Ortalama piyasa fiyatı temel değerleri (ulusal; %40 kuralı için)
  for (const [category, basePrice] of Object.entries(MARKET_BASE)) {
    await prisma.marketPrice.create({ data: { category, city: '', basePrice } });
  }

  // §12 — kampanyalar
  for (const c of CAMPAIGNS) {
    await prisma.campaign.create({ data: c });
  }

  // §12.6 — AYNA Blog (yayınlanmış makaleler; yazıya kategori → app "Teklif al" CTA)
  const lifeImg = (id: string) =>
    `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`;
  const BLOG_ARTICLES = [
    {
      title: 'Jinekolojik muayeneye nasıl hazırlanılır?',
      tag: 'Sağlık',
      categoryCode: null as string | null,
      readMin: 3,
      image: lifeImg('photo-1505751172876-fa1923c5c528'),
      excerpt: 'İlk muayene öncesi bilmen gereken pratik adımlar ve doğru zamanlama.',
      body: [
        'Düzenli jinekolojik kontrol, kadın sağlığının temel taşlarından biridir. İlk muayene gözünü korkutmasın — hazırlıklı gitmek süreci kolaylaştırır.',
        'Randevunu adetinin bittiği ilk günlere denk getirmeye çalış. Muayeneden 24 saat önce cinsel ilişki, vajinal duş ve fitil kullanımından kaçın.',
        'Şikayetlerini, son adet tarihini ve kullandığın ilaçları not al. Soru sormaktan çekinme; iyi bir uzman her adımı anlatır.',
        'Unutma: erken fark edilen pek çok durum kolayca yönetilebilir. Yılda bir kez kontrol, en değerli yatırımlardan biridir.',
      ],
    },
    {
      title: 'Saç boyatmadan önce bilmen gereken 5 şey',
      tag: 'Bakım',
      categoryCode: 'hair' as string | null,
      readMin: 2,
      image: lifeImg('photo-1522338242992-e1a54906a8da'),
      excerpt: 'Hayal kırıklığı yaşamamak için boya öncesi kontrol listesi.',
      body: [
        '1) Referans fotoğraf götür. Kelimeler yanıltıcı olabilir; görsel netlik sağlar.',
        '2) Saç geçmişini paylaş. Daha önce yapılan işlemler sonucu doğrudan etkiler.',
        '3) Fiyatı baştan netleştir. AYNA’da fiyat şeffaflığı önceliğimizdir.',
        '4) Boya öncesi saçını yıkama; doğal yağ saç derini korur.',
        '5) Sonrasında renk koruyucu bakım ürünleri kullan.',
      ],
    },
    {
      title: 'Kişisel bakım bütçesi nasıl kurulur?',
      tag: 'Para',
      categoryCode: null as string | null,
      readMin: 4,
      image: lifeImg('photo-1554224155-6726b3ff858f'),
      excerpt: 'Kendine yatırım yaparken bütçeni kontrol altında tutmanın yolu.',
      body: [
        'Kişisel bakım bir lüks değil, öz bakımın parçasıdır. Ama plansız harcama bütçeyi zorlayabilir.',
        'Aylık bir bakım bütçesi belirle ve kategorilere ayır: saç, tırnak, cilt, spa.',
        'AYNA’daki bütçe takibi ile harcamalarını gör; tekrar eden işlemler için paketleri değerlendir.',
        'Sadakat puanlarını biriktir; bazı seansları puanla karşılayarak tasarruf et.',
      ],
    },
    {
      title: 'Maaş görüşmesi için 5 pratik ipucu',
      tag: 'Kariyer',
      categoryCode: null as string | null,
      readMin: 3,
      image: lifeImg('photo-1521737604893-d14cc237f11d'),
      excerpt: 'Hak ettiğini istemek için kendinden emin bir hazırlık.',
      body: [
        'Önce piyasa araştırması yap; rakamla konuşmak güven verir.',
        'Başarılarını somut örneklerle listele.',
        'İlk rakamı söylemekten çekinme, aralık ver.',
        'Sadece maaşı değil; yan haklar, esneklik ve gelişim fırsatlarını da masaya koy.',
        'Sakin ve net ol — hazırlık, özgüvenin en iyi kaynağıdır.',
      ],
    },
    {
      title: 'Yoğun günde 10 dakikalık nefes molası',
      tag: 'Wellness',
      categoryCode: null as string | null,
      readMin: 2,
      image: lifeImg('photo-1506126613408-eca07ce68773'),
      excerpt: 'Stresi azaltan, her yerde uygulanabilen basit bir teknik.',
      body: [
        'Stres anında bedenimiz alarma geçer. Bilinçli nefes bunu hızla dengeler.',
        '4 saniye burnundan al, 4 saniye tut, 6 saniye ağzından ver. 10 kez tekrarla.',
        'Günde iki kez uygula; uyku kaliteni ve odaklanmanı belirgin iyileştirir.',
      ],
    },
  ];
  for (const a of BLOG_ARTICLES) {
    await prisma.blogArticle.create({
      data: { ...a, published: true, publishedAt: new Date() },
    });
  }

  // Aktif haftalık W2W teması
  await prisma.weeklyTheme.create({
    data: {
      title: 'Bu hafta: Küçük zaferler',
      prompt: 'Bu hafta kendin için attığın küçük ama değerli bir adımı paylaş.',
      weekStart: new Date(),
      active: true,
    },
  });

  // Bekleyen kullanıcı blog başvurusu (admin kuyruğu için)
  await prisma.blogApplication.create({
    data: {
      authorName: 'Aigerim K.',
      title: 'Kış aylarında cilt nemlendirme rehberi',
      excerpt: 'Kuru havada cildi korumak için pratik öneriler.',
      body: [
        'Kış aylarında düşük nem cildi kurutur; doğru bakımla bunu önlemek mümkün.',
        'Sabah ve akşam nemlendirici kullan; sıcak su yerine ılık su tercih et.',
        'Haftada bir nazik peeling, ardından yoğun nem maskesi uygula.',
      ],
      tag: 'Bakım',
    },
  });

  const cats = await prisma.serviceCategory.count();
  const pros = await prisma.professional.count();
  const quotes = await prisma.quote.count();
  const bookings = await prisma.booking.count();
  // eslint-disable-next-line no-console
  console.log(`Seed tamam: ${cats} kategori, ${pros} uzman, ${quotes} teklif, ${bookings} randevu`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
