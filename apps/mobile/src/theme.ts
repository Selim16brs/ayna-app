import { Platform } from 'react-native';

/**
 * AYNA tasarım sistemi token'ları — KOYU LÜKS (siyah-altın, logo kimliği).
 * Token tabanlı: tema değerleri değişince tüm ekranlar adapte olur.
 */
export const colors = {
  // Zemin (koyu patlıcan-siyah)
  bg: '#141019',
  bgSunken: '#1C1726',
  surface: '#221B2D',
  surfaceMuted: '#2A2237',

  // Metin (sıcak krem)
  ink: '#F4EFE7',
  inkSoft: '#B7AEC0',
  muted: '#827A8E',
  onColor: '#F8F4EC', // renkli/koyu gradyan üstüne açık metin (altın buton hariç)

  // Marka — altın öncelikli
  gold: '#C9A86A',
  goldSoft: '#2E2718', // koyu altın tint (chip zemini)
  rose: '#D98FA6', // ikincil sıcak vurgu
  roseSoft: '#33212C', // koyu rose tint
  plum: '#5A2E4D',

  // Çizgi / durum
  line: '#2E2739',
  success: '#5CC79A',
  successSoft: '#15291F',
  danger: '#E27A6C',
  dangerSoft: '#2E1A18',
} as const;

export const gradients = {
  hero: ['#1C1626', '#141019'] as const, // koyu hero
  gold: ['#E6CE92', '#C2A05A'] as const, // ana CTA (altın)
  rose: ['#D98FA6', '#B5677F'] as const, // ikincil aksiyon
  plum: ['#4A3A5C', '#271E33'] as const, // koyu mor kart (okunur)
} as const;

// SF (San Francisco) — iOS sistem fontu. fontFamily verilmez; ağırlık fontWeight ile.
export const weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const radius = { sm: 12, md: 18, lg: 26, xl: 34, pill: 999 } as const;

export const space = (n: number): number => n * 8;

export const shadow = {
  // Koyu temada derinlik: siyah gölge + ince
  card: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.35,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 12 },
    },
    android: { elevation: 5 },
    default: {},
  }),
  soft: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
    },
    android: { elevation: 3 },
    default: {},
  }),
} as const;

export const theme = { colors, gradients, weight, radius, space, shadow } as const;
export type Theme = typeof theme;
