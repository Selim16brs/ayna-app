// UYGULAMANIN KATEGORİ LİSTESİ — tek kaynak.
//
// SORUN: liste iki yerde ayrı ayrı yazılıydı. Mobil taksonomide 12 kategori
// vardı, sunucudaki admin varsayılanında 8. Eksik dördün İKİSİ AKTİFTİ
// (`pmu`, `bridal`): o kategorilerde hizmet veren uzmanlar vardı ama admin
// panelinden bakım periyodu ve hizmet süresi ayarlanamıyordu — panelde
// kategori hiç görünmüyordu.
//
// İki listeyi elle eşit tutmak sürdürülemez: biri değişince diğeri sessizce
// geride kalır. Kimlikler artık BURADA; taksonomi ve sunucu buradan besleniyor
// ve testler ikisinin ayrışmasını engelliyor.

/** Kategori kimliği — hizmet kimliklerinin de öneki (`hair-cut` → `hair`). */
export const CATEGORY_IDS = [
  'hair',
  'nails',
  'lashes',
  'brows',
  'makeup',
  'skincare',
  'epilation',
  'spa',
  'pmu',
  'bridal',
  'wellness',
  'style',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

/**
 * Kategori bazlı varsayılanlar.
 *
 * `maintenanceDays` — bakım hatırlatma periyodu (0 = periyodik değil).
 * `serviceMin`      — tipik hizmet süresi (slot hesabının başlangıç değeri).
 *
 * Admin bunları panelden değiştirebilir; buradakiler yalnız BAŞLANGIÇ.
 * Her kategorinin bir girdisi olmak ZORUNDA — eksik olan panelde görünmez.
 */
export const CATEGORY_DEFAULTS: Record<
  CategoryId,
  { maintenanceDays: number; serviceMin: number }
> = {
  hair: { maintenanceDays: 35, serviceMin: 90 },
  nails: { maintenanceDays: 15, serviceMin: 60 },
  lashes: { maintenanceDays: 21, serviceMin: 120 },
  brows: { maintenanceDays: 21, serviceMin: 30 },
  makeup: { maintenanceDays: 0, serviceMin: 60 },
  skincare: { maintenanceDays: 30, serviceMin: 60 },
  epilation: { maintenanceDays: 28, serviceMin: 45 },
  spa: { maintenanceDays: 30, serviceMin: 90 },
  // ── Panelde EKSİK olanlar (bu dosyanın var oluş sebebi) ──
  // Kalıcı makyaj: dokunuş aralığı uzun, seans uzun.
  pmu: { maintenanceDays: 365, serviceMin: 150 },
  // Gelin hazırlığı: tek seferlik, periyodik bakım yok.
  bridal: { maintenanceDays: 0, serviceMin: 180 },
  // Aşağıdaki ikisi taksonomide `active: false` — yine de burada olmalılar
  // ki açıldıkları gün panelde ayarsız kalmasınlar.
  wellness: { maintenanceDays: 7, serviceMin: 60 },
  style: { maintenanceDays: 0, serviceMin: 60 },
};

/**
 * Kategorinin görünen bilgileri — sunucudaki `service_categories` tablosunu
 * uygulamayla aynı tutmak için.
 *
 * Tablo 8 satır içeriyordu, uygulamada 12 kategori vardı: `pmu` ve `bridal`
 * AKTİF olmasına rağmen admin panelinde HİÇ görünmüyordu (panel tabloyu
 * okuyor). Satırlar elle eklendiği için liste sessizce geride kalmıştı.
 */
export const CATEGORY_META: Record<
  CategoryId,
  { nameTr: string; icon: string; tone: string; sortOrder: number }
> = {
  hair: { nameTr: 'Saç', icon: 'cut-outline', tone: 'rose', sortOrder: 1 },
  nails: { nameTr: 'Tırnak', icon: 'color-palette-outline', tone: 'lavender', sortOrder: 2 },
  lashes: { nameTr: 'Kirpik', icon: 'sparkles-outline', tone: 'gold', sortOrder: 3 },
  brows: { nameTr: 'Kaş', icon: 'eye-outline', tone: 'sage', sortOrder: 4 },
  makeup: { nameTr: 'Makyaj', icon: 'brush-outline', tone: 'rose', sortOrder: 5 },
  skincare: { nameTr: 'Cilt bakımı', icon: 'water-outline', tone: 'blue', sortOrder: 6 },
  epilation: { nameTr: 'Epilasyon', icon: 'flash-outline', tone: 'gold', sortOrder: 7 },
  spa: { nameTr: 'Spa & masaj', icon: 'body-outline', tone: 'sage', sortOrder: 8 },
  pmu: { nameTr: 'Kalıcı makyaj', icon: 'color-wand-outline', tone: 'lavender', sortOrder: 9 },
  bridal: { nameTr: 'Gelin paketi', icon: 'flower-outline', tone: 'rose', sortOrder: 10 },
  wellness: { nameTr: 'Wellness', icon: 'barbell-outline', tone: 'sage', sortOrder: 11 },
  style: { nameTr: 'Stil danışmanlığı', icon: 'shirt-outline', tone: 'blue', sortOrder: 12 },
};
