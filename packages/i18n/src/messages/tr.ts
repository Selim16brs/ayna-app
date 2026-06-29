// Türkçe metinler — KAYNAK DİL (geliştirme önceliği, eksiksiz).
// kk.ts / ru.ts bu kümenin alt kümesidir; eksik anahtarlar tr'ye düşer (t() fallback).
// Not: Pazar dilleri Kazakça (kk) ve Rusça (ru); önce Türkçe tamamlanır, sonra çevrilir.
export const tr = {
  // Genel
  'common.ok': 'Tamam',
  'common.cancel': 'İptal',
  'common.continue': 'Devam et',
  'common.see_all': 'Tümü',
  'common.soon': 'Çok yakında',

  // Marka / dil
  'app.tagline': 'Güzellik, güvenle başlar',
  'language.choose': 'Dil seçin',
  'language.tr': 'Türkçe',
  'language.kk': 'Kazakça',
  'language.ru': 'Rusça',

  // Sekmeler
  'nav.discover': 'Keşfet',
  'nav.bookings': 'Randevular',
  'nav.circle': 'Circle',
  'nav.care': 'Bakım',
  'nav.profile': 'Profil',

  // Keşfet (ana ekran)
  'home.greeting': 'Hoş geldin',
  'home.subtitle': 'Güvendiğin uzmanı bul',
  'home.search': 'Uzman, salon veya hizmet ara',
  'home.featured': 'Yakınında öne çıkanlar',

  // Kategoriler
  'category.hair': 'Saç',
  'category.nails': 'Tırnak',
  'category.brows': 'Kaş & Kirpik',
  'category.makeup': 'Makyaj',
  'category.spa': 'Spa & Masaj',

  // Kampanya kartı
  'promo.title': 'İlk randevuna özel',
  'promo.subtitle': 'Seçili uzmanlarda %20 indirim',
  'promo.cta': 'Keşfet',

  // Uzman kartı
  'card.verified': 'Doğrulanmış',
  'card.campaign': 'Kampanya',
  'card.today': 'Bugün müsait',
  'card.starting': 'başlangıç',
  'card.friends_visited': 'arkadaşın gitti',

  // Yer tutucu ekranlar
  'bookings.title': 'Randevular',
  'circle.title': 'AYNA Circle',
  'care.title': 'Bakım takvimin',
  'profile.title': 'Profil',
  'screen.placeholder': 'Bu bölüm yakında burada olacak',

  // Sistem / domain
  'auth.otp.sent': 'Doğrulama kodu gönderildi',
  'auth.otp.invalid': 'Kod geçersiz veya süresi dolmuş',
  'booking.invalid_transition': 'Randevu durumu değiştirilemez',
  'review.not_eligible': 'Bu randevu değerlendirilemez',
  'safety.share.default_off': 'Konum paylaşımı varsayılan olarak kapalı',
} as const;

export type MessageKey = keyof typeof tr;
