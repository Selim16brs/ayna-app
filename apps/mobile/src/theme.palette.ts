// Renk paleti — react-native'e BAĞIMSIZ.
//
// theme.ts `Platform` için react-native'i import ediyor; palet orada kalınca
// Node testleri onu derleyemiyordu ("Unexpected typeof"). Kontrast denetimi
// paletin test edilebilir olmasını gerektirdiği için ayrıldı.
// theme.ts bunları yeniden dışa verir; çağrı yerleri değişmez.

export const lightColors = {
  // Zemin
  bg: '#FAF7F5', // Porselen — uygulama zemini
  bgSunken: '#EFEBE9', // Yumuşak Pudra — çökertilmiş bölüm
  surface: '#FFFFFF', // Kart
  surfaceMuted: '#EFEBE9', // Kart içi panel, çip, ikincil buton dolgusu

  // Metin
  ink: '#1E0E1B', // Koyu Mürekkep — başlık, fiyat, ikon
  inkSoft: '#4A3A47',
  muted: '#68536A', // Duman — ikincil metin
  onColor: '#FFFFFF',

  // Birincil eylem
  accent: '#4A1942', // Ayna Mürdüm — CTA, aktif sekme
  accentSoft: '#E8D9EB',
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
  heroSoft: '#F5ECF6',
  onAccent: '#FFF0F5', // mürdüm üstünde AÇIK yazı
  accentFg: '#4A1942', // beyaz zeminde eylem metni/ikonu

  // Marka aksanları
  rose: '#B0616B', // Gül — küçük vurgu, favori, koyu yüzeyde eylem
  roseSoft: '#F9EAEB',
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
  plum: '#4A1942',

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
  line: '#EFEBE9',
  lineStrong: '#E5E0DE', // ikincil buton çerçevesi, kesikli sınır
  success: '#2F7A4A',
  successSoft: '#E3F2E8',
  danger: '#A93E4D', // Mercan Kırmızı — iptal, hata
  dangerSoft: '#F9E9EB',
} as const;

// ── Koyu tema (mürdüm-mürekkep taban; siyah DEĞİL) ───────────────────────
export type ColorTokens = { [K in keyof typeof lightColors]: string };

export const darkColors: ColorTokens = {
  bg: '#18061C',
  bgSunken: '#120414',
  surface: '#26102A',
  surfaceMuted: '#37193C',

  ink: '#FFF0F5',
  inkSoft: '#EBE3DB',
  muted: '#B197B3',
  onColor: '#FFFFFF',

  // Koyu zeminde mürdüm okunmaz → eylem rengi Gül
  accent: '#C5A3C7',
  accentSoft: '#37193C',
  /** Erik sisinin koyu karşılığı — ölçüm: erik yazı 7.19:1, başlık 14.51:1. */
  heroSoft: '#2E1A33',
  onAccent: '#18061C', // gül üstünde KOYU yazı
  accentFg: '#C5A3C7',

  rose: '#D4A0A0',
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
  plum: '#C5A3C7',

  // Koyu temada ters yüzey zeminden AYRIŞMALI: bg #1A1419 üzerinde yükseltilmiş.
  // Yüzen alt menü/toast zemini. Figma'nın yüzey moru (#37193C) sayfa
  // zemininden yalnız 1.26:1 ayrışıyor — bar zeminde kayboluyordu.
  // Bu ton 1.58:1 veriyor; üstündeki yazı hâlâ 11.1:1.
  inverse: '#4A2851',
  onInverse: '#FFF0F5',
  onInverseMuted: 'rgba(255,240,245,0.62)',
  fadeFrom: 'rgba(24,6,28,0)',
  fadeMid: 'rgba(24,6,28,0.72)',
  line: '#3A2340',
  lineStrong: '#4E3054',
  success: '#6FC98C',
  successSoft: '#17301F',
  danger: '#E88A96',
  dangerSoft: '#3A1F26',
};
