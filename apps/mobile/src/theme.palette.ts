// Renk paleti — react-native'e BAĞIMSIZ.
//
// theme.ts `Platform` için react-native'i import ediyor; palet orada kalınca
// Node testleri onu derleyemiyordu ("Unexpected typeof"). Kontrast denetimi
// paletin test edilebilir olmasını gerektirdiği için ayrıldı.
// theme.ts bunları yeniden dışa verir; çağrı yerleri değişmez.

export const lightColors = {
  // Zemin
  bg: '#F8F4F5', // Porselen — uygulama zemini
  bgSunken: '#F0EAEC', // Yumuşak Pudra — çökertilmiş bölüm
  surface: '#FFFFFF', // Kart
  surfaceMuted: '#F4F1EC', // Kart içi panel, çip, ikincil buton dolgusu

  // Metin
  ink: '#171418', // Koyu Mürekkep — başlık, fiyat, ikon
  inkSoft: '#3D353E',
  muted: '#6B636C', // Duman — ikincil metin
  onColor: '#FFFFFF',

  // Birincil eylem
  accent: '#BC245B', // Ayna Mürdüm — CTA, aktif sekme
  accentSoft: '#FCE7EE',
  /**
   * ERİK SİSİ — büyük kartların zemini.
   *
   * Kurucu: "tum sayfalar cok dark oldu... ınsanları rahatsız etmeyecek
   * sekılde duzenle."
   *
   * Erik (#4A1942) marka rengi olarak DOĞRU ama dolu yüzey olarak çok
   * ağır: 74 dosyada büyük koyu kart vardı ve alt menü de neredeyse
   * siyahtı (parlaklık 0.007, sayfa zemini 0.934). Marka rengi
   * değişmiyor; kapladığı ALAN değişiyor. Büyük kartlar bu sise oturuyor,
   * erik yazıda/ikonda/tek düğmede kalıyor.
   *
   * Ölçüm: erik yazı 12.07:1 · başlık 16.06:1 · ikincil 6.00:1.
   */
  heroSoft: '#F6ECF4',
  onAccent: '#FFFFFF', // mürdüm üstünde AÇIK yazı
  accentFg: '#BC245B', // beyaz zeminde eylem metni/ikonu

  // Marka aksanları
  rose: '#DE3370', // Gül — küçük vurgu, favori, koyu yüzeyde eylem
  roseSoft: '#FCE7EE',
  sage: '#2F7A4A', // Adaçayı — onay
  sageSoft: '#E3F2E8',
  lavender: '#7B5A7E',
  lavenderSoft: '#EFE6F0',
  blue: '#5B7392', // bilgi
  blueSoft: '#E6EAF0',
  // §15 — açık temada yumuşak zeminlerde 4,48:1 idi (eşik 4,5). Üç durum
  // rengi de %6 koyulaştırıldı: gold 4,48→4,97 · success 4,25→4,75 ·
  // danger 4,48→4,94. Koyu temadakiler zaten eşiğin üstündeydi, dokunulmadı.
  gold: '#9A5A05', // Kehribar — beklemede, uyarı, yıldız
  goldSoft: '#FDF3E7',
  // geriye dönük uyumluluk (eski isimler yeni paletle eşlendi)
  orange: '#9A5A05',
  plum: '#50094D',

  // Çizgi / durum
  // ── TERS YÜZEY (yüzen alt menü, toast, vaat kartı, arama düğmesi) ──
  //
  // Bu yüzeyler sayfa zemininin TERSİDİR: açık temada koyu, koyu temada
  // YÜKSELTİLMİŞ koyu. Eskiden zemin olarak `colors.ink` — yani METİN rengi —
  // kullanılıyordu. ink koyu temada açık renge döndüğü için bu yüzeyler
  // bembeyaz oluyor, üstlerindeki açık yazı/ikon görünmez hâle geliyordu
  // (Toast koyu modda tamamen okunmuyordu).
  inverse: '#1E0E1B',
  onInverse: '#FAF7F5',
  onInverseMuted: 'rgba(250,247,245,0.66)',
  // Bar üstündeki kademeli geçiş — sayfa zemininden türetilir.
  fadeFrom: 'rgba(250,247,245,0)',
  fadeMid: 'rgba(250,247,245,0.72)',
  line: '#EADFE4',
  lineStrong: '#DCCFD5', // ikincil buton çerçevesi, kesikli sınır
  success: '#2F7A4A',
  successSoft: '#E3F2E8',
  danger: '#A93E4D', // Mercan Kırmızı — iptal, hata
  dangerSoft: '#F9E9EB',
} as const;

// ── Koyu tema (mürdüm-mürekkep taban; siyah DEĞİL) ───────────────────────
export type ColorTokens = { [K in keyof typeof lightColors]: string };

export const darkColors: ColorTokens = {
  bg: '#0F0B10',
  bgSunken: '#171218',
  surface: '#1A141C',
  surfaceMuted: '#241C26',

  ink: '#F6F0F3',
  inkSoft: '#DDD3DA',
  muted: '#A79DA8',
  onColor: '#FFFFFF',

  // Koyu zeminde mürdüm okunmaz → eylem rengi Gül
  accent: '#FF7FA8',
  accentSoft: '#33162A',
  /** Erik sisinin koyu karşılığı — ölçüm: erik yazı 7.19:1, başlık 14.51:1. */
  heroSoft: '#2A1329',
  onAccent: '#1A0810', // gül üstünde KOYU yazı
  accentFg: '#FF7FA8',

  rose: '#FF8CB4',
  roseSoft: '#3A1F26',
  sage: '#6FC98C',
  sageSoft: '#17301F',
  lavender: '#C5A3C7',
  lavenderSoft: '#2E1A33',
  blue: '#8DA3C4',
  blueSoft: '#1B2230',
  gold: '#F5BE50',
  goldSoft: '#33240B',
  orange: '#F5BE50',
  plum: '#3A0838',

  // Koyu temada ters yüzey zeminden AYRIŞMALI: bg #1A1419 üzerinde yükseltilmiş.
  // Yüzen alt menü/toast zemini. Figma'nın yüzey moru (#37193C) sayfa
  // zemininden yalnız 1.26:1 ayrışıyor — bar zeminde kayboluyordu.
  // Bu ton 1.58:1 veriyor; üstündeki yazı hâlâ 11.1:1.
  inverse: '#4A2851',
  onInverse: '#FFF0F5',
  onInverseMuted: 'rgba(255,240,245,0.62)',
  fadeFrom: 'rgba(24,6,28,0)',
  fadeMid: 'rgba(24,6,28,0.72)',
  line: '#332A33',
  lineStrong: '#463A46',
  success: '#6FC98C',
  successSoft: '#17301F',
  danger: '#E88A96',
  dangerSoft: '#3A1F26',
};

// ── AKSAN SETİ UYGULAMA ─────────────────────────────────────────────────
//
// Kullanıcı profilden bir renk seçtiğinde palet YENİDEN KURULMUYOR; taban
// palet (yukarıdaki lightColors/darkColors) olduğu gibi kalıyor, yalnızca
// aksan ailesindeki beş token üzerine yazılıyor. Zemin, kart, metin, çizgi
// ve anlam renkleri (success/danger/gold) hiç dokunulmadan geçiyor.
//
// Varsayılan set 'gul' TABAN PALETİN AYNISI: seçim yapılmadığında bu
// fonksiyon lightColors/darkColors ile birebir aynı değerleri üretir.

import { AKSANLAR, type AksanAnahtari, VARSAYILAN_AKSAN } from './theme.aksan';

export function paletUret(
  mode: 'light' | 'dark',
  aksan: AksanAnahtari = VARSAYILAN_AKSAN,
): ColorTokens {
  const taban = mode === 'dark' ? darkColors : lightColors;
  const set = AKSANLAR[aksan][mode];
  return {
    ...taban,
    accent: set.accent,
    accentSoft: set.accentSoft,
    accentFg: set.accentFg,
    heroSoft: set.heroSoft,
    plum: set.plum,
    // `rose`/`roseSoft` aksanla birlikte kayıyor: acil/çekiliş vurgusu marka
    // ailesinin parçası, durum rengi değil. Kehribar (gold) ve yeşil (success)
    // KASITLI olarak dışarıda — onlar anlam taşıyor.
    rose: set.accent,
    roseSoft: set.accentSoft,
  };
}
