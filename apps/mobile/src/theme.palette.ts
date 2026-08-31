// Renk paleti — react-native'e BAĞIMSIZ.
//
// theme.ts `Platform` için react-native'i import ediyor; palet orada kalınca
// Node testleri onu derleyemiyordu ("Unexpected typeof"). Kontrast denetimi
// paletin test edilebilir olmasını gerektirdiği için ayrıldı.
// theme.ts bunları yeniden dışa verir; çağrı yerleri değişmez.

export const lightColors = {
  // Zemin
  bg: '#FBF8F6', // Porselen — uygulama zemini
  bgSunken: '#F5E6EB', // Yumuşak Pudra — çökertilmiş bölüm
  surface: '#FFFFFF', // Kart
  surfaceMuted: '#F5E6EB', // Kart içi panel, çip, ikincil buton dolgusu

  // Metin
  ink: '#261F25', // Koyu Mürekkep — başlık, fiyat, ikon
  inkSoft: '#564E56',
  muted: '#6F666C', // Duman — ikincil metin
  onColor: '#FFFFFF',

  // Birincil eylem
  accent: '#5A2A55', // Ayna Mürdüm — CTA, aktif sekme
  accentSoft: '#F5E6EB',
  onAccent: '#FBF8F6', // mürdüm üstünde AÇIK yazı
  accentFg: '#5A2A55', // beyaz zeminde eylem metni/ikonu

  // Marka aksanları
  rose: '#D97798', // Gül — küçük vurgu, favori, koyu yüzeyde eylem
  roseSoft: '#F7E4E7',
  sage: '#547565', // Adaçayı — onay
  sageSoft: '#E1EDE6',
  lavender: '#8E7BA8',
  lavenderSoft: '#EDE8F2',
  blue: '#6E86A8', // bilgi
  blueSoft: '#E6EAF0',
  // §15 — açık temada yumuşak zeminlerde 4,48:1 idi (eşik 4,5). Üç durum
  // rengi de %6 koyulaştırıldı: gold 4,48→4,97 · success 4,25→4,75 ·
  // danger 4,48→4,94. Koyu temadakiler zaten eşiğin üstündeydi, dokunulmadı.
  gold: '#905E1D', // Kehribar — beklemede, uyarı, yıldız
  goldSoft: '#FAF2E6',
  // geriye dönük uyumluluk (eski isimler yeni paletle eşlendi)
  orange: '#9A641F',
  teal: '#547565',
  plum: '#5A2A55',

  // Çizgi / durum
  // ── TERS YÜZEY (yüzen alt menü, toast, vaat kartı, arama düğmesi) ──
  //
  // Bu yüzeyler sayfa zemininin TERSİDİR: açık temada koyu, koyu temada
  // YÜKSELTİLMİŞ koyu. Eskiden zemin olarak `colors.ink` — yani METİN rengi —
  // kullanılıyordu. ink koyu temada açık renge döndüğü için bu yüzeyler
  // bembeyaz oluyor, üstlerindeki açık yazı/ikon görünmez hâle geliyordu
  // (Toast koyu modda tamamen okunmuyordu).
  // ── SABİT AÇIK YÜZEY üstündeki yazı ──
  //
  // Bazı kartların gradyanı temadan BAĞIMSIZ ve her zaman açıktır (teklif
  // kartlarının pastel zemini gibi). Üstlerinde `ink` kullanmak koyu modda
  // AÇIK ÜSTÜNE AÇIK yazı demekti — başlıklar görünmüyordu.
  // Bu ikisi iki temada da AYNI kalır; yüzey değişmiyorsa yazı da değişmemeli.
  onPastel: '#261F25',
  onPastelSoft: '#564E56',
  inverse: '#261F25',
  onInverse: '#FBF8F6',
  onInverseMuted: 'rgba(251,248,246,0.66)',
  // Bar üstündeki kademeli geçiş — sayfa zemininden türetilir.
  fadeFrom: 'rgba(251,248,246,0)',
  fadeMid: 'rgba(251,248,246,0.72)',
  line: '#F0E7EC',
  lineStrong: '#E8D5DD', // ikincil buton çerçevesi, kesikli sınır
  success: '#4E6D5E',
  successSoft: '#E1EDE6',
  danger: '#A93E4D', // Mercan Kırmızı — iptal, hata
  dangerSoft: '#F7E4E7',
} as const;

// ── Koyu tema (mürdüm-mürekkep taban; siyah DEĞİL) ───────────────────────
export type ColorTokens = { [K in keyof typeof lightColors]: string };

export const darkColors: ColorTokens = {
  bg: '#1A1419',
  bgSunken: '#140F14',
  surface: '#241C23',
  surfaceMuted: '#2E2430',

  ink: '#F3ECF0',
  inkSoft: '#C4B7BF',
  muted: '#8F868C',
  onColor: '#FFFFFF',

  // Koyu zeminde mürdüm okunmaz → eylem rengi Gül
  accent: '#D97798',
  accentSoft: '#3A2430',
  onAccent: '#261F25', // gül üstünde KOYU yazı
  accentFg: '#E794AF',

  rose: '#E794AF',
  roseSoft: '#3A2430',
  sage: '#7FA38E',
  sageSoft: '#22302A',
  lavender: '#AA9AC4',
  lavenderSoft: '#2C2636',
  blue: '#8DA3C4',
  blueSoft: '#232B36',
  gold: '#C79350',
  goldSoft: '#33270F',
  orange: '#C79350',
  teal: '#7FA38E',
  plum: '#AA9AC4',

  // Koyu temada ters yüzey zeminden AYRIŞMALI: bg #1A1419 üzerinde yükseltilmiş.
  onPastel: '#261F25',
  onPastelSoft: '#564E56',
  inverse: '#403442', // zeminden 1.54:1 ayrışır; yazı kontrastı 10.1:1 kalır
  onInverse: '#F3ECF0',
  onInverseMuted: 'rgba(243,236,240,0.62)',
  fadeFrom: 'rgba(26,20,25,0)',
  fadeMid: 'rgba(26,20,25,0.72)',
  line: '#3A2F38',
  lineStrong: '#4A3C47',
  success: '#7FA38E',
  successSoft: '#22302A',
  danger: '#D9707F',
  dangerSoft: '#3A2126',
};
