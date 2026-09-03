/**
 * AYNA HİZMET KATALOĞU — TEK DOĞRULUK KAYNAĞI.
 *
 * Kaynak: `AYNA_HIZMET_KATALOGU_BRIEF.md` v1.0 (03.09.2026, ONAYLI).
 *
 * ── KURAL ───────────────────────────────────────────────────────────────
 *
 * Brief §1: "Hizmet kategorilerinin göründüğü HER ekran ve HER akış bu
 * taksonomiden beslenir. İkinci bir liste, hard-coded kategori veya ekrana
 * özel varyasyon YASAKTIR."
 *
 * Bu dosya `packages/domain` içinde çünkü hem uygulama hem sunucu aynı
 * kaynağı okumak zorunda. İkisine ayrı kopya koymak, zamanla ayrışan iki
 * katalog demekti — brief'in yasakladığı şeyin ta kendisi.
 *
 * ── KİMLİKLER DEĞİŞMEZ ──────────────────────────────────────────────────
 *
 * Brief §7.2: "ID'ler bu dokümandakiyle birebir aynı olacak ve
 * değiştirilmeyecek (analitik ve derin linkler ID'ye bağlanacak)."
 * Alt hizmet kimliği `kategori.alt` biçiminde ve TÜM kimlikler brief'ten
 * harfi harfine alınmıştır.
 *
 * ── ÇEVİRİLER ÜRÜN ONAYLI ───────────────────────────────────────────────
 *
 * Brief §2: "Çeviriler ürün onaylıdır; Claude Code kendi çevirisini
 * üretmez." Aşağıdaki üç dilli adlar brief'teki tablolardan AYNEN
 * kopyalanmıştır. Kazakçadaki Rusça alıntı terimler (маникюр, шугаринг,
 * ламинация) BİLEREK korunmuştur — kullanıcılar böyle arıyor (§2).
 *
 * ── SIRALAMA ────────────────────────────────────────────────────────────
 *
 * Brief §7.3: kategori sırası talep hacmine göre varsayılan UI sırasıdır
 * ve admin panelden değiştirilebilir. Bu dosya VARSAYILANI tanımlıyor;
 * override veritabanında (`service_categories.sort_order`).
 */

export type KatalogDil = 'tr' | 'kk' | 'ru';

/** Üç dilli ad. Dil eksikse TR'ye düşülür — ekran boş kalmaz. */
export interface UcDil {
  tr: string;
  kk: string;
  ru: string;
}

export function ucDil(a: UcDil, dil: string): string {
  return a[dil as KatalogDil] ?? a.tr;
}

export interface AltHizmet {
  /** `kategori.alt` — brief §3'ten birebir. DEĞİŞTİRİLEMEZ. */
  id: string;
  /** Kategori içindeki kısa kimlik (`haircut`). */
  kod: string;
  ad: UcDil;
}

export interface KatalogKategorisi {
  /** Brief §3'ten birebir slug. DEĞİŞTİRİLEMEZ. */
  id: string;
  ad: UcDil;
  /** Brief §6.2 — ikon konsepti. Çizim bu metne göre üretiliyor. */
  ikonKonsepti: string;
  altHizmetler: AltHizmet[];
}

/** Alt hizmeti brief'teki tablo satırından kurar. */
function alt(kategoriId: string, kod: string, tr: string, ru: string, kk: string): AltHizmet {
  return { id: `${kategoriId}.${kod}`, kod, ad: { tr, ru, kk } };
}

export const KATALOG: readonly KatalogKategorisi[] = [
  {
    id: 'hair',
    ad: { tr: 'Saç', ru: 'Волосы', kk: 'Шаш' },
    ikonKonsepti: 'Makas + tarak veya saç teli dalgası',
    altHizmetler: [
      alt('hair', 'haircut', 'Kesim & Şekillendirme', 'Стрижка и укладка', 'Шаш қию және сәндеу'),
      alt('hair', 'blowdry', 'Fön', 'Укладка феном', 'Фенмен сәндеу'),
      alt('hair', 'coloring', 'Boya', 'Окрашивание', 'Шаш бояу'),
      alt(
        'hair',
        'balayage',
        'Ombre / Balayage / Röfle',
        'Омбре / балаяж / мелирование',
        'Омбре / балаяж / мелирование',
      ),
      alt(
        'hair',
        'keratin',
        'Keratin & Saç Botoksu',
        'Кератин и ботокс для волос',
        'Кератин және шаш ботоксы',
      ),
      alt('hair', 'straightening', 'Düzleştirme', 'Выпрямление', 'Шашты түзету'),
      alt('hair', 'extensions', 'Saç Kaynak', 'Наращивание волос', 'Шаш жалғау'),
      alt(
        'hair',
        'event_hair',
        'Topuz / Gelin & Etkinlik Saçı',
        'Причёски / свадебные укладки',
        'Той және кештік шаш үлгілері',
      ),
    ],
  },
  {
    id: 'nails',
    ad: { tr: 'Tırnak', ru: 'Ногти', kk: 'Тырнақ' },
    ikonKonsepti: 'Oje şişesi veya tırnaklı el silueti',
    altHizmetler: [
      alt('nails', 'manicure', 'Manikür (klasik)', 'Маникюр классический', 'Классикалық маникюр'),
      alt('nails', 'hw_manicure', 'Aparat Manikür', 'Аппаратный маникюр', 'Аппараттық маникюр'),
      alt('nails', 'pedicure', 'Pedikür', 'Педикюр', 'Педикюр'),
      alt('nails', 'gel_polish', 'Kalıcı Oje (Gel-lak)', 'Гель-лак', 'Гель-лак'),
      alt('nails', 'nail_extensions', 'Protez Tırnak', 'Наращивание ногтей', 'Тырнақ жалғау'),
      alt('nails', 'nail_art', 'Nail Art / Tasarım', 'Дизайн ногтей', 'Тырнақ дизайны'),
    ],
  },
  {
    id: 'lashes_brows',
    ad: { tr: 'Kirpik & Kaş', ru: 'Ресницы и брови', kk: 'Кірпік пен қас' },
    ikonKonsepti: 'Kapalı göz + kirpik kavisleri',
    altHizmetler: [
      alt(
        'lashes_brows',
        'lash_ext',
        'Kirpik Ekleme (klasik/2D-3D/volume)',
        'Наращивание ресниц',
        'Кірпік жалғау',
      ),
      alt(
        'lashes_brows',
        'lash_lift',
        'Kirpik Lifting / Laminasyon',
        'Ламинирование ресниц',
        'Кірпік ламинациясы',
      ),
      alt(
        'lashes_brows',
        'brow_shape',
        'Kaş Alımı & Şekillendirme',
        'Коррекция бровей',
        'Қас түзету',
      ),
      alt('lashes_brows', 'brow_lam', 'Kaş Laminasyonu', 'Ламинирование бровей', 'Қас ламинациясы'),
      alt(
        'lashes_brows',
        'brow_tint',
        'Kaş Boyama (boya/henna)',
        'Окрашивание бровей (краска/хна)',
        'Қас бояу (бояу/хна)',
      ),
      alt(
        'lashes_brows',
        'microblading',
        'Microblading / Kalıcı Kaş',
        'Микроблейдинг / перманентные брови',
        'Микроблейдинг / перманентті қас',
      ),
    ],
  },
  {
    id: 'epilation',
    ad: { tr: 'Epilasyon', ru: 'Эпиляция', kk: 'Эпиляция' },
    ikonKonsepti: 'Yaprak/pürüzsüz cilt çizgisi veya spatula',
    altHizmetler: [
      alt('epilation', 'sugaring', 'Shugaring (Şeker Ağda)', 'Шугаринг', 'Шугаринг'),
      alt('epilation', 'waxing', 'Ağda', 'Восковая депиляция', 'Воскпен депиляция'),
      alt('epilation', 'laser', 'Lazer Epilasyon', 'Лазерная эпиляция', 'Лазерлік эпиляция'),
      alt('epilation', 'electrolysis', 'Elektroliz', 'Электроэпиляция', 'Электроэпиляция'),
    ],
  },
  {
    id: 'skin',
    ad: { tr: 'Cilt Bakımı', ru: 'Уход за кожей', kk: 'Тері күтімі' },
    ikonKonsepti: 'Yüz silueti + damla/parıltı',
    altHizmetler: [
      alt('skin', 'facial', 'Cilt Bakımı', 'Уход за лицом', 'Бет күтімі'),
      alt(
        'skin',
        'cleansing',
        'Cilt Temizliği (mekanik/ultrason)',
        'Чистка лица (механическая/УЗ)',
        'Бет тазалау (механикалық/УД)',
      ),
      alt('skin', 'peeling', 'Peeling', 'Пилинг', 'Пилинг'),
      alt('skin', 'anti_age', 'Cilt Gençleştirme', 'Омоложение кожи', 'Теріні жасарту'),
    ],
  },
  {
    id: 'makeup',
    ad: { tr: 'Makyaj', ru: 'Макияж', kk: 'Макияж' },
    ikonKonsepti: 'Ruj veya makyaj fırçası',
    altHizmetler: [
      alt(
        'makeup',
        'day_makeup',
        'Günlük / Akşam Makyajı',
        'Дневной / вечерний макияж',
        'Күндізгі / кештік макияж',
      ),
      alt('makeup', 'bridal', 'Gelin Makyajı', 'Свадебный макияж', 'Келін макияжы'),
      alt(
        'makeup',
        'photo_makeup',
        'Fotoğraf Çekimi Makyajı',
        'Макияж для фотосессии',
        'Фотосессияға арналған макияж',
      ),
      alt(
        'makeup',
        'pmu',
        'Kalıcı Makyaj (dudak/eyeliner)',
        'Перманентный макияж (губы/стрелки)',
        'Перманентті макияж (ерін/көз сызығы)',
      ),
    ],
  },
  {
    id: 'massage',
    ad: { tr: 'Masaj', ru: 'Массаж', kk: 'Массаж' },
    ikonKonsepti: 'İki el + akış çizgileri',
    altHizmetler: [
      alt(
        'massage',
        'classic',
        'Klasik / Relax Masaj',
        'Классический / релакс-массаж',
        'Классикалық / релакс массаж',
      ),
      alt(
        'massage',
        'anticellulite',
        'Anti-selülit Masaj',
        'Антицеллюлитный массаж',
        'Антицеллюлит массажы',
      ),
      alt(
        'massage',
        'lymph',
        'Lenf Drenaj Masajı',
        'Лимфодренажный массаж',
        'Лимфодренаждық массаж',
      ),
      alt('massage', 'body_wrap', 'Vücut Sarma', 'Обёртывание', 'Дене орау'),
    ],
  },
  {
    id: 'spa',
    ad: { tr: 'Spa & Hamam', ru: 'Спа и баня', kk: 'Спа және монша' },
    ikonKonsepti: 'Lotus çiçeği veya buhar tüten taşlar',
    altHizmetler: [
      alt(
        'spa',
        'spa_package',
        'Spa Paketi / Günübirlik Spa',
        'Спа-программа / спа-день',
        'Спа-бағдарлама / спа күні',
      ),
      alt('spa', 'couple_spa', 'Çift Spa', 'Спа для двоих', 'Екі адамға арналған спа'),
      alt(
        'spa',
        'banya',
        'Hamam / Banya Ritüeli (kese, köpük, парение)',
        'Баня / хаммам (парение, пилинг)',
        'Монша / хаммам (булау, пилинг)',
      ),
      alt('spa', 'sauna', 'Sauna / Buhar Odası', 'Сауна / паровая', 'Сауна / бу бөлмесі'),
      alt('spa', 'float', 'Flotasyon', 'Флоатинг', 'Флоатинг'),
      alt(
        'spa',
        'salt_room',
        'Tuz Odası',
        'Соляная комната (галотерапия)',
        'Тұз бөлмесі (галотерапия)',
      ),
    ],
  },
  {
    id: 'body_contouring',
    ad: { tr: 'Vücut Şekillendirme', ru: 'Коррекция фигуры', kk: 'Дене мүсіндеу' },
    ikonKonsepti: 'Kum saati vücut silueti + ölçüm çizgisi',
    altHizmetler: [
      alt('body_contouring', 'lpg', 'LPG Masajı', 'LPG-массаж', 'LPG массажы'),
      alt('body_contouring', 'cavitation', 'Kavitasyon', 'Кавитация', 'Кавитация'),
      alt('body_contouring', 'pressotherapy', 'Presoterapi', 'Прессотерапия', 'Прессотерапия'),
      alt('body_contouring', 'rf_lifting', 'RF Lifting', 'RF-лифтинг', 'RF-лифтинг'),
      alt('body_contouring', 'cryolipolysis', 'Kriyolipoliz', 'Криолиполиз', 'Криолиполиз'),
      alt('body_contouring', 'ems', 'EMS Antrenmanı', 'EMS-тренировка', 'EMS жаттығуы'),
    ],
  },
  {
    id: 'hair_health',
    ad: { tr: 'Saç Sağlığı', ru: 'Здоровье волос', kk: 'Шаш денсаулығы' },
    ikonKonsepti: 'Saç teli + kalp/nabız işareti',
    altHizmetler: [
      alt(
        'hair_health',
        'trichology',
        'Trikolog Konsültasyonu',
        'Консультация трихолога',
        'Трихолог кеңесі',
      ),
      alt(
        'hair_health',
        'scalp_care',
        'Saç Derisi Bakımı / Saç Spa',
        'Уход за кожей головы / спа для волос',
        'Бас терісі күтімі / шаш спасы',
      ),
    ],
  },
  {
    id: 'style',
    ad: { tr: 'İmaj & Stil', ru: 'Имидж и стиль', kk: 'Имидж және стиль' },
    ikonKonsepti: 'Elbise askısı veya renk paleti',
    altHizmetler: [
      alt(
        'style',
        'color_analysis',
        'Renk Analizi (цветотип)',
        'Определение цветотипа',
        'Цветотип анықтау',
      ),
      alt(
        'style',
        'stylist',
        'Stilist / İmaj Danışmanlığı',
        'Услуги стилиста / имиджмейкера',
        'Стилист / имидж кеңесшісі',
      ),
      alt('style', 'wardrobe', 'Gardırop Danışmanlığı', 'Разбор гардероба', 'Гардероб талдауы'),
      alt(
        'style',
        'shopping',
        'Kişisel Alışveriş Eşliği',
        'Шопинг-сопровождение',
        'Шопинг-серіктестік',
      ),
    ],
  },
  {
    id: 'wellness',
    ad: { tr: 'Wellness', ru: 'Велнес', kk: 'Велнес' },
    ikonKonsepti: 'Meditasyon pozu silueti',
    altHizmetler: [
      alt('wellness', 'yoga', 'Yoga (bireysel ders)', 'Йога (индивидуально)', 'Йога (жеке сабақ)'),
      alt('wellness', 'pilates', 'Pilates', 'Пилатес', 'Пилатес'),
      alt('wellness', 'stretching', 'Stretching', 'Стретчинг', 'Стретчинг'),
    ],
  },
  {
    id: 'other',
    ad: { tr: 'Diğer', ru: 'Прочее', kk: 'Басқа' },
    ikonKonsepti: 'Dört noktalı parıltı (sparkle)',
    altHizmetler: [
      alt('other', 'solarium', 'Solaryum', 'Солярий', 'Солярий'),
      alt('other', 'spray_tan', 'Spray Tan', 'Моментальный загар', 'Лездік тотығу (spray tan)'),
      alt(
        'other',
        'henna',
        'Kına Sanatı',
        'Мехенди / роспись хной',
        'Мехенди / қынамен өрнек салу',
      ),
      alt('other', 'kids_haircut', 'Çocuk Kuaförü', 'Детская стрижка', 'Балалар шаштаразы'),
      alt(
        'other',
        'piercing',
        'Piercing & Kulak Delme',
        'Пирсинг / прокол ушей',
        'Пирсинг / құлақ тесу',
      ),
      alt('other', 'tattoo', 'Dövme', 'Татуировка', 'Татуировка'),
      alt('other', 'podology', 'Podolog (ayak sağlığı)', 'Подолог', 'Подолог'),
    ],
  },
] as const;

/** Tüm alt hizmetler, kategori sırasıyla düz liste. */
export const TUM_ALT_HIZMETLER: readonly AltHizmet[] = KATALOG.flatMap((k) => k.altHizmetler);

const KATEGORI_DIZINI = new Map(KATALOG.map((k) => [k.id, k]));
const ALT_DIZINI = new Map(TUM_ALT_HIZMETLER.map((a) => [a.id, a]));

export function kategoriBul(id: string): KatalogKategorisi | undefined {
  return KATEGORI_DIZINI.get(id);
}

export function altHizmetBul(id: string): AltHizmet | undefined {
  return ALT_DIZINI.get(id);
}

/** `hair.haircut` → `hair`. Bilinmeyen kimlikte undefined. */
export function altHizmetinKategorisi(altId: string): string | undefined {
  const i = altId.indexOf('.');
  if (i < 0) return undefined;
  const kat = altId.slice(0, i);
  return KATEGORI_DIZINI.has(kat) ? kat : undefined;
}
