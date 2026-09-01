import { Platform, type TextStyle } from 'react-native';

/**
 * AYNA tasarım sistemi — MÜRDÜM / PORSELEN (2026 tasarım kanvası).
 *
 * Tek eylem rengi: Ayna Mürdüm #5A2A55. Zemin porselen #FBF8F6 — sessiz kalır,
 * renk yalnız kartlarda, CTA'da ve durum sinyallerinde konuşur.
 * Tek font ailesi: Onest (56 Kiril dili + Türkçe + ₸). İkinci gövde fontu YOK.
 *
 * Token tabanlı + ÇİFT TEMA. Renkler `useTheme()` üzerinden okunur; stiller
 * `useThemedStyles(makeStyles)` ile üretilir. `colors`/`gradients` (light)
 * geriye dönük uyumluluk için dışa açıktır.
 *
 * KOYU TEMADA EYLEM RENGİ DEĞİŞİR: mürdüm koyu mürekkep üzerinde okunmaz,
 * bu yüzden koyu temada `accent` Gül'e (#D97798) döner. Aynı hiyerarşi, farklı zemin.
 */

// ── Açık tema ────────────────────────────────────────────────────────────
import { darkColors, lightColors, type ColorTokens } from './theme.palette';

export { darkColors, lightColors, type ColorTokens };

export type ThemeMode = 'light' | 'dark';

// ── Gradyanlar ───────────────────────────────────────────────────────────
export const lightGradients = {
  hero: ['#FAF7F5', '#E8D9EB'] as const, // zemin → lila
  gold: ['#642855', '#4A1942'] as const, // ana CTA: mürdüm ombre (isim geriye dönük)
  rose: ['#C8848C', '#B0616B'] as const, // acil / sayaç kartı
  teal: ['#3E9560', '#2F7A4A'] as const, // onay
  plum: ['#642855', '#4A1942'] as const,
} as const;

export const darkGradients: GradientTokens = {
  hero: ['#18061C', '#26102A'] as const,
  gold: ['#D4A0A0', '#B0616B'] as const, // koyuda CTA gül
  rose: ['#D4A0A0', '#B0616B'] as const,
  teal: ['#3E9560', '#2F7A4A'] as const,
  // Plum DOLU BİR YÜZEY ve üstüne HER ZAMAN beyaz yazı geliyor (7 ekran).
  // Koyuda accent'i açmak metin/ikon için doğru, dolu yüzey için değil:
  // '#AA9AC4' üstünde beyaz 2.58:1 ölçülüyor — okunmuyor. Bu çift 7.72:1
  // veriyor ve koyu zeminden (#1A1419) yine ayrışıyor.
  plum: ['#642855', '#4A1942'] as const,
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

// ── Tipografi ────────────────────────────────────────────────────────────
/**
 * Tek aile: Onest. Üç ağırlık yüklenir; RN'de `fontWeight` yerine AİLE ADI
 * kullanılır (iOS'ta ağırlık sentezi güvenilir değil). `font.semibold` = 600.
 */
/**
 * Yazı tipleri — UYGULAMANIN MEVCUT AİLESİ (kurucu kararı).
 *
 * Figma Inter + DM Sans kullanıyor; tasarımın geri kalanı birebir uygulanıyor
 * ama yazı tipi Onest kalıyor. Onest'in elimizde ÜÇ ağırlığı var
 * (400/500/600); Figma'nın Bold(700) ve ExtraBold(800) katmanları en yakın
 * ağırlığa — SemiBold'a — düşüyor. Uygulamanın kendi kuralı da bunu
 * söylüyordu: hiyerarşi boyut ve renkle kurulur, ağırlıkla değil.
 */
export const font = {
  regular: 'Onest-Regular',
  medium: 'Onest-Medium',
  semibold: 'Onest-SemiBold',
  /** Figma'daki Bold/ExtraBold → elimizdeki en ağır kesim. */
  bold: 'Onest-SemiBold',
  extrabold: 'Onest-SemiBold',
  /** Figma başlıkları DM Sans; bizde başlık da Onest. */
  displayMedium: 'Onest-Medium',
  displayBold: 'Onest-SemiBold',
} as const;

// Eski `weight` API'si — hâlâ import edenler için (yeni kodda `font` kullanın).
export const weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '600', // 700/800 kullanılmıyor: hiyerarşi boyut ve renkle kurulur
  heavy: '600',
} as const;

/** Ölçek — RU/KK metin için ölçüldü. 700/800 ağırlık YOK. */
export const type = {
  /** Büyük kampanya mesajı — 30–34 / 500 */
  display: { fontFamily: font.medium, fontSize: 32, lineHeight: 40, letterSpacing: -0.6 },
  /** Sayfa başlığı — 24 / 600 */
  h1: { fontFamily: font.semibold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  /** Bölüm başlığı — 20 / 600 */
  h2: { fontFamily: font.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  /** Salon · uzman · kart adı — 17 / 600 */
  title: { fontFamily: font.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  /** Normal metin — 16 / 400 */
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 24 },
  /** Vurgulu gövde — 16 / 500 */
  bodyStrong: { fontFamily: font.medium, fontSize: 16, lineHeight: 24 },
  /** CTA — 16 / 600 */
  cta: { fontFamily: font.semibold, fontSize: 16, lineHeight: 20 },
  /** Filtre · saat · fiyat — 15 / 500 */
  meta: { fontFamily: font.medium, fontSize: 15, lineHeight: 20 },
  /** Yardımcı bilgi — 14 / 400 */
  caption: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  /** Yardımcı bilgi (vurgulu) — 14 / 500 */
  captionStrong: { fontFamily: font.medium, fontSize: 14, lineHeight: 20 },
  /** Minimum bilgi — 12 / 500 */
  micro: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
  /** Büyük harf etiket — 11 / 600 */
  label: {
    fontFamily: font.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

/** Rakam hizası — fiyat, saat, sayaç ve tablolarda zorunlu. */
export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };

// ── Ölçüler ──────────────────────────────────────────────────────────────
/** Kontrol yükseklikleri — hepsi ≥ 44pt dokunma eşiği. */
export const control = {
  chip: 40, // filtre çipi, hap buton (yarıçap = 20)
  chipSm: 38, // ipucu etiketi
  button: 52, // ikincil/üçüncül buton (yarıçap = 26)
  buttonLg: 58, // ana CTA (yarıçap = 29)
  input: 54,
  icon: 44, // ikon karesi / yuvarlak buton
  iconLg: 52,
  minTouch: 44,
} as const;

/** Geniş köşe yarıçapı — kartlarda 20–30. */
/**
 * Kategori rozetlerinin dönüşümlü tonları.
 *
 * Bir ekranın içinde duruyordu; oysa bu bir TASARIM KARARI. Yeni bir palet
 * geldiğinde temada aranıp bulunması gerekir, `discover.tsx` içinde değil.
 * Dekoratif dizi olduğu için `ColorTokens` (her anahtarı string) içine
 * girmiyor, gradyanlar gibi ayrı duruyor.
 */
export const categoryTints = [
  '#4A1942',
  '#B0616B',
  '#7B5A7E',
  '#9A5A05',
  '#5B7392',
  '#2F7A4A',
] as const;

/**
 * Köşe yarıçapı ölçeği — Figma'dan ölçüldü.
 *
 * Baskın değer 18px (41 katman); 8/12/16/20 yardımcı, 100+ hap. Önceki ölçek
 * (14/18/22/26/30) belirgin biçimde daha yuvarlaktı; yeni dil daha keskin.
 */
export const radius = { xs: 8, sm: 12, md: 16, lg: 18, xl: 20, pill: 999 } as const;

export const space = (n: number): number => n * 8;

// ── Gölge (mürdüm tonlu — nötr gri gölge porselen üstünde kirli durur) ────
// Figma gölgeleri mor tonlu: rgba(74,25,66,…) — yeni accent'in kendisi.
const shadowColorFor = (mode: ThemeMode) => (mode === 'dark' ? '#000000' : '#4A1942');

export const makeShadow = (mode: ThemeMode) =>
  ({
    card: Platform.select({
      ios: {
        shadowColor: shadowColorFor(mode),
        shadowOpacity: mode === 'dark' ? 0.45 : 0.13,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 4 },
      default: {},
    }),
    soft: Platform.select({
      ios: {
        shadowColor: shadowColorFor(mode),
        shadowOpacity: mode === 'dark' ? 0.32 : 0.07,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
      default: {},
    }),
  }) as const;

// Geriye dönük uyumluluk: statik `shadow` (light) — eski import edenler için.
export const shadow = makeShadow('light');

export const theme = {
  colors,
  gradients,
  font,
  type,
  weight,
  control,
  radius,
  space,
  shadow,
} as const;
