import type { Ionicons } from '@expo/vector-icons';
import type { MessageKey } from '@ayna/i18n';

type IoniconName = keyof typeof Ionicons.glyphMap;

/**
 * AYNA — MERKEZİ KATEGORİ MİMARİSİ (tek doğruluk kaynağı).
 * İki seviye: Ana kategori (Keşfet + talep akışı hedeflemesi) → Alt hizmet
 * (uzman kaydında fiyat+süre girer; bakım takvimi periyodu burada tanımlı).
 *
 * Kullanım: Keşfet kategorileri, talep akışı, uzman/salon kayıt hizmet seçimi, bakım takvimi.
 * Diller: TR/KK/RU — alt hizmet adları burada (merkezi sözlük); ana kategori etiketi packages/i18n'de.
 * "Diğer" YOK (moderasyonsuz çöp talep üretir; kullanıcı Mod 2'de serbest metinle anlatır).
 * v1: ilk 10 kategori açık; Sağlıklı Yaşam & Stil admin panelde arz oluşunca açılır (active=false).
 */

export type TaxLocale = 'tr' | 'kk' | 'ru';
export interface Tri {
  tr: string;
  kk: string;
  ru: string;
}

export function tri(t: Tri, locale: string): string {
  return t[locale as TaxLocale] ?? t.tr;
}

export interface TaxService {
  id: string; // örn 'hair-color'
  label: Tri;
  durationMin: number; // varsayılan süre (uzman düzenleyebilir)
  price: number; // varsayılan başlangıç fiyatı (₸)
  periodDays?: number; // bakım döngüsü — bakım takvimi bunu kullanır (yoksa periyodik değil)
  popular?: boolean;
}

export interface TaxCategory {
  id: string; // rota + sektör kimliği (KALICI — değiştirme): hair, nails, ...
  labelKey: MessageKey; // ana kategori etiketi (packages/i18n — 3 dil)
  icon: IoniconName;
  active: boolean; // v1'de açık mı (admin panelde parametrik)
  services: TaxService[];
}

export const TAXONOMY: TaxCategory[] = [
  {
    id: 'hair',
    labelKey: 'category.hair',
    icon: 'cut-outline',
    active: true,
    services: [
      { id: 'hair-cut', label: { tr: 'Kesim & fön', kk: 'Қию & кептіру', ru: 'Стрижка и укладка' }, durationMin: 60, price: 9000, popular: true },
      { id: 'hair-color', label: { tr: 'Saç boyama (kök)', kk: 'Шаш бояу (түбір)', ru: 'Окрашивание (корни)' }, durationMin: 90, price: 15000, periodDays: 42, popular: true },
      { id: 'hair-balayage', label: { tr: 'Röfle / Balayage', kk: 'Мелирлеу / Балаяж', ru: 'Мелирование / Балаяж' }, durationMin: 150, price: 28000 },
      { id: 'hair-keratin', label: { tr: 'Keratin / Botoks', kk: 'Кератин / Ботокс', ru: 'Кератин / Ботокс' }, durationMin: 120, price: 22000, periodDays: 120 },
      { id: 'hair-care', label: { tr: 'Saç bakımı', kk: 'Шаш күтімі', ru: 'Уход за волосами' }, durationMin: 60, price: 12000 },
      { id: 'hair-style', label: { tr: 'Şekillendirme / Fön', kk: 'Сәндеу / Кептіру', ru: 'Укладка' }, durationMin: 45, price: 7000 },
      { id: 'hair-braid', label: { tr: 'Örgü', kk: 'Өру', ru: 'Плетение' }, durationMin: 60, price: 8000 },
      { id: 'hair-bridal', label: { tr: 'Gelin saçı', kk: 'Қалыңдық шашы', ru: 'Свадебная причёска' }, durationMin: 90, price: 20000 },
    ],
  },
  {
    id: 'nails',
    labelKey: 'category.nails',
    icon: 'color-palette-outline',
    active: true,
    services: [
      { id: 'nails-classic', label: { tr: 'Klasik manikür', kk: 'Классикалық маникюр', ru: 'Классический маникюр' }, durationMin: 45, price: 6000, periodDays: 15, popular: true },
      { id: 'nails-hardware', label: { tr: 'Aparat manikür', kk: 'Аппараттық маникюр', ru: 'Аппаратный маникюр' }, durationMin: 60, price: 7000, periodDays: 18 },
      { id: 'nails-gel', label: { tr: 'Jel / Kalıcı oje', kk: 'Гель-лак', ru: 'Гель-лак' }, durationMin: 60, price: 9000, periodDays: 21, popular: true },
      { id: 'nails-extension', label: { tr: 'Protez tırnak', kk: 'Тырнақ ұзарту', ru: 'Наращивание ногтей' }, durationMin: 120, price: 18000, periodDays: 21 },
      { id: 'nails-art', label: { tr: 'Nail art', kk: 'Nail art', ru: 'Дизайн ногтей' }, durationMin: 90, price: 13000 },
      { id: 'nails-pedi', label: { tr: 'Pedikür', kk: 'Педикюр', ru: 'Педикюр' }, durationMin: 60, price: 8000, periodDays: 30 },
    ],
  },
  {
    id: 'lashes',
    labelKey: 'category.lashes',
    icon: 'sparkles-outline',
    active: true,
    services: [
      { id: 'lashes-classic', label: { tr: 'İpek kirpik', kk: 'Классикалық кірпік', ru: 'Классическое наращивание' }, durationMin: 90, price: 14000, periodDays: 21, popular: true },
      { id: 'lashes-volume', label: { tr: 'Volüm teknikleri', kk: 'Көлемді кірпік', ru: 'Объёмное наращивание' }, durationMin: 120, price: 18000, periodDays: 21 },
      { id: 'lashes-lift', label: { tr: 'Lifting / Laminasyon', kk: 'Лифтинг / Ламинация', ru: 'Ламинирование ресниц' }, durationMin: 60, price: 10000, periodDays: 42 },
      { id: 'lashes-tint', label: { tr: 'Kirpik boyama', kk: 'Кірпік бояу', ru: 'Окрашивание ресниц' }, durationMin: 30, price: 5000 },
    ],
  },
  {
    id: 'brows',
    labelKey: 'category.brows',
    icon: 'eye-outline',
    active: true,
    services: [
      { id: 'brows-shape', label: { tr: 'Şekillendirme', kk: 'Қас түзету', ru: 'Коррекция бровей' }, durationMin: 30, price: 4000, periodDays: 21, popular: true },
      { id: 'brows-lam', label: { tr: 'Laminasyon', kk: 'Қас ламинациясы', ru: 'Ламинирование бровей' }, durationMin: 60, price: 11000, periodDays: 42 },
      { id: 'brows-tint', label: { tr: 'Boyama', kk: 'Қас бояу', ru: 'Окрашивание бровей' }, durationMin: 30, price: 5000, periodDays: 30 },
      { id: 'brows-henna', label: { tr: 'Kına', kk: 'Хна', ru: 'Хна для бровей' }, durationMin: 40, price: 6000, periodDays: 30 },
      { id: 'brows-micro', label: { tr: 'Microblading / Powder', kk: 'Микроблейдинг / Pudra', ru: 'Микроблейдинг / Пудровые' }, durationMin: 120, price: 30000 },
    ],
  },
  {
    id: 'makeup',
    labelKey: 'category.makeup',
    icon: 'brush-outline',
    active: true,
    services: [
      { id: 'makeup-day', label: { tr: 'Günlük makyaj', kk: 'Күнделікті макияж', ru: 'Дневной макияж' }, durationMin: 45, price: 9000 },
      { id: 'makeup-evening', label: { tr: 'Gece / Davet makyajı', kk: 'Кешкі макияж', ru: 'Вечерний макияж' }, durationMin: 60, price: 13000, popular: true },
      { id: 'makeup-bridal', label: { tr: 'Gelin makyajı', kk: 'Қалыңдық макияжы', ru: 'Свадебный макияж' }, durationMin: 90, price: 25000 },
      { id: 'makeup-photo', label: { tr: 'Çekim makyajı', kk: 'Түсірілім макияжы', ru: 'Макияж для съёмки' }, durationMin: 60, price: 15000 },
    ],
  },
  {
    id: 'skincare',
    labelKey: 'category.skincare',
    icon: 'water-outline',
    active: true,
    services: [
      { id: 'skin-facial', label: { tr: 'Klasik yüz bakımı', kk: 'Классикалық бет күтімі', ru: 'Классический уход за лицом' }, durationMin: 60, price: 12000, periodDays: 30, popular: true },
      { id: 'skin-clean', label: { tr: 'Temizleme', kk: 'Тазалау', ru: 'Чистка лица' }, durationMin: 75, price: 14000, periodDays: 30 },
      { id: 'skin-peel', label: { tr: 'Peeling', kk: 'Пилинг', ru: 'Пилинг' }, durationMin: 45, price: 13000, periodDays: 30 },
      { id: 'skin-antiage', label: { tr: 'Anti-age uygulama', kk: 'Анти-эйдж процедурасы', ru: 'Анти-возрастной уход' }, durationMin: 60, price: 18000 },
      { id: 'skin-massage', label: { tr: 'Yüz masajı', kk: 'Бет массажы', ru: 'Массаж лица' }, durationMin: 45, price: 9000 },
    ],
  },
  {
    id: 'epilation',
    labelKey: 'category.epilation',
    icon: 'flash-outline',
    active: true,
    services: [
      { id: 'epil-sugar', label: { tr: 'Şugaring', kk: 'Шугаринг', ru: 'Шугаринг' }, durationMin: 45, price: 7000, periodDays: 24, popular: true },
      { id: 'epil-wax', label: { tr: 'Ağda', kk: 'Балауыз', ru: 'Восковая депиляция' }, durationMin: 45, price: 6000, periodDays: 24 },
      { id: 'epil-laser', label: { tr: 'Lazer epilasyon', kk: 'Лазерлік эпиляция', ru: 'Лазерная эпиляция' }, durationMin: 30, price: 12000, periodDays: 30 },
    ],
  },
  {
    id: 'spa',
    labelKey: 'category.spa',
    icon: 'body-outline',
    active: true,
    services: [
      { id: 'spa-relax', label: { tr: 'Klasik / Relax masaj', kk: 'Классикалық массаж', ru: 'Классический массаж' }, durationMin: 60, price: 12000, popular: true },
      { id: 'spa-cellulite', label: { tr: 'Anti-selülit masaj', kk: 'Анти-целлюлит массаж', ru: 'Антицеллюлитный массаж' }, durationMin: 60, price: 14000 },
      { id: 'spa-ritual', label: { tr: 'SPA ritüeli', kk: 'SPA рәсімі', ru: 'SPA-ритуал' }, durationMin: 90, price: 20000 },
      { id: 'spa-wrap', label: { tr: 'Vücut sargısı', kk: 'Дене орау', ru: 'Обёртывание' }, durationMin: 75, price: 16000 },
    ],
  },
  {
    id: 'pmu',
    labelKey: 'category.pmu',
    icon: 'color-wand-outline',
    active: true,
    services: [
      { id: 'pmu-lip', label: { tr: 'Dudak', kk: 'Ерін', ru: 'Перманент губ' }, durationMin: 120, price: 35000, popular: true },
      { id: 'pmu-eyeliner', label: { tr: 'Eyeliner', kk: 'Көз айналасы', ru: 'Перманент век' }, durationMin: 120, price: 30000 },
      { id: 'pmu-brow', label: { tr: 'Kaş (microblading)', kk: 'Қас (микроблейдинг)', ru: 'Перманент бровей' }, durationMin: 120, price: 32000 },
    ],
  },
  {
    id: 'bridal',
    labelKey: 'category.bridal',
    icon: 'flower-outline',
    active: true,
    services: [
      { id: 'bridal-look', label: { tr: 'Gelin başı (saç + makyaj)', kk: 'Қалыңдық образы', ru: 'Образ невесты' }, durationMin: 180, price: 45000, popular: true },
      { id: 'bridal-henna', label: { tr: 'Kına gecesi hazırlığı', kk: 'Қыналау кеші', ru: 'Подготовка к вечеру хны' }, durationMin: 120, price: 30000 },
      { id: 'bridal-grad', label: { tr: 'Mezuniyet hazırlığı', kk: 'Бітіру дайындығы', ru: 'Подготовка к выпускному' }, durationMin: 120, price: 28000 },
    ],
  },
  // ── v1'de KAPALI (arz oluşunca admin açar) ──
  {
    id: 'wellness',
    labelKey: 'category.wellness',
    icon: 'barbell-outline',
    active: false,
    services: [
      { id: 'well-pt', label: { tr: 'Fitness / PT', kk: 'Фитнес / PT', ru: 'Фитнес / PT' }, durationMin: 60, price: 8000 },
      { id: 'well-yoga', label: { tr: 'Yoga', kk: 'Йога', ru: 'Йога' }, durationMin: 60, price: 6000 },
      { id: 'well-pilates', label: { tr: 'Pilates', kk: 'Пилатес', ru: 'Пилатес' }, durationMin: 60, price: 7000 },
      { id: 'well-nutrition', label: { tr: 'Beslenme danışmanlığı', kk: 'Тамақтану кеңесі', ru: 'Консультация по питанию' }, durationMin: 45, price: 10000 },
    ],
  },
  {
    id: 'style',
    labelKey: 'category.style',
    icon: 'shirt-outline',
    active: false,
    services: [
      { id: 'style-personal', label: { tr: 'Kişisel stil', kk: 'Жеке стиль', ru: 'Персональный стиль' }, durationMin: 60, price: 15000 },
      { id: 'style-color', label: { tr: 'Renk analizi', kk: 'Түс талдауы', ru: 'Цветотипирование' }, durationMin: 90, price: 18000 },
      { id: 'style-wardrobe', label: { tr: 'Gardırop danışmanlığı', kk: 'Гардероб кеңесі', ru: 'Разбор гардероба' }, durationMin: 120, price: 20000 },
    ],
  },
];

// ── Türetilmiş yardımcılar ───────────────────────────────────────────────
export const activeCategories = (): TaxCategory[] => TAXONOMY.filter((c) => c.active);
export const findCategory = (id: string): TaxCategory | undefined =>
  TAXONOMY.find((c) => c.id === id);
export const servicesOf = (categoryId: string): TaxService[] => findCategory(categoryId)?.services ?? [];
export const allServices = (): TaxService[] => TAXONOMY.flatMap((c) => c.services);
export const findService = (id: string): TaxService | undefined =>
  allServices().find((s) => s.id === id);
/** Bakım döngüsü olan hizmetler (bakım takvimi seçimi için). */
export const careableServices = (): { categoryId: string; service: TaxService }[] =>
  TAXONOMY.flatMap((c) => c.services.filter((s) => s.periodDays != null).map((service) => ({ categoryId: c.id, service })));
