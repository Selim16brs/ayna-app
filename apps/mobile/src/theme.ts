import { Platform } from 'react-native';

/**
 * AYNA tasarım sistemi — SAKİN / WELLNESS (Build Brief 2026).
 * Sıcak off-white taban + adaçayı/pudra/lavanta monokromatik skala + TEK coral vurgu.
 * Gökkuşağı/neon YOK. Faz/durum renkleri nazik (mint/pembe/lavanta/soft mavi).
 * Token tabanlı: değerler değişince tüm ekranlar adapte.
 */
export const colors = {
  // Zemin (sıcak off-white "Cloud Dancer" — saf beyaz değil)
  bg: '#F4F1EC',
  bgSunken: '#ECE7DE',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEBE3',

  // Metin (derin kahve-gri mürekkep — saf siyah değil)
  ink: '#332E29',
  inkSoft: '#6E675E',
  muted: '#A69E92',
  onColor: '#FFFFFF',

  // Tek yüksek kontrastlı vurgu (CTA) — sıcak mercan
  accent: '#E0715A',
  accentSoft: '#F7E3DC',

  // Marka / nazik aksanlar
  rose: '#CC8BA0', // pudra pembesi (kadın kullanıcı + nazik vurgu)
  roseSoft: '#F2E5E8',
  sage: '#8FAE9B', // adaçayı/dusty mint (primary, sakinlik/sağlık)
  sageSoft: '#E4ECE6',
  lavender: '#9D93C9',
  lavenderSoft: '#EAE7F3',
  blue: '#7FA3CC', // soft mavi (durum)
  blueSoft: '#E4EAF2',
  gold: '#C2A06A', // sıcak bal (yıldız/derecelendirme)
  goldSoft: '#EFE7D6',
  // geriye dönük uyumluluk (eski isimler nazik tonlara map)
  orange: '#D88C6A',
  teal: '#4E9E8E',
  plum: '#9D93C9',

  // Çizgi / durum (nazik)
  line: '#E6DFD4',
  success: '#5E9E7E',
  successSoft: '#E1EDE6',
  danger: '#C9685C',
  dangerSoft: '#F3E0DB',
} as const;

export const gradients = {
  hero: ['#F4F1EC', '#E8EEE9'] as const, // off-white → çok hafif adaçayı
  gold: ['#E8836E', '#D85E47'] as const, // ana CTA: coral ombre (tek vurgu)
  rose: ['#DCA9B6', '#CC8BA0'] as const, // pudra
  teal: ['#A6C6B6', '#7FA992'] as const, // adaçayı
  plum: ['#C3B9E2', '#A99CD6'] as const, // lavanta
} as const;

// Variable/sistem font (SF iOS). fontFamily verilmez; ağırlık fontWeight ile.
export const weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

// Geniş köşe yarıçapı (brief: kartlarda 20-28px)
export const radius = { sm: 14, md: 20, lg: 26, xl: 32, pill: 999 } as const;

export const space = (n: number): number => n * 8;

export const shadow = {
  // Yumuşak gölgeler
  card: Platform.select({
    ios: {
      shadowColor: '#3A332B',
      shadowOpacity: 0.1,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 4 },
    default: {},
  }),
  soft: Platform.select({
    ios: {
      shadowColor: '#3A332B',
      shadowOpacity: 0.07,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 5 },
    },
    android: { elevation: 2 },
    default: {},
  }),
} as const;

export const theme = { colors, gradients, weight, radius, space, shadow } as const;
export type Theme = typeof theme;
