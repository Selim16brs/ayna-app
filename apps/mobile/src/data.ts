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
