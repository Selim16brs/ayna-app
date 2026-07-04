import type { Ionicons } from '@expo/vector-icons';
import type { MessageKey } from '@ayna/i18n';
import { almatySlotMs, daysUntil, formatSlotTr } from './datetime';
import { TAXONOMY, type Tri, activeCategories, tri } from './taxonomy';

type IoniconName = keyof typeof Ionicons.glyphMap;

// ── Kategoriler / sektörler (kadın odaklı güzellik) ──────────────────────
export interface Category {
  id: string;
  labelKey: MessageKey;
  icon: IoniconName;
  tone: 'rose' | 'gold';
}

// Keşfet/talep akışı ana kategorileri = MERKEZİ taksonomideki AKTİF kategoriler (tek kaynak).
export const CATEGORIES: Category[] = activeCategories().map((c, i) => ({
  id: c.id,
  labelKey: c.labelKey,
  icon: c.icon,
  tone: i % 2 === 0 ? 'rose' : 'gold',
}));

export const categoryLabelKey = (id: string): MessageKey =>
  CATEGORIES.find((c) => c.id === id)?.labelKey ?? 'category.hair';

// Kazakistan başlıca şehirleri (kayıt / şehir seçimi)
export const CITIES: string[] = [
  'Almatı',
  'Astana',
  'Şımkent',
  'Karagandı',
  'Aktöbe',
  'Taraz',
  'Pavlodar',
  'Öskemen',
  'Semey',
  'Atırav',
  'Kostanay',
  'Kızılorda',
  'Oral',
  'Aktau',
  'Türkistan',
];

export type ProBadge = 'campaign' | 'verified' | 'today';
export type ProviderKind = 'salon' | 'independent';

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  sector: string; // category id
  kind: ProviderKind;
  rating: number;
  reviewCount: number;
  friends?: number;
  priceFrom: number;
  priceTo: number; // §5.1.5 — salon kartında fiyat ARALIĞI için üst sınır (uzman fiyatları)
  image: string;
  badge: ProBadge;
  city: string;
  district: string;
  experienceYears: number;
  isPremium: boolean; // §5.1.6-8 — Premium Görünürlük Paketi (Fırsatlar/Öne Çıkanlar/Sana Yakın)
}

/** Salon içindeki bir uzman (kadro). Bağımsız uzmanlarda kadro yoktur. */
export interface Uzman {
  id: string;
  name: string;
  role: string;
  image: string;
  rating: number;
}

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=70`;
const avatar = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=200&q=70`;

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

const FACES = [
  'photo-1487412720507-e7ab37603c6f',
  'photo-1494790108377-be9c29b29330',
  'photo-1438761681033-6461ffad8d80',
  'photo-1544005313-94ddf0286df2',
  'photo-1534528741775-53994a69daeb',
  'photo-1546961329-78bef0414d7c',
  'photo-1573496359142-b8d87734a5a2',
  'photo-1502823403499-6ccfcf4fb453',
];

// Şehre göre semtler — semt ETİKETİ sağlayıcının GERÇEK şehriyle eşleşmeli
// (Almatı seçili kullanıcı Astana semti görmesin).
const CITY_DISTRICTS: Record<string, string[]> = {
  Almatı: ['Medeu', 'Bostandık', 'Almalı', 'Auezov', 'Türksib'],
  Astana: ['Esil', 'Almatı', 'Saryarka', 'Baykoñyr'],
  Şımkent: ['Al-Farabi', 'Enbekşi', 'Karatau', 'Abay'],
};
const DEFAULT_DISTRICTS = ['Merkez', 'Jaña qala'];
function districtFor(city: string, i: number): string {
  const list = CITY_DISTRICTS[city] ?? DEFAULT_DISTRICTS;
  return `${city} · ${list[i % list.length]}`;
}

const SECTOR_SPECIALTY: Record<string, string> = {
  hair: 'Saç boyama · Balayage',
  nails: 'Manikür · Nail art',
  brows: 'Kaş tasarımı · Laminasyon',
  lashes: 'İpek kirpik · Lifting',
  makeup: 'Gelin & gece makyajı',
  skincare: 'Cilt bakımı · Hydrafacial',
  spa: 'Masaj · Vücut bakımı',
  epilation: 'Lazer · Ağda',
  pmu: 'Kalıcı makyaj · Dudak & kaş',
  bridal: 'Gelin başı · Özel gün',
  wellness: 'Fitness · Yoga · Pilates',
  style: 'Kişisel stil · Renk analizi',
};

// ── İşletmeler / uzmanlar (zengin liste) ─────────────────────────────────
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
    kind: 'salon',
    rating: 4.9,
    reviewCount: 312,
    friends: 3,
    priceFrom: 15000,
    badge: 'campaign',
  },
  {
    name: 'Aruzhan Beauty',
    sector: 'nails',
    kind: 'independent',
    rating: 4.8,
    reviewCount: 156,
    priceFrom: 8000,
    badge: 'today',
  },
  {
    name: 'Ailin Makeup',
    sector: 'makeup',
    kind: 'independent',
    rating: 5.0,
    reviewCount: 204,
    friends: 5,
    priceFrom: 25000,
    badge: 'verified',
  },
  {
    name: 'Lotus Spa',
    sector: 'spa',
    kind: 'salon',
    rating: 4.7,
    reviewCount: 98,
    priceFrom: 18000,
    badge: 'campaign',
  },
  {
    name: 'Glow Room',
    sector: 'skincare',
    kind: 'salon',
    rating: 4.8,
    reviewCount: 142,
    friends: 2,
    priceFrom: 12000,
    badge: 'verified',
  },
  {
    name: 'Bella Nails',
    sector: 'nails',
    kind: 'salon',
    rating: 4.6,
    reviewCount: 87,
    priceFrom: 7000,
    badge: 'today',
  },
  {
    name: 'Aru Brows',
    sector: 'brows',
    kind: 'independent',
    rating: 4.9,
    reviewCount: 176,
    friends: 4,
    priceFrom: 5000,
    badge: 'verified',
  },
  {
    name: 'Lash Lab',
    sector: 'lashes',
    kind: 'salon',
    rating: 4.8,
    reviewCount: 121,
    priceFrom: 14000,
    badge: 'campaign',
  },
  {
    name: 'Sezim Hair',
    sector: 'hair',
    kind: 'independent',
    rating: 4.7,
    reviewCount: 64,
    priceFrom: 11000,
    badge: 'today',
  },
  {
    name: 'Nur Beauty Bar',
    sector: 'makeup',
    kind: 'salon',
    rating: 4.6,
    reviewCount: 73,
    priceFrom: 13000,
    badge: 'verified',
  },
  {
    name: 'Almaty Glow',
    sector: 'skincare',
    kind: 'independent',
    rating: 4.9,
    reviewCount: 188,
    friends: 6,
    priceFrom: 15000,
    badge: 'campaign',
  },
  {
    name: 'Zhuldyz Laser',
    sector: 'epilation',
    kind: 'salon',
    rating: 4.7,
    reviewCount: 109,
    priceFrom: 8000,
    badge: 'verified',
  },
  {
    name: 'Kamila Nails',
    sector: 'nails',
    kind: 'independent',
    rating: 4.8,
    reviewCount: 95,
    friends: 1,
    priceFrom: 9000,
    badge: 'today',
  },
  {
    name: 'Velvet Lashes',
    sector: 'lashes',
    kind: 'independent',
    rating: 4.9,
    reviewCount: 132,
    priceFrom: 12000,
    badge: 'verified',
  },
  {
    name: 'Asel Hair Atelier',
    sector: 'hair',
    kind: 'salon',
    rating: 5.0,
    reviewCount: 241,
    friends: 7,
    priceFrom: 20000,
    badge: 'campaign',
  },
  {
    name: 'Pure Skin Clinic',
    sector: 'skincare',
    kind: 'salon',
    rating: 4.7,
    reviewCount: 156,
    priceFrom: 18000,
    badge: 'verified',
  },
  {
    name: 'Dana Brows',
    sector: 'brows',
    kind: 'independent',
    rating: 4.6,
    reviewCount: 54,
    priceFrom: 4500,
    badge: 'today',
  },
  {
    name: 'Serenity Spa',
    sector: 'spa',
    kind: 'salon',
    rating: 4.9,
    reviewCount: 167,
    friends: 2,
    priceFrom: 22000,
    badge: 'campaign',
  },
  {
    name: 'Zhanar Makeup',
    sector: 'makeup',
    kind: 'independent',
    rating: 4.8,
    reviewCount: 118,
    priceFrom: 16000,
    badge: 'verified',
  },
  {
    name: 'Smooth Laser Bar',
    sector: 'epilation',
    kind: 'independent',
    rating: 4.7,
    reviewCount: 76,
    priceFrom: 7000,
    badge: 'today',
  },
  {
    name: 'Diva Nails Lounge',
    sector: 'nails',
    kind: 'salon',
    rating: 4.8,
    reviewCount: 134,
    friends: 3,
    priceFrom: 8500,
    badge: 'campaign',
  },
  {
    name: 'Aigerim Lashes',
    sector: 'lashes',
    kind: 'independent',
    rating: 5.0,
    reviewCount: 199,
    friends: 4,
    priceFrom: 13000,
    badge: 'verified',
  },
  {
    name: 'Royal Hair House',
    sector: 'hair',
    kind: 'salon',
    rating: 4.6,
    reviewCount: 89,
    priceFrom: 14000,
    badge: 'today',
  },
  {
    name: 'Botanika Skincare',
    sector: 'skincare',
    kind: 'independent',
    rating: 4.9,
    reviewCount: 145,
    priceFrom: 13000,
    badge: 'verified',
  },
  // ── Yeni kategoriler (v1) için tohum sağlayıcılar — boş kategori olmasın ──
  {
    name: 'Aizada PMU Studio',
    sector: 'pmu',
    kind: 'salon',
    rating: 4.9,
    reviewCount: 132,
    priceFrom: 30000,
    badge: 'verified',
  },
  {
    name: 'Perluza Permanent',
    sector: 'pmu',
    kind: 'independent',
    rating: 4.7,
    reviewCount: 78,
    priceFrom: 28000,
    badge: 'today',
  },
  {
    name: 'Aq Qanat Gelin Evi',
    sector: 'bridal',
    kind: 'salon',
    rating: 5.0,
    reviewCount: 214,
    friends: 6,
    priceFrom: 45000,
    badge: 'campaign',
  },
  {
    name: 'Aruna Bridal Studio',
    sector: 'bridal',
    kind: 'salon',
    rating: 4.8,
    reviewCount: 96,
    priceFrom: 40000,
    badge: 'verified',
  },
];

export const PROFESSIONALS: Professional[] = PRO_SEEDS.map((s, i) => {
  // Şehir dağılımı: çoğunluk Almatı, bir kısmı diğer şehirler (şehir filtresi için)
  const city = i % 4 === 0 ? (CITIES[1 + ((i / 4) % (CITIES.length - 1))] ?? 'Almatı') : 'Almatı';
  return {
    id: String(i + 1),
    name: s.name,
    specialty: SECTOR_SPECIALTY[s.sector] ?? s.name,
    sector: s.sector,
    kind: s.kind,
    rating: s.rating,
    reviewCount: s.reviewCount,
    ...(s.friends !== undefined ? { friends: s.friends } : {}),
    priceFrom: s.priceFrom,
    // Salon: uzman fiyat aralığı üst sınırı (deterministik ~2.2x); bağımsız uzmanda kart tek fiyat gösterir.
    priceTo: Math.round((s.priceFrom * 2.2) / 500) * 500,
    image: img(SALON_IMAGES[i % SALON_IMAGES.length]!),
    badge: s.badge,
    city,
    district: districtFor(city, i), // semt = sağlayıcının GERÇEK şehriyle uyumlu
    experienceYears: 4 + (i % 12),
    isPremium: i % 3 === 0, // deterministik premium dağılımı (mock)
  };
});

// Ana ekranda öne çıkanlar (ilk birkaç)
export const FEATURED: Professional[] = PROFESSIONALS.slice(0, 8);

export function formatPrice(value: number): string {
  return `₸${value.toLocaleString('ru-RU')}`;
}

// §5.1.5 — salon kartı fiyat ARALIĞI (uzman fiyatları), bağımsız uzman tek fiyat gösterir.
export function priceLabel(pro: Pick<Professional, 'kind' | 'priceFrom' | 'priceTo'>): string {
  if (pro.kind === 'salon') {
    return `₸${pro.priceFrom.toLocaleString('ru-RU')}–${pro.priceTo.toLocaleString('ru-RU')}`;
  }
  return formatPrice(pro.priceFrom);
}

// ── Harita (§8) — Almatı merkezli koordinatlar ───────────────────────────
export interface LatLng {
  latitude: number;
  longitude: number;
}

export const ALMATY: LatLng = { latitude: 43.2389, longitude: 76.8897 };

// Şehir merkezleri (KZ başlıca şehirler) — harita + mesafe için (demo koordinatlar).
export const CITY_COORDS: Record<string, LatLng> = {
  Almatı: { latitude: 43.2389, longitude: 76.8897 },
  Astana: { latitude: 51.1605, longitude: 71.4704 },
  Şımkent: { latitude: 42.3417, longitude: 69.5901 },
  Karagandı: { latitude: 49.8047, longitude: 73.1094 },
  Aktöbe: { latitude: 50.2839, longitude: 57.167 },
  Taraz: { latitude: 42.9, longitude: 71.3667 },
  Pavlodar: { latitude: 52.287, longitude: 76.9674 },
  Öskemen: { latitude: 49.948, longitude: 82.6144 },
  Semey: { latitude: 50.4111, longitude: 80.2275 },
  Atırav: { latitude: 47.0945, longitude: 51.9238 },
  Kostanay: { latitude: 53.2144, longitude: 63.6246 },
  Kızılorda: { latitude: 44.8479, longitude: 65.4823 },
  Oral: { latitude: 51.2333, longitude: 51.3667 },
  Aktau: { latitude: 43.641, longitude: 51.198 },
};

/** Şehir merkezi koordinatı (bilinmeyen şehir → Almatı). */
export function cityCenter(city?: string): LatLng {
  return (city && CITY_COORDS[city]) || ALMATY;
}

/** İşletme/uzman için deterministik koordinat — sağlayıcının KENDİ şehrinin çevresi (demo). */
export function proCoords(id: string): LatLng {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const dlat = ((h % 1000) / 1000 - 0.5) * 0.09;
  const dlng = (((h >>> 10) % 1000) / 1000 - 0.5) * 0.13;
  const center = cityCenter(PROFESSIONALS.find((p) => p.id === id)?.city);
  return { latitude: center.latitude + dlat, longitude: center.longitude + dlng };
}

/** İki nokta arası mesafe (km, haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(R * 2 * Math.asin(Math.sqrt(x)) * 10) / 10;
}

// ── §12 Kampanyalar (keşif vitrini) ──────────────────────────────────────
export interface Campaign {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  category?: string;
  image: string;
  tone: string;
}

const adImg = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`;

// Çevrimdışı yedek (backend ulaşılamazsa)
export const CAMPAIGNS: Campaign[] = [
  {
    id: 'c1',
    title: 'Yaz saç bakımı',
    subtitle: 'Seçili salonlarda keratin & bakım',
    badge: '%25',
    category: 'hair',
    image: adImg('photo-1560066984-138dadb4c035'),
    tone: 'rose',
  },
  {
    id: 'c2',
    title: 'İlk randevuna özel',
    subtitle: 'AYNA’da ilk randevunda indirim',
    badge: '%20',
    image: adImg('photo-1522337660859-02fbefca4702'),
    tone: 'plum',
  },
  {
    id: 'c3',
    title: 'Tırnak günleri',
    subtitle: 'Kalıcı oje + nail art fırsatı',
    badge: '2+1',
    category: 'nails',
    image: adImg('photo-1604654894610-df63bc536371'),
    tone: 'gold',
  },
];

// ── Reklam banner'ları (premium üye kampanyaları) ────────────────────────
export interface AdBanner {
  id: string;
  proId: string;
  image: string;
  title: string;
  subtitle: string;
}

export const ADS: AdBanner[] = [
  {
    id: 'ad1',
    proId: '1',
    image: adImg('photo-1633681926022-84c23e8cb2d6'),
    title: 'Madina Studio',
    subtitle: 'Balayage’de %30 indirim · bu hafta',
  },
  {
    id: 'ad2',
    proId: '3',
    image: adImg('photo-1487412947147-5cebf100ffc2'),
    title: 'Ailin Makeup',
    subtitle: 'Gelin paketi + ücretsiz prova',
  },
  {
    id: 'ad3',
    proId: '4',
    image: adImg('photo-1540555700478-4be289fbecef'),
    title: 'Lotus Spa',
    subtitle: 'Cilt bakımında 2. seans hediye',
  },
  {
    id: 'ad4',
    proId: '15',
    image: adImg('photo-1522337660859-02fbefca4702'),
    title: 'Asel Hair Atelier',
    subtitle: 'İlk keratin bakımına %25',
  },
];

// ── İşletme detayı ───────────────────────────────────────────────────────
export interface ServiceItem {
  id: string;
  name: string; // TR (varsayılan); 3 dil için label kullan
  label?: Tri; // taksonomi 3-dil etiketi (ekranlar tri(label, locale) ile yerelleştirir)
  durationMin: number;
  price: number;
  // §6.E — popülerlik & şeffaflık (otomatik türetilir)
  popular?: boolean;
  discountPct?: number;
}

export interface ServiceRating {
  name: string;
  score: number | null;
}

export interface Review {
  id: string;
  author: string;
  period: string;
  rating: number;
  service: string;
  text: string;
  firstVisit: boolean;
  tags?: string[]; // §7.1 — alt kırılım (hizmet kalitesi / temizlik / iletişim / zamanlama)
  // §6.D/§7.2 — uzman/işletme tek yanıt hakkı (açılınca kalıcı; yanıt silinemez)
  reply?: string;
  // §7.2 — negatif yorum itirazı (admin kuyruğuna düşer; yorum görünür kalır)
  disputed?: boolean;
}

// §6.1/§7.1 — alt kırılım (hizmet kalitesi/temizlik/iletişim/zamanlama) özet çubukları
export type RatingBreakdown = { key: 'quality' | 'hygiene' | 'communication' | 'timing'; score: number };

export interface ProfessionalDetail extends Professional {
  staff: Uzman[];
  about: string;
  serviceRatings: ServiceRating[];
  services: ServiceItem[];
  portfolio: string[];
  reviews: Review[];
  // §6.1 — yıldız dağılımı [1★..5★ sayıları] + alt kırılım + sertifika + sosyal + bağlı salon
  starDist: number[];
  breakdown: RatingBreakdown[];
  certs: string[];
  social: { instagram: string; tiktok: string };
  salon?: { id: string; name: string };
}

// Sektör hizmet menüsü = MERKEZİ taksonomiden türetilir (tek kaynak). Ad = TR (varsayılan dil);
// kk/ru için ekranlar taxonomy.tri() ile yerelleştirir. Uzman kaydında fiyat/süre bunlardan.
const SECTOR_SERVICES: Record<string, ServiceItem[]> = Object.fromEntries(
  TAXONOMY.map((c) => [
    c.id,
    c.services.map((s) => ({
      id: s.id,
      name: tri(s.label, 'tr'),
      label: s.label,
      durationMin: s.durationMin,
      price: s.price,
      ...(s.popular ? { popular: true } : {}),
    })),
  ]),
);

const STAFF_NAMES: { name: string; role: string }[] = [
  { name: 'Madina', role: 'Renk uzmanı' },
  { name: 'Aigerim', role: 'Kesim & fön' },
  { name: 'Saule', role: 'Bakım & keratin' },
  { name: 'Kamila', role: 'Nail art' },
  { name: 'Asel', role: 'Cilt bakımı' },
];

const REVIEW_POOL: Omit<Review, 'id' | 'service'>[] = [
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
    reply: 'Güzel yorumun için teşekkürler! Seni yeniden ağırlamaktan mutluluk duyarız 💕',
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
  {
    author: 'Madina',
    period: '3–6 ay önce',
    rating: 4,
    text: 'Genel olarak iyiydi, küçük bir gecikme dışında sorun yoktu.',
    firstVisit: false,
  },
];

const portfolioImg = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&q=70`;

const PORTFOLIO_POOL = [
  'photo-1562322140-8baeececf3df',
  'photo-1595476108010-b4d1f102b1b1',
  'photo-1633681926022-84c23e8cb2d6',
  'photo-1521590832167-7bcbfaa6381f',
  'photo-1516975080664-ed2fc6a32937',
  'photo-1588776814546-1ffcf47267a5',
];

// §6.E — popülerlik & indirim otomatik (backend ile aynı deterministik kural)
function decorateServices(services: ServiceItem[], proId: string): ServiceItem[] {
  const seed = [...proId].reduce((a, c) => a + c.charCodeAt(0), 0);
  const discountIdx = seed % services.length;
  const discountPct = [10, 15, 20, 25][seed % 4]!;
  return services.map((s, i) => ({
    ...s,
    popular: i < 2,
    discountPct: i === discountIdx ? discountPct : 0,
  }));
}

export function getProfessionalDetail(id: string): ProfessionalDetail {
  const base = PROFESSIONALS.find((p) => p.id === id) ?? PROFESSIONALS[0]!;
  const idx = PROFESSIONALS.indexOf(base);
  const services = decorateServices(SECTOR_SERVICES[base.sector] ?? SECTOR_SERVICES.hair!, base.id);
  const staff: Uzman[] =
    base.kind === 'salon'
      ? STAFF_NAMES.slice(0, 3).map((s, i) => ({
          id: `${base.id}-u${i + 1}`,
          name: s.name,
          role: s.role,
          image: avatar(FACES[(idx + i) % FACES.length]!),
          rating: Math.round((4.6 + ((idx + i) % 4) * 0.1) * 10) / 10,
        }))
      : [];
  const serviceRatings: ServiceRating[] = services.slice(0, 4).map((s, i) => ({
    name: s.name,
    score: i === 3 ? null : Math.round((4.5 + (i % 5) * 0.1) * 10) / 10,
  }));
  const reviews: Review[] = REVIEW_POOL.slice(0, 4).map((r, i) => ({
    ...r,
    id: `${base.id}-r${i + 1}`,
    service: services[i % services.length]!.name,
  }));
  const portfolio = PORTFOLIO_POOL.map((p) => portfolioImg(p));
  // §6.1 — yıldız dağılımı: toplam yorumu 5★ ağırlıklı böl (deterministik)
  const rc = base.reviewCount;
  const starDist = [
    Math.round(rc * 0.01), // 1★
    Math.round(rc * 0.03), // 2★
    Math.round(rc * 0.07), // 3★
    Math.round(rc * 0.19), // 4★
    Math.max(0, rc - Math.round(rc * (0.01 + 0.03 + 0.07 + 0.19))), // 5★ (kalan)
  ];
  // §7.1 — alt kırılım: genel puana yakın, boyuta göre küçük sapmalı
  const dim = (off: number) => Math.max(4, Math.min(5, Math.round((base.rating + off) * 10) / 10));
  const breakdown: RatingBreakdown[] = [
    { key: 'quality', score: dim(0.1) },
    { key: 'hygiene', score: dim(0.2) },
    { key: 'communication', score: dim(-0.1) },
    { key: 'timing', score: dim(0) },
  ];
  const certs = ['photo-1584515933487-779824d29309', 'photo-1526045431048-f857369baa09'].map(portfolioImg);
  const social = { instagram: base.name.toLowerCase().replace(/\s+/g, '_'), tiktok: base.name.split(' ')[0]!.toLowerCase() };
  // §6.1 — bağımsız uzman bir salona bağlıysa bağlı salon gösterilir (mock: deterministik yarısı)
  const salonBase = PROFESSIONALS.find((p) => p.kind === 'salon' && p.id !== base.id);
  const salon =
    base.kind !== 'salon' && salonBase && idx % 2 === 0
      ? { id: salonBase.id, name: salonBase.name }
      : undefined;
  return {
    ...base,
    staff,
    about:
      'AYNA tarafından doğrulanmış, deneyimli ekip. Hijyen ve fiyat şeffaflığı önceliğimiz. Sonucun beklentine uygunluğunu garanti ederiz.',
    serviceRatings,
    services,
    portfolio,
    reviews,
    starDist,
    breakdown,
    certs,
    social,
    ...(salon ? { salon } : {}),
  };
}

// ── Randevular (store tohumu) ────────────────────────────────────────────
export type BookingSource = 'direct' | 'photo_quote' | 'demand';
export type BookingStatus =
  | 'confirmed'
  | 'pending'
  | 'completed'
  | 'cancelled'
  | 'awaiting_provider'
  | 'alternative_proposed'
  | 'deposit_pending' // §4.3 — uzman kabul etti, kullanıcı depozito+dekont yükleyecek
  | 'deposit_submitted' // dekont yüklendi, uzman onayı bekleniyor
  | 'refund_pending' // §4.4 — serbest iptal: uzman iade dekontu yükleyecek
  | 'refund_submitted' // iade dekontu yüklendi, kullanıcı "aldım" onayı bekleniyor
  | 'disputed' // §4.4 — itiraz açıldı (destek/admin kuyruğu)
  | 'reassigned_pending' // §4.5 — uzman ayrıldı, yeni uzman atandı; kullanıcı yeniden onaylayacak
  | 'no_show'
  | 'waitlist';

// §4.3 — depozito/kapora tutarı. PARAMETRİK (admin panel §3.4); şimdilik sabit.
export const DEPOSIT_KZT = 1000;
// §4.4 — serbest iptal penceresi (bundan fazla süre varsa depozito iade edilir). Parametrik.
export const FREE_CANCEL_WINDOW_MS = 3 * 60 * 60_000;
// §4.3 — dekont yükleme süresi: normalde 3 saat; randevuya 6 saatten az varsa 1 saat. Parametrik.
export const DEPOSIT_RECEIPT_WINDOW_MS = 3 * 60 * 60_000;
export const DEPOSIT_RECEIPT_SHORT_MS = 1 * 60 * 60_000;
export const DEPOSIT_SHORT_THRESHOLD_MS = 6 * 60 * 60_000;
// §4.1 adım 6 — randevu hatırlatma pencereleri (24 saat + 2 saat önce). Parametrik.
export const REMIND_24H_MS = 24 * 60 * 60_000;
export const REMIND_2H_MS = 2 * 60 * 60_000;
// §4.1.3 — uzman yanıt penceresi: bu süre içinde yanıtlanmayan talep otomatik düşer. Parametrik.
export const RESPONSE_WINDOW_MS = 6 * 60 * 60_000;

export interface Appointment {
  id: string;
  source: BookingSource;
  service: string; // ne için
  proId: string;
  proName: string;
  proImage: string;
  uzmanName?: string; // hangi uzmandan
  customerName?: string; // §2.2 offline randevuda müşteri adı
  customerPhone?: string; // offline/salon randevusunda müşteri telefonu (koordinasyon için)
  bookingKind?: string; // normal | group | express (Faz 3)
  groupSize?: number; // grup randevuda kişi sayısı
  startMs: number; // randevu başlangıcı — UTC epoch ms (Faz 2 gerçek slot modeli)
  durationMin: number; // hizmet süresi (dk) — slot motoru buna dayanır (§4.2)
  proposedStartMs?: number; // uzmanın önerdiği alternatif başlangıç (§1.6)
  depositAmount?: number; // §4.3 — beklenen depozito (₸)
  depositDeadline?: number; // §4.3 — dekont son yükleme anı (UTC ms); geçilirse randevu düşer
  receiptUri?: string; // §4.3 — yüklenen dekont görseli
  refundReceiptUri?: string; // §4.4 — uzmanın yüklediği iade dekontu
  depositForfeited?: boolean; // §4.4 — geç iptal/no-show: kapora uzmanda kaldı
  providerNoShow?: boolean; // §4.4-b — uzman gelmedi: müşteriye 1000 puan telafi verildi
  responseDeadline?: number; // §4.1.3 — uzman yanıt son anı (UTC ms); geçilirse talep düşer
  respondedAt?: number; // §9.2 — uzmanın yanıt verdiği an (UTC ms); ortalama yanıt süresi metriği
  reminded24?: boolean; // §4.1 — 24 saat hatırlatması gönderildi
  reminded2?: boolean; // §4.1 — 2 saat hatırlatması gönderildi
  reassignedFrom?: string; // §4.5 — ayrılan uzmanın adı (yeni uzman uzmanName'de)
  providerSignal?: 'up' | 'down'; // §7.3 — uzmanın kullanıcıya GİZLİ sinyali (kamuya kapalı)
  customerTrusted?: boolean; // §7.3 — POZİTİF rozet: yüksek tamamlanma oranlı "Güvenilir müşteri" (negatif asla)
  // §10 gizlilik — SALONUN uzman için aldığı offline randevu. Yalnız bunlar salon panelinde görünür;
  // uzmanın kendi (app/offline) randevuları ve TÜM para bilgisi salonla PAYLAŞILMAZ (uzmanın şahsi alanı).
  bySalon?: boolean;
  price: number; // kaç paraya
  status: BookingStatus;
  cancelReason?: string; // §6.C — "neden gelemiyorum"
  reviewed?: boolean;
}

// Seed başlangıç anı (modül yüklenirken sabitlenir) — göreli slot'lar buna göre.
const SEED_NOW = Date.now();

export const SEED_APPOINTMENTS: Appointment[] = [
  {
    id: 'a1',
    source: 'direct',
    service: 'Saç kesimi & fön',
    proId: '1',
    proName: 'Madina Studio',
    proImage: PROFESSIONALS[0]!.image,
    uzmanName: 'Aigerim',
    startMs: almatySlotMs(SEED_NOW, 3, 14, 0),
    durationMin: 60,
    price: 9000,
    status: 'confirmed',
    // §9.2 — yanıt süresi metriği demo verisi: 18 dk'da yanıtlandı
    responseDeadline: SEED_NOW - 3 * 24 * 60 * 60_000 + RESPONSE_WINDOW_MS,
    respondedAt: SEED_NOW - 3 * 24 * 60 * 60_000 + 18 * 60_000,
  },
  {
    id: 'a2',
    source: 'direct',
    service: 'Cilt bakımı',
    proId: '4',
    proName: 'Lotus Spa',
    proImage: PROFESSIONALS[3]!.image,
    uzmanName: 'Saule', // §7.1 salon randevusu → uzman puanlaması için uzman adı zorunlu
    startMs: almatySlotMs(SEED_NOW, -7, 16, 0),
    durationMin: 90,
    price: 18000,
    status: 'completed',
    reviewed: false,
    // §9.2 — yanıt süresi metriği demo verisi: 42 dk'da yanıtlandı
    responseDeadline: SEED_NOW - 8 * 24 * 60 * 60_000 + RESPONSE_WINDOW_MS,
    respondedAt: SEED_NOW - 8 * 24 * 60 * 60_000 + 42 * 60_000,
  },
  {
    id: 'a3',
    source: 'photo_quote',
    service: 'Balayage (fotoğraflı teklif)',
    proId: '3',
    proName: 'Ailin Makeup',
    proImage: PROFESSIONALS[2]!.image,
    startMs: almatySlotMs(SEED_NOW, 6, 11, 0),
    durationMin: 150,
    price: 21000,
    status: 'pending',
  },
  {
    id: 'a4',
    source: 'demand',
    service: 'Gelin makyajı (talep)',
    proId: '2',
    proName: 'Aruzhan Beauty',
    proImage: PROFESSIONALS[1]!.image,
    startMs: almatySlotMs(SEED_NOW, 4, 9, 0),
    durationMin: 120,
    price: 18000,
    status: 'confirmed',
    customerTrusted: true, // §7.3 — pozitif rozet demo
  },
  {
    id: 'a5',
    source: 'direct',
    service: 'Manikür',
    proId: '6',
    proName: 'Bella Nails',
    proImage: PROFESSIONALS[5]!.image,
    uzmanName: 'Kamila',
    startMs: almatySlotMs(SEED_NOW, -24, 13, 0),
    durationMin: 60,
    price: 6000,
    status: 'completed',
    reviewed: true,
  },
  {
    // §4.3/§9.2 — dekont yüklendi, UZMAN onayı bekliyor (dashboard "bekleyen dekont" sayacı)
    id: 'a6',
    source: 'direct',
    service: 'Saç boyama (kök)',
    proId: '1',
    proName: 'Madina Studio',
    proImage: PROFESSIONALS[0]!.image,
    uzmanName: 'Aigerim',
    startMs: almatySlotMs(SEED_NOW, 1, 12, 0),
    durationMin: 90,
    price: 15000,
    status: 'deposit_submitted',
    depositAmount: 1000,
    receiptUri: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80',
  },
  {
    // §10 — SALONUN Aigerim için aldığı offline randevu (uzman onayı bekliyor)
    id: 'sof-seed-1',
    source: 'direct',
    service: 'Saç kesimi & fön',
    proId: '',
    proName: 'Glamour Salon',
    proImage: '',
    uzmanName: 'Aigerim',
    customerName: 'Dilnaz S.',
    customerPhone: '+7 701 234 56 78',
    startMs: almatySlotMs(SEED_NOW, 2, 15, 0),
    durationMin: 60,
    price: 9000,
    status: 'awaiting_provider',
    bySalon: true,
  },
  {
    // §10 — SALONUN Madina için aldığı offline randevu (uzman onayladı)
    id: 'sof-seed-2',
    source: 'direct',
    service: 'Saç boyama',
    proId: '',
    proName: 'Glamour Salon',
    proImage: '',
    uzmanName: 'Madina',
    customerName: 'Ayana K.',
    customerPhone: '+7 702 345 67 89',
    startMs: almatySlotMs(SEED_NOW, 3, 11, 0),
    durationMin: 90,
    price: 15000,
    status: 'confirmed',
    bySalon: true,
  },
];

// §5.6 — kullanıcı adresleri (çoklu: ev/iş). "Sana Yakın" ve mesafe için (§3.2 C).
export type AddressLabel = 'home' | 'work';
export interface UserAddress {
  id: string;
  label: AddressLabel;
  detail: string;
}

// ── Circle (topluluk) ────────────────────────────────────────────────────
export type CirclePostType = 'recommend' | 'asking' | 'experience';
export interface CircleComment {
  id: string;
  author: string;
  anonymous: boolean;
  text: string;
}
export interface CirclePost {
  id: string;
  type: CirclePostType;
  category: string;
  author: string;
  anonymous: boolean;
  text: string;
  helpful: number;
  helpfulByMe?: boolean;
  comments: CircleComment[];
}

export const SEED_CIRCLE_POSTS: CirclePost[] = [
  {
    id: 'c1',
    type: 'recommend',
    category: 'Saç',
    author: 'Dana',
    anonymous: false,
    text: 'Madina Studio’da balayage yaptırdım, sonuç referansın birebir aynısı oldu. Gönül rahatlığıyla öneririm.',
    helpful: 24,
    comments: [
      { id: 'c1-1', author: 'Aizhan', anonymous: false, text: 'Fiyat aralığı nasıldı?' },
      {
        id: 'c1-2',
        author: 'Dana',
        anonymous: false,
        text: 'Balayage 28.000 ₸ civarıydı, çok memnunum.',
      },
    ],
  },
  {
    id: 'c2',
    type: 'asking',
    category: 'Makyaj',
    author: 'Doğrulanmış üye',
    anonymous: true,
    text: 'Almatı’da gelin makyajı için güvenilir bir uzman arıyorum. Evime gelebilen biri ideal olur.',
    helpful: 8,
    comments: [
      {
        id: 'c2-1',
        author: 'Gulnara',
        anonymous: false,
        text: 'Ailin Makeup eve geliyor, çok başarılı.',
      },
    ],
  },
  {
    id: 'c3',
    type: 'experience',
    category: 'Tırnak',
    author: 'Aigerim',
    anonymous: false,
    text: 'Kalıcı ojede hijyene çok dikkat eden bir yer buldum. Sterilizasyonu gözümün önünde yaptılar.',
    helpful: 17,
    comments: [],
  },
];

// ── Bakım rutinleri (store tohumu) ───────────────────────────────────────
export interface CareRoutine {
  id: string;
  name: string;
  icon: string;
  dueDays: number; // <0 gecikmiş, 0 bugün
  periodDays: number; // bakım döngüsü — "tamamladım" sayacı buna göre yeniden başlar
  categoryCode?: string; // §5.4.5 — "Teklif Al" kategoriyi otomatik seçsin (nails, hair…)
}

export const SEED_CARE_ROUTINES: CareRoutine[] = [
  { id: 'cr1', name: 'Kalıcı oje yenileme', icon: 'color-palette-outline', dueDays: 2, periodDays: 15, categoryCode: 'nails' },
  { id: 'cr2', name: 'Saç dip boyası', icon: 'cut-outline', dueDays: -3, periodDays: 42, categoryCode: 'hair' },
  { id: 'cr3', name: 'Cilt bakımı', icon: 'sparkles-outline', dueDays: 9, periodDays: 30, categoryCode: 'skincare' },
  { id: 'cr4', name: 'Lazer epilasyon seansı', icon: 'flash-outline', dueDays: 0, periodDays: 30, categoryCode: 'epilation' },
];

// ── Kişisel kayıtlar (kullanıcının kendi girdiği — pazaryeri değil) ──────
export type PersonalTone = 'rose' | 'sage' | 'lavender' | 'blue';
export interface PersonalLog {
  id: string;
  title: string;
  dateLabel: string;
  icon: string;
  tone: PersonalTone;
  note?: string;
  kind?: QuickAddKind; // düzenleme ekranında tür çipini geri yükleyebilmek için
  dateMs?: number; // düzenlemede tarih seçiciyi doğru tarihe açmak için (epoch)
}

export const SEED_PERSONAL_LOGS: PersonalLog[] = [
  {
    id: 'pl1',
    title: 'Pilates dersi',
    dateLabel: 'Bugün · 18:30',
    icon: 'barbell-outline',
    tone: 'sage',
  },
  {
    id: 'pl2',
    title: 'Jinekolog kontrolü',
    dateLabel: '12 Tem · 10:00',
    icon: 'medkit-outline',
    tone: 'rose',
  },
  {
    id: 'pl3',
    title: 'Diş hekimi',
    dateLabel: '20 Tem · 14:00',
    icon: 'happy-outline',
    tone: 'lavender',
  },
];

// Hızlı ekle türleri (Benim İçin → ekleme akışı)
export type QuickAddKind = 'doctor' | 'gym' | 'personal' | 'reminder';
export interface QuickAdd {
  id: QuickAddKind;
  labelKey: MessageKey;
  icon: string;
  tone: PersonalTone;
}

export const QUICK_ADD: QuickAdd[] = [
  { id: 'doctor', labelKey: 'record.doctor', icon: 'medkit-outline', tone: 'rose' },
  { id: 'gym', labelKey: 'record.gym', icon: 'barbell-outline', tone: 'sage' },
  { id: 'personal', labelKey: 'record.personal', icon: 'calendar-outline', tone: 'lavender' },
  { id: 'reminder', labelKey: 'record.reminder', icon: 'notifications-outline', tone: 'blue' },
];

export const quickAddMeta = (kind: QuickAddKind): QuickAdd =>
  QUICK_ADD.find((q) => q.id === kind) ?? QUICK_ADD[0]!;

// ── AYNA Life — pratik bilgiler (tam içerikli) ───────────────────────────
export interface LifeArticle {
  id: string;
  tag: string;
  title: string;
  readMin: number;
  image: string;
  excerpt: string;
  body: string[];
  categoryCode?: string | null; // §12.6 — yazıya bağlı kategori → "Teklif al" CTA
}

const lifeImg = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`;

export const LIFE_ARTICLES: LifeArticle[] = [
  {
    id: 'la1',
    tag: 'Sağlık',
    title: 'Jinekolojik muayeneye nasıl hazırlanılır?',
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
    id: 'la2',
    tag: 'Bakım',
    title: 'Saç boyatmadan önce bilmen gereken 5 şey',
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
    id: 'la3',
    tag: 'Para',
    title: 'Kişisel bakım bütçesi nasıl kurulur?',
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
    id: 'la4',
    tag: 'Kariyer',
    title: 'Maaş görüşmesi için 5 pratik ipucu',
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
    id: 'la5',
    tag: 'Wellness',
    title: 'Yoğun günde 10 dakikalık nefes molası',
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

export const getArticle = (id: string): LifeArticle | undefined =>
  LIFE_ARTICLES.find((a) => a.id === id);

// ── Özel günler (store tohumu) ───────────────────────────────────────────
export interface Moment {
  id: string;
  title: string;
  icon: string;
  dateLabel: string;
  daysLeft: number;
}

export const SEED_MOMENTS: Moment[] = [
  { id: 'm1', title: 'Dana’nın doğum günü', icon: 'gift-outline', dateLabel: '7 Tem', daysLeft: 8 },
  {
    id: 'm2',
    title: 'Evlilik yıl dönümü',
    icon: 'heart-outline',
    dateLabel: '22 Tem',
    daysLeft: 23,
  },
  { id: 'm3', title: 'Arkadaş düğünü', icon: 'flower-outline', dateLabel: '3 Ağu', daysLeft: 35 },
];

// ── Birleşik takvim (randevu + özel gün + bakım) ─────────────────────────
export type EventKind = 'appointment' | 'moment' | 'care';
export interface UpcomingEvent {
  id: string;
  refId: string;
  kind: EventKind;
  title: string;
  subtitle: string;
  icon: string;
  inDays: number;
  tone: 'rose' | 'gold';
}

function whenShort(days: number): string {
  if (days <= 0) return 'Bugün';
  if (days === 1) return 'Yarın';
  return `${days} gün`;
}
export { whenShort };

/** Randevu + özel gün + bakım hatırlatmalarını tek takvim akışında birleştirir. */
export function buildUpcomingEvents(
  appts: Appointment[],
  moments: Moment[],
  routines: CareRoutine[],
): UpcomingEvent[] {
  const now = Date.now();
  const a: UpcomingEvent[] = appts
    .filter((x) => x.status === 'confirmed' || x.status === 'pending')
    .map((x) => ({
      id: `ap-${x.id}`,
      refId: x.id,
      kind: 'appointment',
      title: x.service,
      subtitle: `${x.proName} · ${formatSlotTr(x.startMs)}`,
      icon: 'calendar',
      inDays: daysUntil(x.startMs, now),
      tone: 'rose',
    }));
  const m: UpcomingEvent[] = moments.map((x) => ({
    id: `mo-${x.id}`,
    refId: x.id,
    kind: 'moment',
    title: x.title,
    subtitle: `Özel gün · ${x.dateLabel}`,
    icon: x.icon,
    inDays: x.daysLeft,
    tone: 'gold',
  }));
  const c: UpcomingEvent[] = routines
    .filter((x) => x.dueDays >= 0)
    .map((x) => ({
      id: `ca-${x.id}`,
      refId: x.id,
      kind: 'care',
      title: x.name,
      subtitle: `Bakım · ${whenShort(x.dueDays)}`,
      icon: x.icon,
      inDays: x.dueDays,
      tone: 'rose',
    }));
  return [...a, ...m, ...c].sort((x, y) => x.inDays - y.inDays);
}

// (Eski statik INCOMING_QUOTES + demand/results ekranı kaldırıldı — teklifler artık
//  store'daki gerçek DemandRequest.offers'tan gelir; bkz. §5.2 quote/results.)

// ── Teklif/Talep akışı (reverse marketplace çekirdeği §5.2) ──────────────
export type DemandMode = 'photo' | 'describe';
export type DemandStatus = 'collecting' | 'expired' | 'booked';

export interface DemandOffer {
  id: string;
  proId: string;
  proName: string;
  proImage: string;
  rating: number;
  reviewCount: number;
  distanceKm: number;
  price: number;
  etaMin: number; // tahmini süre (dk)
  note?: string; // uzmanın kısa notu
  slots: number[]; // uzmanın önerdiği 2-3 müsait başlangıç (UTC ms)
}

export interface DemandRequest {
  id: string;
  mode: DemandMode;
  category: string;
  // §5.2/§9.3 — teklif hakkı aynı şehirdeki TÜM uzmanlarda; Talepler sekmesi ŞEHRE göre filtrelenir.
  city: string;
  note?: string; // Mod 2 açıklama
  photoUrl?: string;
  budget?: number; // Mod 2 bütçe (₸)
  collectMin: number; // teklif toplama süresi (dk)
  serviceId?: string; // opsiyonel alt hizmet (taksonomi) — talebi spesifikleştirir
  // §privacy — yalnızca yakın salon sıralaması için kullanıcı adresi; UZMANA ASLA GÖSTERİLMEZ
  addressId?: string;
  createdAt: number;
  expiresAt: number;
  status: DemandStatus;
  offers: DemandOffer[];
  bookedOfferId?: string;
  // §7.3 — POZİTİF rozet: yüksek tamamlanma oranındaki kullanıcı "Güvenilir müşteri" (var/yok).
  // Negatif sinyal ASLA gösterilmez; kullanıcı puanı uzmana açılmaz.
  trusted?: boolean;
  seeded?: boolean; // uzman "Talepler" havuzu için tohum talep (kullanıcının Taleplerim'inde görünmez)
}

// §5.2 — teklif toplama süresi seçenekleri (dk): 1s / 3s / 12s / 24s. Varsayılan 3s.
export const COLLECT_OPTIONS = [60, 180, 720, 1440] as const;
export const COLLECT_DEFAULT = 180;

// Kategori bazlı tahmini süre (dk) — teklif üretiminde kullanılır (mock; admin panelde tanımlı olacak)
const CAT_ETA: Record<string, number> = {
  hair: 90,
  nails: 60,
  brows: 45,
  lashes: 120,
  makeup: 90,
  skincare: 60,
  spa: 90,
  epilation: 60,
  pmu: 120,
  bridal: 180,
  wellness: 60,
  style: 90,
};

const OFFER_NOTES = [
  'Bu iş için ideal ürünlerim mevcut, memnun kalacaksın.',
  'Benzer çalışmalarımı profilimde görebilirsin.',
  'İlk randevuya özel küçük bir ikramım olacak.',
];

// Deterministik teklif üretimi: aynı şehirdeki kategori uzmanlarından mock teklifler (§5.2)
export function buildOffers(category: string, city: string, budget: number | undefined, nowMs: number): DemandOffer[] {
  const sameCity = PROFESSIONALS.filter((p) => p.sector === category && p.city === city);
  const byCat = sameCity.length ? sameCity : PROFESSIONALS.filter((p) => p.sector === category);
  const pool = (byCat.length ? byCat : PROFESSIONALS).slice(0, 5);
  const eta = CAT_ETA[category] ?? 60;
  return pool.map((p, i) => {
    const base = budget && budget > 0 ? budget : p.priceFrom;
    const price = Math.max(1000, Math.round((base * (0.85 + 0.08 * i)) / 500) * 500);
    // 3 müsait başlangıç önerisi (deterministik, Almatı saati)
    const slots = [
      almatySlotMs(nowMs, i + 1, 11 + (i % 3), 0),
      almatySlotMs(nowMs, i + 2, 14, 30),
      almatySlotMs(nowMs, i + 2, 16, 0),
    ];
    return {
      id: `of-${p.id}`,
      proId: p.id,
      proName: p.name,
      proImage: p.image,
      rating: p.rating,
      reviewCount: p.reviewCount,
      distanceKm: 1 + ((i * 2) % 8),
      price,
      etaMin: eta,
      ...(i % 2 === 1 ? { note: OFFER_NOTES[i % OFFER_NOTES.length] } : {}),
      slots,
    };
  });
}

export type OfferSort = 'recommended' | 'price' | 'distance' | 'rating';

// §5.2 — varsayılan "Önerilen": puan ağırlıklı + makul fiyat + yakınlık dengeli skor
export function sortOffers(offers: DemandOffer[], by: OfferSort): DemandOffer[] {
  const arr = [...offers];
  if (by === 'price') return arr.sort((a, b) => a.price - b.price);
  if (by === 'distance') return arr.sort((a, b) => a.distanceKm - b.distanceKm);
  if (by === 'rating') return arr.sort((a, b) => b.rating - a.rating);
  const score = (o: DemandOffer) => o.rating * 20 - o.distanceKm * 2 - o.price / 2000;
  return arr.sort((a, b) => score(b) - score(a));
}

// Uzman "Talepler" havuzu — şehirdeki açık talepler (mock; gerçekte diğer kullanıcılardan)
const DM_NOW = Date.now();
export const SEED_DEMANDS: DemandRequest[] = [
  {
    id: 'dm-seed-1',
    mode: 'describe',
    category: 'hair',
    city: 'Almatı',
    note: 'Düğün için topuz ve saç tasarımı istiyorum, öğleden sonra müsaitim.',
    budget: 20000,
    collectMin: 180,
    createdAt: DM_NOW,
    expiresAt: DM_NOW + 150 * 60_000,
    status: 'collecting',
    offers: buildOffers('hair', 'Almatı', 20000, DM_NOW).slice(0, 2),
    trusted: true, // §7.3 — yüksek tamamlanma oranlı kullanıcı (pozitif rozet demo)
    seeded: true,
  },
  {
    id: 'dm-seed-2',
    mode: 'photo',
    category: 'nails',
    city: 'Almatı',
    collectMin: 720,
    createdAt: DM_NOW,
    expiresAt: DM_NOW + 400 * 60_000,
    status: 'collecting',
    offers: buildOffers('nails', 'Almatı', undefined, DM_NOW).slice(0, 1),
    seeded: true,
  },
  {
    id: 'dm-seed-3',
    mode: 'describe',
    category: 'lashes',
    city: 'Almatı',
    note: 'Klasik ipek kirpik, ilk kez yaptıracağım.',
    budget: 12000,
    collectMin: 180,
    createdAt: DM_NOW,
    expiresAt: DM_NOW + 60 * 60_000,
    status: 'collecting',
    offers: [],
    seeded: true,
  },
];

// ── §10.1/§5.1.6 Promosyon (Fırsatlar vitrini içeriği) — premium salon/uzman üretir ────
// §12.7 — her promosyon admin onayına düşer; onaylanınca kullanıcı tarafı Fırsatlar'da yayınlanır.
export type PromotionStatus = 'pending' | 'live' | 'rejected' | 'expired';
export interface Promotion {
  id: string;
  title: string;
  desc: string;
  discountPct?: number; // ops. indirim yüzdesi (rozet)
  startLabel: string; // gösterim tarih etiketi (TR)
  endLabel: string;
  imageUri?: string;
  status: PromotionStatus;
  createdAt: number;
}

const PROMO_NOW = Date.now();
export const SEED_PROMOTIONS: Promotion[] = [
  {
    id: 'promo-seed-1',
    title: 'Kışa özel saç bakımı',
    desc: 'Keratin bakım + fön ilk 20 randevuda indirimli.',
    discountPct: 25,
    startLabel: '5 Tem',
    endLabel: '31 Tem',
    status: 'live',
    createdAt: PROMO_NOW - 12 * 86_400_000,
  },
  {
    id: 'promo-seed-2',
    title: 'Yeni müşteriye ilk manikür',
    desc: 'İlk kez gelen misafirlere jel manikürde özel fiyat.',
    discountPct: 15,
    startLabel: '10 Tem',
    endLabel: '20 Tem',
    status: 'pending',
    createdAt: PROMO_NOW - 9 * 86_400_000,
  },
];

// ── Tedarikçi reklamları (YENİ) — uzman/salon paneli orta alanı ──────────
// Uzmanın sektörüne göre malzeme/ürün satan firmaların reklamları. Admin panelinden
// yüklenir ve sektör/şehir kırılımıyla ilgili uzman/salon panellerine hedeflenir.
export interface SupplierAd {
  id: string;
  brand: string; // tedarikçi firma
  title: string;
  subtitle: string;
  ctaLabel: string;
  tone: 'rose' | 'plum' | 'teal';
  icon: string; // Ionicon adı
  sector?: string; // hedef sektör (taxonomy kategori id); boşsa tüm sektörler
  city?: string; // hedef şehir; boşsa tüm şehirler
  imageUri?: string;
  // Kampanya detay sayfası (§5.1.6 sponsorlu firma)
  description?: string; // kampanya açıklaması
  offer?: string; // öne çıkan teklif rozeti (ör. "%20 indirim")
  contact?: string; // iletişim (telefon/WhatsApp)
  perks?: string[]; // kampanya avantaj maddeleri
}

export const SEED_SUPPLIER_ADS: SupplierAd[] = [
  {
    id: 'ad-1',
    brand: 'Almaty Beauty Supply',
    title: 'Profesyonel saç bakım ürünleri',
    subtitle: 'Salonlara özel toptan fiyatlar',
    ctaLabel: 'İncele',
    tone: 'plum',
    icon: 'cut',
    sector: 'hair',
    city: 'Almatı',
    imageUri: adImg('photo-1560066984-138dadb4c035'),
    offer: 'Salonlara %25 toptan indirim',
    description:
      'Kazakistan’ın önde gelen profesyonel saç bakım tedarikçisi. Keratin, boya, bakım ve şekillendirme ürünlerinde salon hesaplarına özel toptan fiyat. Almatı içi aynı gün teslimat.',
    perks: ['İlk siparişte %25 indirim', 'Almatı içi ücretsiz teslimat', 'Kurumsal fatura + kredili ödeme'],
    contact: '+7 727 350 10 20',
  },
  {
    id: 'ad-2',
    brand: 'NailPro KZ',
    title: 'Jel & kalıcı oje setleri',
    subtitle: 'Yeni koleksiyon %20 indirimli',
    ctaLabel: 'Kataloğa bak',
    tone: 'rose',
    icon: 'color-palette',
    sector: 'nails',
    imageUri: adImg('photo-1604654894610-df63bc536371'),
    offer: 'Yeni koleksiyon %20 indirim',
    description:
      'Manikür & tırnak stüdyoları için jel, kalıcı oje, aparat ve tek kullanımlık malzeme. 300+ renk yeni sezon koleksiyonu profesyonel hesaplara özel fiyatla.',
    perks: ['Yeni sezon %20 indirim', '300+ renk stokta', 'Uzmanlara ücretsiz numune paketi'],
    contact: '+7 727 350 20 30',
  },
  {
    id: 'ad-3',
    brand: 'Derma Studio Pro',
    title: 'Cilt bakımı cihaz ve serumları',
    subtitle: 'Uzman fiyatlarıyla, hızlı teslimat',
    ctaLabel: 'İncele',
    tone: 'teal',
    icon: 'sparkles',
    sector: 'skincare',
    imageUri: adImg('photo-1487412947147-5cebf100ffc2'),
    offer: '2 alana 1 serum hediye',
    description:
      'Cilt bakımı uzmanları için profesyonel cihaz, peeling ve serum. CE sertifikalı cihazlarda 24 ay garanti; uzman eğitimi dahil.',
    perks: ['2 cihaza 1 serum hediye', '24 ay cihaz garantisi', 'Ücretsiz uygulama eğitimi'],
    contact: '+7 727 350 30 40',
  },
];

// ── Sadakat: kazanım/harcama defteri + çekiliş + ödüller ─────────────────
// §8.2 — çekiliş bilet maliyeti + puan harcama tavanı. PARAMETRİK (admin panel).
export const RAFFLE_COST = 500;
export const POINTS_SPEND_CAP_PCT = 50; // bir ödemenin en fazla %50'si puanla
export const POINTS_EXPIRY_MONTHS = 12; // 12 ay hareketsizse yanar
// §2/§5.6.2 — kullanıcı premium aylık bedeli. PARAMETRİK (admin panel).
export const PREMIUM_PRICE_KZT = 999;
export type LedgerKind = 'earn' | 'spend';
export interface LedgerEntry {
  id: string;
  kind: LedgerKind;
  labelKey: MessageKey;
  detail: string;
  points: number; // earn pozitif, spend negatif
  dateLabel: string;
}

export const SEED_LEDGER: LedgerEntry[] = [
  {
    id: 'le1',
    kind: 'earn',
    labelKey: 'rewards.earn.booking',
    detail: 'Lotus Spa · Cilt bakımı',
    points: 180,
    dateLabel: 'Geçen hafta',
  },
  {
    id: 'le2',
    kind: 'earn',
    labelKey: 'rewards.earn.review',
    detail: 'Bella Nails',
    points: 40,
    dateLabel: 'Geçen ay',
  },
  {
    id: 'le3',
    kind: 'earn',
    labelKey: 'rewards.earn.referral',
    detail: 'Dana katıldı',
    points: 120,
    dateLabel: 'Geçen ay',
  },
];

export interface Reward {
  id: string;
  titleKey: MessageKey;
  cost: number;
  icon: string;
}

export const REWARDS: Reward[] = [
  { id: 'rw1', titleKey: 'rewards.redeem.discount', cost: 200, icon: 'pricetag-outline' },
  { id: 'rw2', titleKey: 'rewards.redeem.addon', cost: 150, icon: 'add-circle-outline' },
  { id: 'rw3', titleKey: 'rewards.redeem.raffle', cost: 100, icon: 'ticket-outline' },
  { id: 'rw4', titleKey: 'rewards.redeem.premium', cost: 500, icon: 'star-outline' },
];

// ── Bildirimler (store tohumu) ───────────────────────────────────────────
export type NotificationType = 'booking' | 'quote' | 'loyalty' | 'circle' | 'system';
export interface AppNotification {
  id: string;
  type: NotificationType;
  // §14.5 — uygulama-üretimi bildirimler i18n anahtarı + params ile (render anında 3 dilde çözülür);
  // seed/duyuru gibi dinamik metinler doğrudan title/body kullanır.
  titleKey?: MessageKey;
  bodyKey?: MessageKey;
  params?: Record<string, string | number>;
  title?: string;
  body?: string;
  dateLabel: string;
  icon: string;
  read: boolean;
  // §9.1/§10 — hedef kitle: 'user' müşteri modunda, 'seller' uzman/salon panelinde görünür.
  // Tanımsız = ortak (her iki modda görünür; sistem/duyuru bildirimleri).
  audience?: 'user' | 'seller';
  // Tıklanınca gidilecek ekran (yoksa türe göre varsayılan kullanılır)
  route?: string;
  // §5.7 — oluşturulma zamanı (ms); 30 günden eski bildirimler otomatik temizlenir.
  // Seed'lerde yok (demo kalıcı); gerçek bildirimler push anında damgalanır.
  createdAt?: number;
}

// §5.7 — bildirim otomatik temizlik penceresi
export const NOTIFICATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Bildirim türüne göre varsayılan hedef ekran
export const NOTIFICATION_ROUTE: Record<NotificationType, string | null> = {
  booking: '/bookings',
  quote: '/bookings', // §5.3 Taleplerim (belirli talep varsa bildirimin kendi route'u kullanılır)
  loyalty: '/rewards',
  circle: '/circle',
  system: null,
};

export const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    type: 'booking',
    title: 'Randevun onaylandı',
    body: 'Madina Studio · Cuma 14:00 · Saç kesimi & fön',
    dateLabel: '2 saat önce',
    icon: 'calendar-outline',
    read: false,
    route: '/booking/a1',
  },
  {
    id: 'n2',
    type: 'quote',
    title: 'Yeni teklif geldi',
    body: 'Talebine işletmeler teklif verdi.',
    dateLabel: 'Dün',
    icon: 'pricetags-outline',
    read: false,
    route: '/quote/results?id=dm-seed-1',
  },
  {
    id: 'n3',
    type: 'loyalty',
    title: '180 puan kazandın',
    body: 'Lotus Spa randevun tamamlandı.',
    dateLabel: '3 gün önce',
    icon: 'gift-outline',
    read: true,
  },
  {
    id: 'n4',
    type: 'circle',
    title: 'Gönderine yorum',
    body: 'Aizhan: "Fiyat aralığı nasıldı?"',
    dateLabel: '4 gün önce',
    icon: 'chatbubble-outline',
    read: true,
    route: '/circle/c1',
  },
];

// ── Yardım & SSS ─────────────────────────────────────────────────────────
export interface Faq {
  id: string;
  q: string;
  a: string;
}

export const FAQ: Faq[] = [
  {
    id: 'f1',
    q: 'Randevumu nasıl iptal ederim?',
    a: 'Randevular sekmesinden ilgili randevuya dokun, ardından “İptal et”i seç. İşletme onayından önce iptal ücretsizdir.',
  },
  {
    id: 'f2',
    q: 'Fotoğrafla teklif nasıl çalışır?',
    a: 'Bir fotoğraf ve kategori paylaş; o kategorideki işletmeler sana fiyat ve süre teklifi gönderir. Puanı ve fiyatı kıyaslayıp seçersin.',
  },
  {
    id: 'f3',
    q: 'Puanları nasıl kazanır ve kullanırım?',
    a: 'Uygulama üzerinden tamamlanan her randevu, değerlendirme ve davet puan kazandırır. Puanları indirim, ekstra hizmet veya çekiliş için kullanabilirsin.',
  },
  {
    id: 'f4',
    q: 'Adresim işletmeyle paylaşılır mı?',
    a: 'Hayır. Adresin yalnızca sana en yakın salonları ve mesafeyi göstermek için kullanılır; hiçbir işletme veya uzmanla paylaşılmaz — randevunu onaylasan bile. Randevu onaylanınca gitmen için SALONUN adresi sana gösterilir.',
  },
  {
    id: 'f5',
    q: 'Yorumum anonim kalır mı?',
    a: 'Anonim yorum bırakırsan, işletme ve uzman yorum sahibinin kimliğini göremez.',
  },
];

// ── Seller (işletme paneli) ──────────────────────────────────────────────
export interface SellerMetric {
  id: string;
  labelKey: MessageKey;
  value: string;
  delta: string;
  positive: boolean;
  icon: string;
}
export interface SellerStaffRow {
  name: string;
  image: string;
  bookings: number;
  rating: number;
}
export interface SellerPeriodData {
  metrics: SellerMetric[];
  staff: SellerStaffRow[];
}

export const SELLER_DATA: Record<'week' | 'month' | 'all', SellerPeriodData> = {
  week: {
    metrics: [
      {
        id: 'rev',
        labelKey: 'seller.metric.revenue',
        value: '₸184.000',
        delta: '+12%',
        positive: true,
        icon: 'cash-outline',
      },
      {
        id: 'bk',
        labelKey: 'seller.metric.bookings',
        value: '23',
        delta: '+4',
        positive: true,
        icon: 'calendar-outline',
      },
      {
        id: 'rt',
        labelKey: 'seller.metric.rating',
        value: '4.9',
        delta: '+0.1',
        positive: true,
        icon: 'star-outline',
      },
      {
        id: 'rp',
        labelKey: 'seller.metric.repeat',
        value: '%62',
        delta: '+5%',
        positive: true,
        icon: 'repeat-outline',
      },
    ],
    staff: [
      { name: 'Madina', image: avatar(FACES[0]!), bookings: 9, rating: 4.9 },
      { name: 'Aigerim', image: avatar(FACES[1]!), bookings: 8, rating: 4.8 },
      { name: 'Saule', image: avatar(FACES[2]!), bookings: 6, rating: 4.7 },
    ],
  },
  month: {
    metrics: [
      {
        id: 'rev',
        labelKey: 'seller.metric.revenue',
        value: '₸742.000',
        delta: '+18%',
        positive: true,
        icon: 'cash-outline',
      },
      {
        id: 'bk',
        labelKey: 'seller.metric.bookings',
        value: '96',
        delta: '+14',
        positive: true,
        icon: 'calendar-outline',
      },
      {
        id: 'rt',
        labelKey: 'seller.metric.rating',
        value: '4.8',
        delta: '+0.2',
        positive: true,
        icon: 'star-outline',
      },
      {
        id: 'rp',
        labelKey: 'seller.metric.repeat',
        value: '%58',
        delta: '+3%',
        positive: true,
        icon: 'repeat-outline',
      },
    ],
    staff: [
      { name: 'Madina', image: avatar(FACES[0]!), bookings: 38, rating: 4.9 },
      { name: 'Aigerim', image: avatar(FACES[1]!), bookings: 34, rating: 4.8 },
      { name: 'Saule', image: avatar(FACES[2]!), bookings: 24, rating: 4.7 },
    ],
  },
  all: {
    metrics: [
      {
        id: 'rev',
        labelKey: 'seller.metric.revenue',
        value: '₸6.4M',
        delta: '+92%',
        positive: true,
        icon: 'cash-outline',
      },
      {
        id: 'bk',
        labelKey: 'seller.metric.bookings',
        value: '812',
        delta: '+210',
        positive: true,
        icon: 'calendar-outline',
      },
      {
        id: 'rt',
        labelKey: 'seller.metric.rating',
        value: '4.8',
        delta: '—',
        positive: true,
        icon: 'star-outline',
      },
      {
        id: 'rp',
        labelKey: 'seller.metric.repeat',
        value: '%61',
        delta: '+8%',
        positive: true,
        icon: 'repeat-outline',
      },
    ],
    staff: [
      { name: 'Madina', image: avatar(FACES[0]!), bookings: 320, rating: 4.9 },
      { name: 'Aigerim', image: avatar(FACES[1]!), bookings: 286, rating: 4.8 },
      { name: 'Saule', image: avatar(FACES[2]!), bookings: 206, rating: 4.7 },
    ],
  },
};
