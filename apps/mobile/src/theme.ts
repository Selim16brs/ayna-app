import { Platform } from 'react-native';

/**
 * AYNA tasarım sistemi — SAKİN / WELLNESS (Build Brief 2026).
 * Sıcak off-white taban + adaçayı/pudra/lavanta monokromatik skala + TEK coral vurgu.
 * Gökkuşağı/neon YOK. Faz/durum renkleri nazik (mint/pembe/lavanta/soft mavi).
 *
 * Token tabanlı + ÇİFT TEMA: açık (light) ve koyu (dark = derin yeşil-gri, siyah değil).
 * Renkler `useTheme()` üzerinden okunur; stiller `useThemedStyles(makeStyles)` ile üretilir,
 * böylece tema değişince tüm ekranlar adapte olur. `colors`/`gradients` (light) geriye
 * dönük uyumluluk için dışa açıktır.
 */

// ── Açık tema (Build Brief: sıcak off-white "Cloud Dancer") ──────────────
export const lightColors = {
  // Zemin (sıcak off-white — saf beyaz değil)
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

// ── Koyu tema (Build Brief: derin yeşil-gri, siyah DEĞİL) ────────────────
export const darkColors: ColorTokens = {
  // Zemin (derin yeşil-gri — sıcak, klinik değil)
  bg: '#191E1B',
  bgSunken: '#131715',
  surface: '#222824',
  surfaceMuted: '#2A312C',

  // Metin (sıcak açık kum — saf beyaz değil)
  ink: '#ECE7DE',
  inkSoft: '#B7AFA3',
  muted: '#857E73',
  onColor: '#FFFFFF',

  // Tek vurgu — koyuda biraz daha parlak mercan
  accent: '#E8826C',
  accentSoft: '#3B2C28',

  // Marka / nazik aksanlar (koyu zeminde okunur tonlar; *Soft = koyu tint)
  rose: '#D89AAD',
  roseSoft: '#352A2E',
  sage: '#9DBBA8',
  sageSoft: '#26302B',
  lavender: '#ADA3D6',
  lavenderSoft: '#2A2836',
  blue: '#93B2D6',
  blueSoft: '#232E38',
  gold: '#CDAE78',
  goldSoft: '#332E20',
  orange: '#E09877',
  teal: '#5FB0A0',
  plum: '#ADA3D6',

  // Çizgi / durum
  line: '#333A35',
  success: '#6FB08E',
  successSoft: '#21302A',
  danger: '#D8786C',
  dangerSoft: '#382522',
};

export type ColorTokens = { [K in keyof typeof lightColors]: string };
export type ThemeMode = 'light' | 'dark';

// ── Gradyanlar (tema bazlı) ──────────────────────────────────────────────
export const lightGradients = {
  hero: ['#F4F1EC', '#E8EEE9'] as const, // off-white → çok hafif adaçayı
  gold: ['#E8836E', '#D85E47'] as const, // ana CTA: coral ombre (tek vurgu)
  rose: ['#DCA9B6', '#CC8BA0'] as const, // pudra
  teal: ['#A6C6B6', '#7FA992'] as const, // adaçayı
  plum: ['#C3B9E2', '#A99CD6'] as const, // lavanta
} as const;

export const darkGradients: GradientTokens = {
  hero: ['#191E1B', '#1F2723'] as const, // derin yeşil-gri → hafif adaçayı
  gold: ['#E8826C', '#D8624A'] as const, // CTA coral (tutarlı)
  rose: ['#A56E7E', '#8E5C6A'] as const,
  teal: ['#5C8475', '#4A6E60'] as const,
  plum: ['#857BB0', '#6E63A0'] as const,
};

export type GradientTokens = { [K in keyof typeof lightGradients]: readonly [string, string] };

// Geriye dönük uyumluluk: doğrudan `colors`/`gradients` import edenler için (light).
export const colors = lightColors;
export const gradients = lightGradients;

export const palettes: Record<ThemeMode, ColorTokens> = {
  light: lightColors,
  dark: darkColors,
};
export const gradientSets: Record<ThemeMode, GradientTokens> = {
  light: lightGradients,
  dark: darkGradients,
};

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

const shadowColorFor = (mode: ThemeMode) => (mode === 'dark' ? '#000000' : '#3A332B');

export const makeShadow = (mode: ThemeMode) =>
  ({
    card: Platform.select({
      ios: {
        shadowColor: shadowColorFor(mode),
        shadowOpacity: mode === 'dark' ? 0.4 : 0.1,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 4 },
      default: {},
    }),
    soft: Platform.select({
      ios: {
        shadowColor: shadowColorFor(mode),
        shadowOpacity: mode === 'dark' ? 0.3 : 0.07,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 5 },
      },
      android: { elevation: 2 },
      default: {},
    }),
  }) as const;

// Geriye dönük uyumluluk: statik `shadow` (light) — eski import edenler için.
export const shadow = makeShadow('light');

export const theme = { colors, gradients, weight, radius, space, shadow } as const;
export type Theme = typeof theme;
