// Türkçe metinler — KAYNAK DİL (geliştirme önceliği).
// kk.ts ve ru.ts bu anahtar kümesini birebir takip eder.
// Not: Pazar dilleri Kazakça (kk) ve Rusça (ru); Türkçe geliştirme/anlaşılırlık içindir.
export const tr = {
  'common.ok': 'Tamam',
  'common.cancel': 'İptal',
  'common.continue': 'Devam et',
  'app.tagline': 'Güzellik, güvenle başlar',
  'language.choose': 'Dil seçin',
  'language.tr': 'Türkçe',
  'language.kk': 'Kazakça',
  'language.ru': 'Rusça',
  'home.greeting': 'Hoş geldin',
  'home.subtitle': 'Güvendiğin uzmanı bul',
  'home.section.today': 'AYNA Bugün',
  'home.upcoming.title': 'Yaklaşan randevu',
  'home.upcoming.subtitle': 'Cuma 14:00 · Saç boyama',
  'home.upcoming.badge': 'Onaylandı',
  'home.care.title': 'Bakım zamanı',
  'home.care.subtitle': 'Manikür yenileme zamanın yaklaşıyor',
  'home.friend.title': 'Arkadaş tavsiyesi',
  'home.friend.subtitle': '3 arkadaşın bu uzmana gitti',
  'home.next_note': 'Bu ilk ekran. Sıradaki: telefonla giriş (OTP).',
  'auth.otp.sent': 'Doğrulama kodu gönderildi',
  'auth.otp.invalid': 'Kod geçersiz veya süresi dolmuş',
  'booking.invalid_transition': 'Randevu durumu değiştirilemez',
  'review.not_eligible': 'Bu randevu değerlendirilemez',
  'safety.share.default_off': 'Konum paylaşımı varsayılan olarak kapalı',
} as const;

export type MessageKey = keyof typeof tr;
