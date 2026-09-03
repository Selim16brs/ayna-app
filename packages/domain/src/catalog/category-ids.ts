import { KATALOG } from './katalog.js';

/**
 * KATEGORİ KİMLİKLERİ VE SUNUCU TARAFI VARSAYILANLARI.
 *
 * ── LİSTE ARTIK BURADA DEĞİL ────────────────────────────────────────────
 *
 * Bu dosyada 12 kategori ELLE yazılıydı ve adları da (`nameTr`) burada
 * ikinci kez duruyordu. `AYNA_HIZMET_KATALOGU_BRIEF.md` §1 bunu açıkça
 * yasaklıyor: "İkinci bir liste, hard-coded kategori YASAKTIR."
 *
 * Kimlikler ve adlar artık `KATALOG`dan türetiliyor. Katalog büyüdüğünde
 * sunucunun kategori tablosu, admin paneli ve bakım periyotları kendi
 * kendine genişliyor — elle eşitlenecek ikinci bir yer yok.
 */

/** Kategori kimliği (`hair`, `lashes_brows`, …) — KATALOGDAN. */
export const CATEGORY_IDS = KATALOG.map((k) => k.id);

export type CategoryId = string;

/**
 * Kategori bazlı varsayılanlar.
 *
 * `maintenanceDays` — bakım hatırlatma periyodu (0 = periyodik değil).
 * `serviceMin`      — tipik hizmet süresi (slot hesabının başlangıç değeri).
 *
 * Bunlar AD ya da KİMLİK tanımlamıyor, katalogdaki kimliklere SAYI bağlıyor;
 * ikinci bir liste değiller. Admin panelden değiştirebilir — buradakiler
 * yalnız başlangıç.
 *
 * Her kategorinin girdisi olmak ZORUNDA: eksik olan panelde ayarsız kalır.
 * Test bunu katalogla karşılaştırıyor.
 */
export const CATEGORY_DEFAULTS: Record<string, { maintenanceDays: number; serviceMin: number }> = {
  hair: { maintenanceDays: 35, serviceMin: 90 },
  nails: { maintenanceDays: 15, serviceMin: 60 },
  lashes_brows: { maintenanceDays: 21, serviceMin: 90 },
  epilation: { maintenanceDays: 28, serviceMin: 45 },
  skin: { maintenanceDays: 30, serviceMin: 60 },
  // Makyaj tek seferlik: gelin ve çekim makyajının periyodik bakımı yok.
  makeup: { maintenanceDays: 0, serviceMin: 60 },
  massage: { maintenanceDays: 21, serviceMin: 60 },
  spa: { maintenanceDays: 45, serviceMin: 90 },
  // Vücut şekillendirme KÜR: seanslar haftalık, tek seans satılmıyor.
  body_contouring: { maintenanceDays: 7, serviceMin: 50 },
  hair_health: { maintenanceDays: 30, serviceMin: 55 },
  // Stil danışmanlığı bir projedir, tekrar eden bakım değil.
  style: { maintenanceDays: 0, serviceMin: 90 },
  wellness: { maintenanceDays: 7, serviceMin: 60 },
  // "Diğer" karışık: solaryumdan dövmeye. Ortak bir periyot uydurmak,
  // dövme yaptıran birine 45 günde bir hatırlatma göndermek olurdu.
  other: { maintenanceDays: 0, serviceMin: 60 },
};

/**
 * Kategorinin görünen bilgileri — sunucudaki `service_categories` tablosu
 * ve admin paneli için.
 *
 * `nameTr` ve sıra KATALOGDAN geliyor; burada yalnız panelin ihtiyaç
 * duyduğu ikon ve renk tonu ekleniyor.
 */
const IKON: Record<string, string> = {
  hair: 'cut-outline',
  nails: 'color-palette-outline',
  lashes_brows: 'eye-outline',
  epilation: 'flash-outline',
  skin: 'water-outline',
  makeup: 'brush-outline',
  massage: 'hand-left-outline',
  spa: 'flower-outline',
  body_contouring: 'body-outline',
  hair_health: 'medkit-outline',
  style: 'shirt-outline',
  wellness: 'leaf-outline',
  other: 'ellipsis-horizontal-circle-outline',
};

const TONLAR = ['rose', 'lavender', 'gold', 'sage', 'blue'] as const;

export const CATEGORY_META: Record<
  string,
  { nameTr: string; icon: string; tone: string; sortOrder: number }
> = Object.fromEntries(
  KATALOG.map((k, i) => [
    k.id,
    {
      nameTr: k.ad.tr,
      icon: IKON[k.id] ?? 'sparkles-outline',
      tone: TONLAR[i % TONLAR.length]!,
      // Brief §7.3: katalog sırası VARSAYILAN UI sırası; admin değiştirebilir
      // (override `service_categories.sort_order` içinde).
      sortOrder: i + 1,
    },
  ]),
);
