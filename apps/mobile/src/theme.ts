import { Platform } from 'react-native';

/**
 * AYNA tasarım sistemi — BEYAZ zemin + CANLI renkli aksanlar (profesyonel UI).
 * Başlıklar siyah; ikon zeminleri canlı renk, içindeki ikon/yazı beyaz; alt menü mavi.
 */
export const colors = {
  // Zemin (beyaz)
  bg: '#FFFFFF',
  bgSunken: '#F3F4F8',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F4F8',

  // Metin (siyah başlıklar)
  ink: '#16171D',
  inkSoft: '#5A5E6C',
  muted: '#9AA0B2',
  onColor: '#FFFFFF', // canlı renk üstüne beyaz ikon/yazı

  // Canlı aksanlar (referans paleti)
  blue: '#2D4BE0', // alt menü + erkek kullanıcı
  navy: '#1B2A6B',
  rose: '#FF2E7E', // pembe (kadın kullanıcı + ana aksan)
  orange: '#FF7A2F',
  teal: '#13C4AC',
  gold: '#FFB22E', // canlı sarı
  plum: '#7A5CF0', // canlı mor
  pistachio: '#A8CF4D', // fıstık yeşili (alt menü)

  // Yumuşak tintler (beyaz üstü açık)
  roseSoft: '#FFE4EE',
  orangeSoft: '#FFE9DA',
  tealSoft: '#D7F6F0',
  goldSoft: '#FFF1D6',

  // Çizgi / durum
  line: '#E8E9F1',
  success: '#16B98A',
  successSoft: '#DCF6EE',
  danger: '#F0483F',
  dangerSoft: '#FCE4E2',
} as const;

export const gradients = {
  hero: ['#FFFFFF', '#F6F7FB'] as const,
  gold: ['#FF4E8B', '#FF7A2F'] as const, // ana CTA: pembe → turuncu (beyaz yazı)
  rose: ['#FF4E8B', '#FF2E7E'] as const,
  teal: ['#19D0B6', '#11A893'] as const,
  plum: ['#8A6CF5', '#5C3CE0'] as const,
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
      shadowColor: '#1B2A6B',
      shadowOpacity: 0.1,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 4 },
    default: {},
  }),
  soft: Platform.select({
    ios: {
      shadowColor: '#1B2A6B',
      shadowOpacity: 0.07,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: {},
  }),
} as const;

export const theme = { colors, gradients, weight, radius, space, shadow } as const;
export type Theme = typeof theme;
