// ŞEHİR ADI — aynı şehrin üç yazımını tek anahtara indirir.
//
// ── NEDEN ────────────────────────────────────────────────────────────────
//
// Uygulama şehirleri Türkçe yazımla tutuyor ('Almatı'). Ama şehir adı üç
// ayrı yoldan geliyor ve üçü aynı yazımı üretmiyor:
//
//   · Kayıt ekranındaki şehir seçici → 'Almatı'
//   · Haritadan ters geocode        → 'Алматы'  (Kazakistan'da Rusça döner)
//   · Kullanıcının elle girdiği     → 'Almaty', 'Алма-Ата', …
//
// Eşleştirme her yerde DÜZ METİN KARŞILAŞTIRMASIYDI (`p.city === city`).
// Sonuç canlıda görüldü (05.09.2026): haritadan konumunu işaretleyen
// uzmanın şehri 'Алматы' oluyor ve 'Almatı' şehrindeki müşterinin keşif
// ekranından SESSİZCE kayboluyordu. Aynı sebeple o uzmanın kampanyası da
// hiçbir müşteriye görünmüyordu (kampanya şehri kayıt anında kopyalanıyor).
//
// Hiçbir hata mesajı yok, hiçbir kayıt düşmüyor — yalnız görünmez oluyor.
//
// ── NASIL ────────────────────────────────────────────────────────────────
//
// Ad önce harf dışındakilerden arındırılıyor, sonra Kiril harfler Latin'e
// çevriliyor ve aksanlar düşürülüyor. Böylece 'Şımkent' ile 'Шымкент' aynı
// anahtara iniyor. Harf harf çevrilemeyen tarihsel adlar (Уральск = Oral,
// Усть-Каменогорск = Öskemen, Нур-Султан = Astana) elle eşleniyor.

/** Uygulamanın kanonik şehir listesi — kayıt ekranı da bunu gösteriyor. */
export const SEHIRLER: readonly string[] = [
  'Aktau',
  'Aktöbe',
  'Almatı',
  'Arkalık',
  'Astana',
  'Atırav',
  'Balkaş',
  'Ekibastuz',
  'Jezkazgan',
  'Janaözen',
  'Karagandı',
  'Kentau',
  'Kızılorda',
  'Kökşetau',
  'Kostanay',
  'Oral',
  'Öskemen',
  'Pavlodar',
  'Ridder',
  'Rudnıy',
  'Sarıağaş',
  'Semey',
  'Stepnogorsk',
  'Şımkent',
  'Taldıkorgan',
  'Taraz',
  'Temirtau',
  'Türkistan',
] as const;

/*
 * HER ŞEHRİN BİLİNEN YAZIMLARI — Rusça, Kazakça ve Latin romanizasyonu.
 *
 * İki işi birden görüyor:
 *   1. `kanonikSehir` bunları normalleştirip tanıyor (harf çevirisiyle
 *      tutmayan tarihsel adlar da burada: Уральск = Oral, Нур-Султан =
 *      Astana, Семипалатинск = Semey).
 *   2. `sehirYazimlari` veritabanı sorgusuna HAM METİN olarak veriyor —
 *      sütun ham metin tuttuğu için sorgunun tüm yazımları kapsaması şart.
 *
 * Liste elle yazılıyor, harf kuralıyla türetilmiyor: 'y → ı' gibi bir kural
 * iki ayrı şehri birbirine karıştırma riski taşır, liste taşımaz.
 */
const YAZIMLAR: Record<string, readonly string[]> = {
  Aktau: ['Актау', 'Aqtau'],
  Aktöbe: ['Актобе', 'Ақтөбе', 'Aktobe', 'Aqtobe'],
  Almatı: ['Алматы', 'Almaty', 'Алма-Ата', 'Alma-Ata'],
  Arkalık: ['Аркалык', 'Арқалық', 'Arkalyk', 'Arqalyq'],
  Astana: ['Астана', 'Нур-Султан', 'Нұр-Сұлтан', 'Nur-Sultan', 'Akmola'],
  Atırav: ['Атырау', 'Atyrau'],
  Balkaş: ['Балхаш', 'Балқаш', 'Balkhash', 'Balqash'],
  Ekibastuz: ['Экибастуз', 'Екібастұз'],
  Jezkazgan: ['Жезказган', 'Жезқазған', 'Zhezkazgan'],
  Janaözen: ['Жанаозен', 'Жаңаөзен', 'Zhanaozen'],
  Karagandı: ['Караганда', 'Қарағанды', 'Karaganda', 'Qaraghandy'],
  Kentau: ['Кентау', 'Кентау'],
  Kızılorda: ['Кызылорда', 'Қызылорда', 'Kyzylorda', 'Qyzylorda'],
  Kökşetau: ['Кокшетау', 'Көкшетау', 'Kokshetau'],
  Kostanay: ['Костанай', 'Қостанай', 'Kostanay'],
  Oral: ['Уральск', 'Орал', 'Uralsk'],
  Öskemen: ['Усть-Каменогорск', 'Өскемен', 'Ust-Kamenogorsk', 'Oskemen'],
  Pavlodar: ['Павлодар'],
  Ridder: ['Риддер'],
  Rudnıy: ['Рудный', 'Rudny'],
  Sarıağaş: ['Сарыагаш', 'Сарыағаш', 'Saryagash'],
  Semey: ['Семей', 'Семипалатинск', 'Semipalatinsk'],
  Stepnogorsk: ['Степногорск'],
  Şımkent: ['Шымкент', 'Shymkent', 'Chimkent'],
  Taldıkorgan: ['Талдыкорган', 'Талдықорған', 'Taldykorgan'],
  Taraz: ['Тараз'],
  Temirtau: ['Темиртау', 'Теміртау'],
  Türkistan: ['Туркестан', 'Түркістан', 'Turkestan'],
};

const KIRIL_LATIN: Record<string, string> = {
  а: 'a',
  ә: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  ғ: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'j',
  з: 'z',
  и: 'i',
  і: 'i',
  й: 'y',
  к: 'k',
  қ: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  ң: 'n',
  о: 'o',
  ө: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ұ: 'u',
  ү: 'u',
  ф: 'f',
  х: 'h',
  һ: 'h',
  ц: 'c',
  ч: 'c',
  ш: 's',
  щ: 's',
  ъ: '',
  ы: 'i',
  ь: '',
  э: 'e',
  ю: 'u',
  я: 'a',
};

const AKSAN: Record<string, string> = {
  ı: 'i',
  ö: 'o',
  ü: 'u',
  ş: 's',
  ç: 'c',
  ğ: 'g',
  â: 'a',
  î: 'i',
  û: 'u',
};

/**
 * Şehir adının KARŞILAŞTIRMA ANAHTARI.
 *
 * Boş/tanımsız girdi boş anahtar üretir — boş anahtar hiçbir şeyle
 * eşleşmez (aşağıdaki `sehirEslesir` bunu ayrıca eliyor), yoksa şehri
 * girilmemiş iki kayıt "aynı şehirde" sayılırdı.
 */
export function sehirAnahtari(ad: string | null | undefined): string {
  const ham = (ad ?? '').toLowerCase().trim();
  if (!ham) return '';
  let cikti = '';
  for (const ch of ham) {
    const kiril = KIRIL_LATIN[ch];
    if (kiril !== undefined) cikti += kiril;
    else if (AKSAN[ch] !== undefined) cikti += AKSAN[ch];
    else if (/[a-z0-9]/.test(ch)) cikti += ch;
    else if (/\s|-|_|\./.test(ch)) cikti += ' ';
  }
  return cikti.replace(/\s+/g, ' ').trim();
}

/** Anahtar → kanonik ad. Takma adlar da aynı anahtara indirilerek aranıyor. */
const ANAHTAR_KANONIK = new Map<string, string>([
  ...SEHIRLER.map((s) => [sehirAnahtari(s), s] as const),
  ...Object.entries(YAZIMLAR).flatMap(([kanonik, yazimlar]) =>
    yazimlar.map((y) => [sehirAnahtari(y), kanonik] as const),
  ),
]);

/**
 * Herhangi bir yazımı uygulamanın kanonik adına çevirir.
 *
 * Tanınmayan ad için `null` — UYDURMUYOR. Bilinmeyen bir şehri en yakın
 * benzerine çekmek, kullanıcıyı hiç yaşamadığı şehre taşımak olurdu.
 */
export function kanonikSehir(ad: string | null | undefined): string | null {
  return ANAHTAR_KANONIK.get(sehirAnahtari(ad)) ?? null;
}

/** İki şehir adı AYNI şehri mi gösteriyor? Boş adlar hiçbir şeyle eşleşmez. */
export function sehirEslesir(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = sehirAnahtari(a);
  const kb = sehirAnahtari(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const na = kanonikSehir(a);
  return na !== null && na === kanonikSehir(b);
}

/**
 * Bir şehrin BİLİNEN TÜM yazımları — veritabanı sorgusu bunlarla filtreliyor.
 *
 * Sunucu tarafında normalleştirilmiş karşılaştırma yapılamıyor (sütun ham
 * metin). Sorguyu tüm yazımlarla açmak, "önce çek sonra süz" yaklaşımından
 * daha doğru: `take` sınırı, süzgeçten önce eşleşenleri kesebilirdi.
 */
export function sehirYazimlari(ad: string | null | undefined): string[] {
  const ham = (ad ?? '').trim();
  const kanonik = kanonikSehir(ad);
  if (!kanonik) return ham ? [ham] : [];
  return [...new Set([kanonik, ...(YAZIMLAR[kanonik] ?? []), ham].filter(Boolean))];
}
