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
  'app.tagline': 'Gerçek bağlantı · Uzman erişimi · Güvenle güzellik',
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

  // Uzman/salon profili
  'pro.book': 'Randevu Al',
  'pro.about': 'Hakkında',
  'pro.service_ratings': 'Hizmet bazlı puan',
  'pro.services': 'Hizmetler',
  'pro.portfolio': 'Doğrulanmış işlemler',
  'pro.reviews': 'Değerlendirmeler',
  'pro.no_data': 'Yeterli veri yok',
  'pro.min': 'dk',
  'pro.experience': 'yıl deneyim',
  'pro.verified_member': 'Doğrulanmış AYNA üyesi',
  'pro.select_service': 'Hizmet seçin',
  'pro.reviews_based': 'doğrulanmış değerlendirme',
  'pro.friends_here': 'arkadaşın buraya gitti',

  // Ana akış — giriş aksiyonları
  'home.how': 'Nasıl başlamak istersin?',
  'action.photo_quote.title': 'Fotoğrafla teklif al',
  'action.photo_quote.subtitle': 'Modeli yükle, teklifler gelsin',
  'action.demand.title': 'Talep oluştur',
  'action.demand.subtitle': 'Fiyatını sen belirle',

  // Model 1 — teklif oluştur
  'quote.new.title': 'Fotoğrafla teklif al',
  'quote.new.photo': 'Fotoğraf ekle',
  'quote.new.photo_hint': 'İstediğin modelin fotoğrafını yükle',
  'quote.new.change_photo': 'Fotoğrafı değiştir',
  'quote.new.category': 'Kategori',
  'quote.new.note': 'Not (isteğe bağlı)',
  'quote.new.note_ph': 'Detay ekle: saç boyu, renk, bölge...',
  'quote.new.submit': 'Teklif iste',

  // Gönderildi
  'quote.sent.title': 'İsteğin gönderildi',
  'quote.sent.subtitle': 'Satıcılardan teklifler birazdan gelecek',
  'quote.sent.view': 'Teklifleri gör',

  // Model 1 — gelen teklifler
  'quotes.title': 'Gelen teklifler',
  'quotes.count': 'satıcı teklif gönderdi',
  'quotes.sort': 'Sırala',
  'quotes.filter.rating': 'Puan',
  'quotes.filter.price': 'Fiyat',
  'quotes.pick': 'Saat seç',
  'quotes.eta': 'tahmini süre',

  // Model 2 — talep oluştur
  'demand.new.title': 'Talep oluştur',
  'demand.new.desc': 'Ne yaptırmak istiyorsun?',
  'demand.new.desc_ph': 'Örn. gelin saçı + makyaj, evime gelsin',
  'demand.new.budget': 'Bütçen',
  'demand.new.budget_ph': 'Fiyat (₸)',
  'demand.new.submit': 'Talebi yayınla',
  'demand.results.title': 'Gelen kabuller',
  'demand.results.count': 'satıcı bütçeni kabul etti',
  'demand.results.budget': 'Bütçen',
  'demand.accepted': 'Kabul etti',

  // Randevular (kaynağa göre ayrı sekmeler)
  'bookings.tab.direct': 'Arama',
  'bookings.tab.photo': 'Foto teklif',
  'bookings.tab.demand': 'Talep',
  'bookings.empty': 'Bu yoldan randevun yok',
  'booking.status.confirmed': 'Onaylandı',
  'booking.status.pending': 'Onay bekliyor',
  'booking.status.completed': 'Tamamlandı',

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
