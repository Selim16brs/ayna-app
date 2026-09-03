/**
 * ALT HİZMET VARSAYILANLARI — süre, başlangıç fiyatı, bakım döngüsü.
 *
 * KATALOG DEĞİL. Katalog (`@ayna/domain` → `KATALOG`) kimlikleri ve üç
 * dilli adları tutuyor; brief §1 ikinci bir liste yasaklıyor ve burada
 * ikinci bir liste YOK — bu dosya tek bir ad ya da kimlik tanımlamıyor,
 * yalnızca katalogdaki kimliklere sayı bağlıyor.
 *
 * Ayrı durmasının sebebi kapsam: katalog hem sunucuda hem uygulamada
 * okunuyor ve üründen bağımsız; süre/fiyat ise KAZAKİSTAN PİYASASINA ait
 * ve uzman kayıt olurken bunları kendi değiştiriyor. Fiyatı katalogun
 * içine koymak, ürün fiyatı güncellendiğinde brief'e ait bir dosyayı
 * kurcalamak demekti.
 *
 * ── DEĞERLER NEREDEN GELİYOR ────────────────────────────────────────────
 *
 * Eski taksonomideki (12 kategori) değerler kimlik eşleşmesiyle AYNEN
 * taşındı — piyasa araştırmasıyla konmuşlardı, katalog geçişi onları
 * sıfırlamak için bir sebep değil. Yalnız katalogla gelen yeni hizmetler
 * için yeni değer kondu.
 *
 * `periodDays` YOKSA hizmet periyodik değildir: bakım takvimi ona
 * "sırada" demez. Gelin makyajının 30 günde bir tekrarı yok.
 */

export interface HizmetVarsayilani {
  /** Varsayılan süre (dk) — uzman düzenleyebilir. */
  durationMin: number;
  /** Varsayılan başlangıç fiyatı (₸) — uzman düzenleyebilir. */
  price: number;
  /** Bakım döngüsü (gün). Yoksa periyodik değil. */
  periodDays?: number;
  /** Keşfet'te öne çıkan. */
  popular?: boolean;
}

/** Katalog kimliği → varsayılanlar. */
export const HIZMET_VARSAYILANI: Record<string, HizmetVarsayilani> = {
  // ── Saç ───────────────────────────────────────────────────────────────
  'hair.haircut': { durationMin: 60, price: 9000, periodDays: 49, popular: true },
  'hair.blowdry': { durationMin: 45, price: 7000, periodDays: 14 },
  'hair.coloring': { durationMin: 90, price: 15000, periodDays: 42, popular: true },
  'hair.balayage': { durationMin: 150, price: 28000, periodDays: 90 },
  'hair.keratin': { durationMin: 120, price: 22000, periodDays: 120 },
  'hair.straightening': { durationMin: 90, price: 18000, periodDays: 90 },
  'hair.extensions': { durationMin: 180, price: 60000, periodDays: 120 },
  'hair.event_hair': { durationMin: 90, price: 20000 },

  // ── Tırnak ────────────────────────────────────────────────────────────
  'nails.manicure': { durationMin: 45, price: 6000, periodDays: 15, popular: true },
  'nails.hw_manicure': { durationMin: 60, price: 7000, periodDays: 18 },
  'nails.pedicure': { durationMin: 60, price: 8000, periodDays: 30 },
  'nails.gel_polish': { durationMin: 60, price: 9000, periodDays: 21, popular: true },
  'nails.nail_extensions': { durationMin: 120, price: 18000, periodDays: 21 },
  'nails.nail_art': { durationMin: 90, price: 13000, periodDays: 21 },

  // ── Kirpik & Kaş ──────────────────────────────────────────────────────
  'lashes_brows.lash_ext': { durationMin: 90, price: 14000, periodDays: 21, popular: true },
  'lashes_brows.lash_lift': { durationMin: 60, price: 10000, periodDays: 42 },
  'lashes_brows.brow_shape': { durationMin: 30, price: 4000, periodDays: 21, popular: true },
  'lashes_brows.brow_lam': { durationMin: 60, price: 11000, periodDays: 42 },
  'lashes_brows.brow_tint': { durationMin: 30, price: 5000, periodDays: 30 },
  'lashes_brows.microblading': { durationMin: 120, price: 30000, periodDays: 365 },

  // ── Epilasyon ─────────────────────────────────────────────────────────
  'epilation.sugaring': { durationMin: 45, price: 7000, periodDays: 24, popular: true },
  'epilation.waxing': { durationMin: 45, price: 6000, periodDays: 24 },
  'epilation.laser': { durationMin: 30, price: 12000, periodDays: 30 },
  'epilation.electrolysis': { durationMin: 45, price: 15000, periodDays: 30 },

  // ── Cilt Bakımı ───────────────────────────────────────────────────────
  'skin.facial': { durationMin: 60, price: 12000, periodDays: 30, popular: true },
  'skin.cleansing': { durationMin: 75, price: 14000, periodDays: 30 },
  'skin.peeling': { durationMin: 45, price: 13000, periodDays: 30 },
  'skin.anti_age': { durationMin: 60, price: 18000, periodDays: 30 },

  // ── Makyaj ────────────────────────────────────────────────────────────
  'makeup.day_makeup': { durationMin: 60, price: 11000, popular: true },
  'makeup.bridal': { durationMin: 90, price: 25000 },
  'makeup.photo_makeup': { durationMin: 60, price: 15000 },
  'makeup.pmu': { durationMin: 120, price: 33000, periodDays: 365 },

  // ── Masaj ─────────────────────────────────────────────────────────────
  'massage.classic': { durationMin: 60, price: 12000, periodDays: 30, popular: true },
  'massage.anticellulite': { durationMin: 60, price: 14000, periodDays: 14 },
  'massage.lymph': { durationMin: 60, price: 14000, periodDays: 14 },
  'massage.body_wrap': { durationMin: 75, price: 16000, periodDays: 21 },

  // ── Spa & Hamam ───────────────────────────────────────────────────────
  'spa.spa_package': { durationMin: 90, price: 20000, periodDays: 45, popular: true },
  'spa.couple_spa': { durationMin: 120, price: 35000 },
  'spa.banya': { durationMin: 120, price: 15000, periodDays: 30 },
  'spa.sauna': { durationMin: 60, price: 8000, periodDays: 14 },
  'spa.float': { durationMin: 60, price: 14000, periodDays: 30 },
  'spa.salt_room': { durationMin: 45, price: 6000, periodDays: 14 },

  // ── Vücut Şekillendirme ───────────────────────────────────────────────
  // Kür hizmetleri: tek seans değil seri satılıyor, döngü de kısa.
  'body_contouring.lpg': { durationMin: 45, price: 12000, periodDays: 7 },
  'body_contouring.cavitation': { durationMin: 60, price: 15000, periodDays: 7 },
  'body_contouring.pressotherapy': { durationMin: 45, price: 9000, periodDays: 7 },
  'body_contouring.rf_lifting': { durationMin: 60, price: 16000, periodDays: 14 },
  'body_contouring.cryolipolysis': { durationMin: 60, price: 35000, periodDays: 45 },
  'body_contouring.ems': { durationMin: 30, price: 12000, periodDays: 7 },

  // ── Saç Sağlığı ───────────────────────────────────────────────────────
  // Trikolog KONSÜLTASYON: tekrarı hastaya göre, takvime bağlanmıyor.
  'hair_health.trichology': { durationMin: 45, price: 15000 },
  'hair_health.scalp_care': { durationMin: 60, price: 13000, periodDays: 30 },

  // ── İmaj & Stil ───────────────────────────────────────────────────────
  'style.color_analysis': { durationMin: 90, price: 18000 },
  'style.stylist': { durationMin: 60, price: 15000 },
  'style.wardrobe': { durationMin: 120, price: 20000 },
  'style.shopping': { durationMin: 180, price: 25000 },

  // ── Wellness ──────────────────────────────────────────────────────────
  'wellness.yoga': { durationMin: 60, price: 6000, periodDays: 7 },
  'wellness.pilates': { durationMin: 60, price: 7000, periodDays: 7 },
  'wellness.stretching': { durationMin: 60, price: 6000, periodDays: 7 },

  // ── Diğer ─────────────────────────────────────────────────────────────
  'other.solarium': { durationMin: 15, price: 3000, periodDays: 14 },
  'other.spray_tan': { durationMin: 30, price: 9000, periodDays: 14 },
  'other.henna': { durationMin: 60, price: 12000 },
  'other.kids_haircut': { durationMin: 30, price: 5000, periodDays: 42 },
  'other.piercing': { durationMin: 30, price: 8000 },
  'other.tattoo': { durationMin: 120, price: 30000 },
  'other.podology': { durationMin: 60, price: 12000, periodDays: 45 },
};

/**
 * Varsayılanı olmayan hizmet için ÇÖKME YOK, UYDURMA DA YOK.
 *
 * Katalog büyüdüğünde buraya satır eklenmezse ekran boş fiyat göstermek
 * yerine ölçülü bir taban kullanıyor; test katalogla bu dosyanın eksiksiz
 * örtüştüğünü zaten kontrol ediyor, bu yalnız son savunma.
 */
export const TABAN: HizmetVarsayilani = { durationMin: 60, price: 10000 };

export const varsayilan = (id: string): HizmetVarsayilani => HIZMET_VARSAYILANI[id] ?? TABAN;
