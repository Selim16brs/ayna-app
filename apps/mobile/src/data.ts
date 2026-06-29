import type { Ionicons } from '@expo/vector-icons';
import type { MessageKey } from '@ayna/i18n';

type IoniconName = keyof typeof Ionicons.glyphMap;

export interface Category {
  id: string;
  labelKey: MessageKey;
  icon: IoniconName;
  tone: 'rose' | 'gold';
}

export const CATEGORIES: Category[] = [
  { id: 'hair', labelKey: 'category.hair', icon: 'cut-outline', tone: 'rose' },
  { id: 'nails', labelKey: 'category.nails', icon: 'color-palette-outline', tone: 'gold' },
  { id: 'brows', labelKey: 'category.brows', icon: 'eye-outline', tone: 'rose' },
  { id: 'makeup', labelKey: 'category.makeup', icon: 'brush-outline', tone: 'gold' },
  { id: 'spa', labelKey: 'category.spa', icon: 'flower-outline', tone: 'rose' },
];

export type ProBadge = 'campaign' | 'verified' | 'today';

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  friends?: number;
  priceFrom: number;
  image: string;
  badge: ProBadge;
}

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=70`;

export const FEATURED: Professional[] = [
  {
    id: '1',
    name: 'Madina Studio',
    specialty: 'Saç boyama · Balayage',
    rating: 4.9,
    friends: 3,
    priceFrom: 15000,
    image: img('photo-1560066984-138dadb4c035'),
    badge: 'campaign',
  },
  {
    id: '2',
    name: 'Aruzhan Beauty',
    specialty: 'Manikür · Nail art',
    rating: 4.8,
    priceFrom: 8000,
    image: img('photo-1604654894610-df63bc536371'),
    badge: 'today',
  },
  {
    id: '3',
    name: 'Ailin Makeup',
    specialty: 'Gelin & gece makyajı',
    rating: 5.0,
    friends: 5,
    priceFrom: 25000,
    image: img('photo-1596462502278-27bfdc403348'),
    badge: 'verified',
  },
  {
    id: '4',
    name: 'Lotus Spa',
    specialty: 'Masaj · Cilt bakımı',
    rating: 4.7,
    priceFrom: 18000,
    image: img('photo-1540555700478-4be289fbecef'),
    badge: 'campaign',
  },
];

export function formatPrice(value: number): string {
  return `₸${value.toLocaleString('ru-RU')}`;
}

export interface ServiceItem {
  id: string;
  name: string;
  durationMin: number;
  price: number;
}

export interface ServiceRating {
  name: string;
  score: number | null;
}

export interface Review {
  id: string;
  period: string;
  rating: number;
  service: string;
  text: string;
  firstVisit: boolean;
}

export interface ProfessionalDetail extends Professional {
  about: string;
  experienceYears: number;
  district: string;
  reviewCount: number;
  serviceRatings: ServiceRating[];
  services: ServiceItem[];
  portfolio: string[];
  reviews: Review[];
}

const portfolioImg = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&q=70`;

const SHARED_DETAIL = {
  about:
    'AYNA tarafından doğrulanmış, deneyimli ekip. Hijyen ve fiyat şeffaflığı önceliğimiz. Sonucun beklentine uygunluğunu garanti ederiz.',
  experienceYears: 8,
  district: 'Almatı · Medeu',
  reviewCount: 47,
  serviceRatings: [
    { name: 'Balayage', score: 4.9 },
    { name: 'Saç kesimi', score: 4.6 },
    { name: 'Saç bakımı', score: 4.8 },
    { name: 'Gelin saçı', score: null },
  ] as ServiceRating[],
  services: [
    { id: 's1', name: 'Saç boyama', durationMin: 90, price: 15000 },
    { id: 's2', name: 'Balayage', durationMin: 150, price: 28000 },
    { id: 's3', name: 'Saç kesimi & fön', durationMin: 60, price: 9000 },
    { id: 's4', name: 'Keratin bakımı', durationMin: 120, price: 22000 },
  ] as ServiceItem[],
  portfolio: [
    portfolioImg('photo-1562322140-8baeececf3df'),
    portfolioImg('photo-1595476108010-b4d1f102b1b1'),
    portfolioImg('photo-1633681926022-84c23e8cb2d6'),
    portfolioImg('photo-1521590832167-7bcbfaa6381f'),
  ],
  reviews: [
    {
      id: 'r1',
      period: 'Son 30 gün içinde',
      rating: 5,
      service: 'Balayage',
      text: 'Sonuç tam istediğim gibiydi, fiyat baştan açıktı. Kesinlikle tekrar geleceğim.',
      firstVisit: true,
    },
    {
      id: 'r2',
      period: '1–3 ay önce',
      rating: 4,
      service: 'Saç kesimi',
      text: 'Usta çok dikkatliydi ve zamanında başladı. Memnun kaldım.',
      firstVisit: false,
    },
  ] as Review[],
};

export function getProfessionalDetail(id: string): ProfessionalDetail {
  const base = FEATURED.find((p) => p.id === id) ?? FEATURED[0]!;
  return { ...base, ...SHARED_DETAIL };
}

export interface Quote {
  id: string;
  proId: string;
  name: string;
  image: string;
  rating: number;
  reviewCount: number;
  friends?: number;
  price: number;
  etaMin: number;
}

export const INCOMING_QUOTES: Quote[] = [
  {
    id: 'q1',
    proId: '1',
    name: 'Madina Studio',
    image: FEATURED[0]!.image,
    rating: 4.9,
    reviewCount: 47,
    friends: 3,
    price: 16000,
    etaMin: 120,
  },
  {
    id: 'q2',
    proId: '3',
    name: 'Ailin Makeup',
    image: FEATURED[2]!.image,
    rating: 5.0,
    reviewCount: 62,
    friends: 5,
    price: 21000,
    etaMin: 90,
  },
  {
    id: 'q3',
    proId: '2',
    name: 'Aruzhan Beauty',
    image: FEATURED[1]!.image,
    rating: 4.8,
    reviewCount: 33,
    price: 12000,
    etaMin: 75,
  },
  {
    id: 'q4',
    proId: '4',
    name: 'Lotus Spa',
    image: FEATURED[3]!.image,
    rating: 4.7,
    reviewCount: 28,
    price: 9500,
    etaMin: 60,
  },
];
