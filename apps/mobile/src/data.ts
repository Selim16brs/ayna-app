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

export type BookingSource = 'direct' | 'photo_quote' | 'demand';
export type BookingStatus = 'confirmed' | 'pending' | 'completed';

export interface Appointment {
  id: string;
  source: BookingSource;
  service: string; // ne için
  proName: string;
  proImage: string;
  dateLabel: string; // hangi saatte
  price: number; // kaç paraya
  status: BookingStatus;
}

export const APPOINTMENTS: Appointment[] = [
  {
    id: 'a1',
    source: 'direct',
    service: 'Saç kesimi & fön',
    proName: 'Madina Studio',
    proImage: FEATURED[0]!.image,
    dateLabel: 'Cuma · 14:00',
    price: 9000,
    status: 'confirmed',
  },
  {
    id: 'a2',
    source: 'direct',
    service: 'Cilt bakımı',
    proName: 'Lotus Spa',
    proImage: FEATURED[3]!.image,
    dateLabel: 'Geçen hafta · 16:00',
    price: 18000,
    status: 'completed',
  },
  {
    id: 'a3',
    source: 'photo_quote',
    service: 'Balayage (fotoğraflı teklif)',
    proName: 'Ailin Makeup',
    proImage: FEATURED[2]!.image,
    dateLabel: 'Pazartesi · 11:00',
    price: 21000,
    status: 'pending',
  },
  {
    id: 'a4',
    source: 'demand',
    service: 'Gelin makyajı (talep)',
    proName: 'Aruzhan Beauty',
    proImage: FEATURED[1]!.image,
    dateLabel: 'Cumartesi · 09:00',
    price: 18000,
    status: 'confirmed',
  },
];

export const UPCOMING = APPOINTMENTS.filter((a) => a.status !== 'completed');

export type CirclePostType = 'recommend' | 'asking' | 'experience';
export interface CirclePost {
  id: string;
  type: CirclePostType;
  category: string;
  author: string;
  anonymous: boolean;
  text: string;
  helpful: number;
  comments: number;
}

export const CIRCLE_POSTS: CirclePost[] = [
  {
    id: 'c1',
    type: 'recommend',
    category: 'Saç',
    author: 'Dana',
    anonymous: false,
    text: 'Madina Studio’da balayage yaptırdım, sonuç referansın birebir aynısı oldu. Gönül rahatlığıyla öneririm.',
    helpful: 24,
    comments: 6,
  },
  {
    id: 'c2',
    type: 'asking',
    category: 'Makyaj',
    author: 'Doğrulanmış üye',
    anonymous: true,
    text: 'Almatı’da gelin makyajı için güvenilir bir uzman arıyorum. Evime gelebilen biri ideal olur.',
    helpful: 8,
    comments: 11,
  },
  {
    id: 'c3',
    type: 'experience',
    category: 'Tırnak',
    author: 'Aigerim',
    anonymous: false,
    text: 'Kalıcı ojede hijyene çok dikkat eden bir yer buldum. Sterilizasyonu gözümün önünde yaptılar.',
    helpful: 17,
    comments: 3,
  },
];

export interface CareRoutine {
  id: string;
  name: string;
  icon: string;
  dueDays: number; // <0 gecikmiş, 0 bugün
}

export const CARE_ROUTINES: CareRoutine[] = [
  { id: 'cr1', name: 'Kalıcı oje yenileme', icon: 'color-palette-outline', dueDays: 2 },
  { id: 'cr2', name: 'Saç dip boyası', icon: 'cut-outline', dueDays: -3 },
  { id: 'cr3', name: 'Cilt bakımı', icon: 'sparkles-outline', dueDays: 9 },
  { id: 'cr4', name: 'Lazer epilasyon seansı', icon: 'flash-outline', dueDays: 0 },
];

export interface Moment {
  id: string;
  title: string;
  icon: string;
  dateLabel: string;
  daysLeft: number;
}

export const MOMENTS: Moment[] = [
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
