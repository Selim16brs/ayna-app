// RANDEVU DURUM MAKİNESİ — tek doğruluk kaynağı.
//
// Kaynak: AYNA_RANDEVU_AKISI_BRIEF.md §3 (31.08.2026, ürün sahibi).
// Brief §0: "Backend ve UI aynı durum diyagramından türetilir."
//
//   TASLAK → ONAY_BEKLIYOR → (DEGISIKLIK_ONERILDI ⇄ KARSI_ONERI) → DEPOZITO_BEKLIYOR
//          → KESINLESTI → [ERTELEME_ONERILDI] → HIZMET_GUNU → ODEME_BEKLIYOR
//          → TAMAMLANDI → DEGERLENDIRME → KAPANDI
//
//   Terminal: IPTAL_MUSTERI, IPTAL_UZMAN, OTOMATIK_DUSTU,
//             NO_SHOW_MUSTERI, NO_SHOW_UZMAN, UYUSMAZLIK
//
// İSİMLER BRIEF'TEN. Teknik isimlendirme bize ait olsa da belgedeki adları
// birebir kullanmak, doküman ile kod arasındaki çeviriyi — dolayısıyla o
// çeviride yapılacak hataları — tamamen ortadan kaldırıyor.
//
// ESKİ MAKİNE TÜMDEN KALDIRILDI (confirmed/deposit_pending/completed_pending
// vb.). Brief "eskisi komple silinsin, hiçbir çakışma olmamalı" diyor; iki
// makineyi bir arada tutmak, bugün komisyonda yaşadığımız "aynı iş için iki
// kural" sorununun aynısını üretirdi.

export const BOOKING_STATUSES = [
  // ── Ana hat ──
  'taslak', // müşteri talebi hazırlıyor; henüz gönderilmedi, slot tutulmaz
  'onay_bekliyor', // talep gönderildi, SLOT KİLİTLİ, uzmanın 3 saati işliyor
  'degisiklik_onerildi', // uzman tarih/saat/hizmet değiştirdi; müşterinin yanıtı bekleniyor
  'karsi_oneri', // müşteri farklı slot önerdi; uzman yalnız Kabul/Red verebilir
  'depozito_bekliyor', // uzman onayladı; müşterinin 10 dakikası işliyor
  'kesinlesti', // dekont yüklendi → randevu garanti (admin doğrulaması SONRA)
  'erteleme_onerildi', // taraflardan biri yeni slot önerdi; depozito taşınacak
  'hizmet_gunu', // randevu saati geldi
  'odeme_bekliyor', // hizmet bitti; kalan %90 uzmana doğrudan ödenecek
  'tamamlandi', // uzman "ödeme aldım" dedi (ya da 24 saat doldu)
  'degerlendirme', // 7 günlük değerlendirme penceresi açık
  'kapandi', // pencere kapandı; kayıt arşiv

  // ── Terminal ──
  'iptal_musteri',
  'iptal_uzman',
  'otomatik_dustu', // uzman cevapsız kaldı VEYA depozito süresinde ödenmedi
  'no_show_musteri',
  'no_show_uzman',
  'uyusmazlik', // itiraz açıldı → admin uzlaşma kaydı
] as const;

export type BookingState = (typeof BOOKING_STATUSES)[number];

/**
 * Slotu TUTAN durumlar. Brief §4.2: talep gönderildiği an slot kilitlenir,
 * aynı slotu ikinci müşteri talep edemez.
 *
 * `taslak` tutmaz (henüz gönderilmedi) — aksi hâlde ekranı açıp bırakan
 * herkes uzmanın takvimini kilitlerdi.
 */
export const SLOT_HOLDING_STATES: readonly BookingState[] = [
  'onay_bekliyor',
  'degisiklik_onerildi',
  'karsi_oneri',
  'depozito_bekliyor',
  'kesinlesti',
  'erteleme_onerildi',
  'hizmet_gunu',
  'odeme_bekliyor',
];

/** Her durumun İZİN VERİLEN hedefleri. Listede olmayan geçiş reddedilir. */
export const ALLOWED_TRANSITIONS: Record<BookingState, readonly BookingState[]> = {
  // Gönderilince slot kilitlenir; gönderilmeden vazgeçilebilir.
  taslak: ['onay_bekliyor', 'iptal_musteri'],

  // §4.2 — uzmanın 3 saati. Süre dolarsa ya da randevuya 3 saatten az kalırsa
  // OTOMATIK_DUSTU; slot açılır.
  onay_bekliyor: [
    'depozito_bekliyor', // uzman onayladı
    'degisiklik_onerildi', // uzman tarih/saat/hizmet değiştirdi
    'otomatik_dustu',
    'iptal_musteri',
    'iptal_uzman',
  ],

  // §4.3 — müşteri: Kabul / Red / Karşı öner.
  degisiklik_onerildi: [
    'depozito_bekliyor', // müşteri kabul etti
    'karsi_oneri', // müşteri farklı slot önerdi
    'iptal_musteri', // müşteri reddetti → randevu kapanır, slot açılır
    'otomatik_dustu',
  ],

  // §4.3 — MAKSİMUM 1 KARŞI ÖNERİ TURU. Uzman yalnız Kabul/Red verir;
  // buradan tekrar `degisiklik_onerildi`ye dönüş YOK — sonsuz ping-pong yasak.
  karsi_oneri: [
    'depozito_bekliyor', // uzman kabul etti
    'iptal_uzman', // uzman reddetti → randevu kapanır
    'otomatik_dustu',
  ],

  // §4.4 — 10 dakika. Dekont yüklendiği AN kesinleşir; admin doğrulaması sonra.
  depozito_bekliyor: ['kesinlesti', 'otomatik_dustu', 'iptal_musteri', 'iptal_uzman'],

  // §4.5–4.7 — bekleme dönemi. İptal kuralları 3 saat eşiğine bağlı.
  kesinlesti: ['erteleme_onerildi', 'hizmet_gunu', 'iptal_musteri', 'iptal_uzman'],

  // §4.6 — kabul: depozito yeni tarihe taşınır. Red: ESKİ randevu geçerli kalır,
  // yani `kesinlesti`ye geri döner.
  erteleme_onerildi: ['kesinlesti', 'iptal_musteri', 'iptal_uzman'],

  // §4.8 — "gelmedi" butonları randevu saatinden 15 dk sonra aktifleşir.
  hizmet_gunu: ['odeme_bekliyor', 'no_show_musteri', 'no_show_uzman', 'iptal_uzman'],

  // §4.9 — müşteri "ödeme yaptım" → uzman "ödeme aldım" → TAMAMLANDI.
  // Uzman 24 saat sessiz kalırsa otomatik onay. "Ödeme gelmedi" → UYUSMAZLIK.
  odeme_bekliyor: ['tamamlandi', 'uyusmazlik'],

  // §4.11 — değerlendirme penceresi 7 gün.
  tamamlandi: ['degerlendirme'],
  degerlendirme: ['kapandi'],
  kapandi: [],

  // §4.8 — "gelmedi" beyanına 24 saat içinde itiraz edilirse uzlaşma açılır.
  no_show_musteri: ['uyusmazlik'],
  no_show_uzman: ['uyusmazlik'],

  // §4.9 — uyuşmazlıkta puan yüklenmez ama DEĞERLENDİRME YİNE AÇILIR.
  uyusmazlik: ['degerlendirme', 'kapandi'],

  iptal_musteri: [],
  iptal_uzman: [],
  otomatik_dustu: [],
};

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: BookingState,
    readonly to: BookingState,
  ) {
    super(`Randevu '${from}' durumundan '${to}' durumuna geçemez`);
    this.name = 'InvalidTransitionError';
  }
}

export function isBookingState(v: unknown): v is BookingState {
  return typeof v === 'string' && (BOOKING_STATUSES as readonly string[]).includes(v);
}

export function canTransition(from: BookingState, to: BookingState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: BookingState, to: BookingState): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

/** Kapalı kayıt: hiçbir yere gidemez. */
export function isTerminal(status: BookingState): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

/** Bu durumdaki randevu uzmanın takviminde yer tutuyor mu? */
export function holdsSlot(status: BookingState): boolean {
  return SLOT_HOLDING_STATES.includes(status);
}

/**
 * Brief §4.7 / §4.8 — 3 SAAT EŞİĞİ. Ücretsiz iptal, erteleme ve otomatik
 * düşme kararlarının hepsi bu tek eşiğe bakar; ayrı ayrı sayı yazmak, aynı
 * kuralın birden çok yerde farklı davranmasına yol açardı.
 */
export const IPTAL_ESIGI_SAAT = 3;

/** Randevuya 3 saatten az mı kaldı? (ücretsiz iptal ve erteleme kapanır) */
export function esikGecti(startMs: number, now = Date.now()): boolean {
  return startMs - now < IPTAL_ESIGI_SAAT * 60 * 60 * 1000;
}
