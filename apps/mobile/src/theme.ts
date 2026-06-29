import { Platform } from 'react-native';

/**
 * AYNA tasarım sistemi token'ları — CANLI ÇOK RENKLİ (lacivert zemin + canlı aksanlar).
 * Referans: lacivert + turuncu/pembe/turkuaz/sarı. Token tabanlı: tema değişince tüm ekranlar adapte.
 */
export const colors = {
  // Zemin (derin lacivert)
  bg: '#151B45',
  bgSunken: '#1D2454',
  surface: '#222A5E',
  surfaceMuted: '#2B3470',

  // Metin
  ink: '#F3F5FF',
  inkSoft: '#A9B2E6',
  muted: '#7B85BE',
  onColor: '#FFFFFF',

  // Canlı aksanlar
  rose: '#FF3D7F', // pembe/magenta (ana aksan)
  orange: '#FF7A2F',
  teal: '#16C9B0',
  gold: '#FFC24B', // canlı sarı
  plum: '#6C5CE7', // canlı mor

  // Aksan yumuşak zeminleri (lacivert üstü koyu tint)
  roseSoft: '#3A1F44',
  orangeSoft: '#3A2519',
  tealSoft: '#103833',
  goldSoft: '#3A3318',

  // Çizgi / durum
  line: '#303A7E',
  success: '#16C9B0',
  successSoft: '#103833',
  danger: '#FF5A6A',
  dangerSoft: '#3A1E26',
} as const;

export const gradients = {
  hero: ['#1F2660', '#151B45'] as const, // lacivert hero
  gold: ['#FF5C8A', '#FF8A3D'] as const, // ana CTA: pembe → turuncu (canlı)
  rose: ['#FF4D86', '#E83C6D'] as const, // pembe aksiyon
  teal: ['#1ED2B8', '#0FA892'] as const, // turkuaz aksiyon
  plum: ['#7A6CF0', '#4A3CC7'] as const, // mor (kampanya)
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
