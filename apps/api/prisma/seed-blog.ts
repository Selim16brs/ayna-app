// Tek seferlik: yalnızca blog tablolarını doldurur (diğer veriye dokunmaz).
// Kullanım: pnpm --filter @ayna/api exec tsx prisma/seed-blog.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const lifeImg = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`;

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

async function main() {
  const existing = await prisma.blogArticle.count();
  if (existing > 0) {
    // eslint-disable-next-line no-console
    console.log(`Blog zaten dolu (${existing} makale) — atlanıyor.`);
    return;
  }
  for (const a of BLOG_ARTICLES) {
    await prisma.blogArticle.create({ data: { ...a, published: true, publishedAt: new Date() } });
  }
  await prisma.weeklyTheme.create({
    data: {
      title: 'Bu hafta: Küçük zaferler',
      prompt: 'Bu hafta kendin için attığın küçük ama değerli bir adımı paylaş.',
      weekStart: new Date(),
      active: true,
    },
  });
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
  // eslint-disable-next-line no-console
  console.log(`Blog seed tamam: ${BLOG_ARTICLES.length} makale + 1 tema + 1 başvuru.`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
