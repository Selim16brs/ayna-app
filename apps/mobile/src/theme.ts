import { Platform } from 'react-native';

/**
 * AYNA tasarım sistemi token'ları — premium, sıcak, kadınsı.
 * Açık (ivory) tema: lüks güzellik/spa hissi. Serif başlık + temiz sans gövde.
 */
export const colors = {
  // Zemin
  bg: '#FBF6F1', // sıcak fildişi
  bgSunken: '#F4EAE1',
  surface: '#FFFFFF',
  surfaceMuted: '#FBF4EF',

  // Metin
  ink: '#2A2230', // koyu patlıcan
  inkSoft: '#6E6473',
  muted: '#A99FA6',
  onColor: '#FFFFFF',

  // Marka
  rose: '#C45C77', // ana CTA
  roseDeep: '#A8456060',
  roseSoft: '#F5DDE3',
  plum: '#5A2E4D',
  gold: '#B68A4E', // ince vurgular
  goldSoft: '#EFE0C6',

  // Çizgi / durum
  line: '#EFE5DC',
  success: '#3F8F6B',
  danger: '#C0492F',
} as const;

export const gradients = {
  hero: ['#F7E2E7', '#F4E7DC'] as const, // yumuşak rose → şampanya
  rose: ['#D2718A', '#A8456A'] as const, // CTA derinliği
  plum: ['#6A3A5B', '#3C2138'] as const,
} as const;

export const font = {
  display: 'CormorantGaramond_600SemiBold',
  displayMedium: 'CormorantGaramond_500Medium',
  displayBold: 'CormorantGaramond_700Bold',
  body: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
} as const;

export const radius = { sm: 12, md: 18, lg: 26, xl: 34, pill: 999 } as const;

export const space = (n: number): number => n * 8;

export const shadow = {
  // Yumuşak, düşük opaklı premium derinlik
  card: Platform.select({
    ios: {
      shadowColor: '#7A5C45',
      shadowOpacity: 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 4 },
    default: {},
  }),
  soft: Platform.select({
    ios: {
      shadowColor: '#7A5C45',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: {},
  }),
} as const;

export const theme = { colors, gradients, font, radius, space, shadow } as const;
export type Theme = typeof theme;
