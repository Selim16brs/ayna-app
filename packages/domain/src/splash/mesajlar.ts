import type { UcDil } from '../catalog/katalog.js';

/**
 * AÇILIŞ MESAJLARI KATALOĞU — `AYNA_ACILIS_MESAJLARI_BRIEF.md` v2.0.
 *
 * ── KİMLİKLER DEĞİŞMEZ ──────────────────────────────────────────────────
 *
 * Brief §2: "Tüm ID'ler sabittir (immutable); analitik ve rotasyon bu
 * ID'lere bağlanır." Rotasyon durumu cihazda ID ile saklanıyor: bir kimlik
 * değişirse o mesaj kullanıcı için "hiç görülmemiş" olur ve döngü bozulur.
 *
 * ── ÇEVİRİLER ÜRÜN ONAYLI ───────────────────────────────────────────────
 *
 * Üç dilli metinler brief'teki tablolardan AYNEN kopyalanmıştır; kendi
 * çevirim üretilmedi.
 *
 * ── KATALOG NEDEN BURADA ────────────────────────────────────────────────
 *
 * `packages/domain` içinde: uygulama splash'ı çiziyor, sunucu uzaktan
 * güncelleme ve admin paneli için aynı listeyi okuyor. İki kopya zamanla
 * ayrışırdı.
 *
 * Brief §7.1 "yerel paket + uzak güncelleme" istiyor: bu dosya YEREL
 * PAKET — internet olmadan da splash çalışıyor. Uzak katalog ayrı bir
 * adımda üzerine biniyor.
 */

export type SplashEtiket = 'female' | 'neutral';
export type SplashGrup = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

/** Yıl içinde bir tarih penceresi — [ay, gün], ay 1-12. */
export interface TarihPenceresi {
  bas: [number, number];
  son: [number, number];
}

export interface SplashMesaji {
  id: string;
  grup: SplashGrup;
  etiket: SplashEtiket;
  metin: UcDil;
  /** C — saat aralığı [dahil, hariç), cihaz yerel saati. */
  saat?: [number, number];
  /** C — yalnız hafta sonu (Cmt/Paz). */
  haftaSonu?: true;
  /** D — haftanın günleri (0 = Pazar). */
  gunler?: readonly number[];
  /** E — tarih penceresi. */
  pencere?: TarihPenceresi;
  /**
   * E — ÖNCELİKLİ özel gün (sp_01–04): pencere içindeki İLK açılışta
   * kesin gösterilir. Sezon mesajları (sp_05–07) öncelikli DEĞİL, genel
   * havuza karışır.
   */
  oncelikliOzelGun?: true;
  /** F — `{name}` taşıyor; ad yoksa havuza girmez (pn_02 hariç, kısaltması var). */
  adGerekli?: true;
  /** F — doğum gününde gösterilir. */
  dogumGunu?: true;
  /** pn_02'nin adsız kısaltması — brief §2.6. */
  adsizMetin?: UcDil;
  /**
   * VURGULANACAK BÖLÜM — açılış ekranında kalın çizilir.
   *
   * Kurucu: "önemli kelime bold olsun." Metnin kendisi brief'ten AYNEN
   * geliyor ve değişmiyor; vurgu ayrı bir alan olarak duruyor, çünkü
   * metnin içine `*yıldız*` gibi işaret koysaydım metin artık brief'le
   * birebir olmazdı.
   *
   * Değer, o dildeki metnin İÇİNDE GEÇEN bir parça olmak zorunda —
   * `vurgu.test.ts` bunu doğruluyor. Geçmiyorsa hiçbir şey kalınlaşmaz;
   * sessiz bir yazım hatası bütün vurguyu düşürebilirdi.
   */
  vurgu?: UcDil;
  /** H — davranış koşulu. */
  davranis?:
    | 'ilk_acilis'
    | 'uzun_yokluk'
    | 'yarin_randevu'
    | 'bugun_randevu'
    | 'randevu_sonrasi'
    | 'puan_hazir';
}

const m = (
  id: string,
  grup: SplashGrup,
  etiket: SplashEtiket,
  tr: string,
  ru: string,
  kk: string,
  ek: Partial<SplashMesaji> = {},
): SplashMesaji => ({ id, grup, etiket, metin: { tr, ru, kk }, ...ek });

/** Brief §2.3 — saat aralıkları (cihaz yerel saati). */
const SABAH: [number, number] = [5, 11];
const OGLE: [number, number] = [11, 17];
const AKSAM: [number, number] = [17, 24];

export const ACILIS_MESAJLARI: readonly SplashMesaji[] = [
  // ── GRUP A · Genel motivasyon (her zaman havuzda) ────────────────────
  m(
    'msg_01',
    'A',
    'female',
    'Sen güçlü bir kadınsın!',
    'Вы сильная женщина!',
    'Сен мықты әйелсің!',
    { vurgu: { tr: 'güçlü bir kadınsın', ru: 'сильная женщина', kk: 'мықты әйелсің' } },
  ),
  m('msg_02', 'A', 'neutral', 'Bugün senin günün!', 'Сегодня ваш день!', 'Бүгін — сенің күнің!', {
    vurgu: { tr: 'senin günün', ru: 'ваш день', kk: 'сенің күнің' },
  }),
  m(
    'msg_03',
    'A',
    'neutral',
    'Güzelliğin içinden geliyor.',
    'Ваша красота идёт изнутри.',
    'Сұлулығың ішіңнен бастау алады.',
    { vurgu: { tr: 'içinden geliyor', ru: 'идёт изнутри', kk: 'ішіңнен бастау алады' } },
  ),
  m(
    'msg_04',
    'A',
    'neutral',
    'Kendine zaman ayırmayı hak ediyorsun.',
    'Вы заслуживаете времени для себя.',
    'Сен өзіңе уақыт бөлуге лайықсың.',
    { vurgu: { tr: 'hak ediyorsun', ru: 'заслуживаете', kk: 'лайықсың' } },
  ),
  m(
    'msg_05',
    'A',
    'neutral',
    'Işılda! Dünya sana bakıyor.',
    'Сияйте! Мир смотрит на вас.',
    'Жарқыра! Әлем саған қарап тұр.',
    { vurgu: { tr: 'Işılda', ru: 'Сияйте', kk: 'Жарқыра' } },
  ),
  m(
    'msg_06',
    'A',
    'neutral',
    'En güzel yatırım, kendine yaptığındır.',
    'Лучшая инвестиция — в себя.',
    'Ең үздік инвестиция — өзіңе салғаның.',
    { vurgu: { tr: 'kendine yaptığındır', ru: 'в себя', kk: 'өзіңе салғаның' } },
  ),
  m(
    'msg_07',
    'A',
    'female',
    'Sen olduğun gibi mükemmelsin.',
    'Вы прекрасны такой, какая вы есть.',
    'Сен өз қалпыңда кереметсің.',
    {
      vurgu: {
        tr: 'olduğun gibi mükemmelsin',
        ru: 'такой, какая вы есть',
        kk: 'өз қалпыңда кереметсің',
      },
    },
  ),
  m(
    'msg_08',
    'A',
    'neutral',
    'Bugün kendini şımart!',
    'Побалуйте себя сегодня!',
    'Бүгін өзіңді еркелет!',
    { vurgu: { tr: 'kendini şımart', ru: 'Побалуйте себя', kk: 'өзіңді еркелет' } },
  ),
  m(
    'msg_09',
    'A',
    'neutral',
    'Gülüşün en güzel aksesuarın.',
    'Ваша улыбка — лучшее украшение.',
    'Күлкің — ең әдемі әшекейің.',
    { vurgu: { tr: 'en güzel aksesuarın', ru: 'лучшее украшение', kk: 'ең әдемі әшекейің' } },
  ),
  m(
    'msg_10',
    'A',
    'neutral',
    'Kendine iyi bakmak bencillik değil, sevgidir.',
    'Забота о себе — это не эгоизм, а любовь.',
    'Өзіңе қамқорлық — өзімшілдік емес, махаббат.',
    { vurgu: { tr: 'sevgidir', ru: 'любовь', kk: 'махаббат' } },
  ),
  m(
    'msg_11',
    'A',
    'neutral',
    'Her gün yeni bir başlangıç.',
    'Каждый день — новое начало.',
    'Әр күн — жаңа бастау.',
    { vurgu: { tr: 'yeni bir başlangıç', ru: 'новое начало', kk: 'жаңа бастау' } },
  ),
  m('msg_12', 'A', 'female', 'Sen bir tanesin!', 'Вы неповторимы!', 'Сен қайталанбассың!', {
    vurgu: { tr: 'bir tanesin', ru: 'неповторимы', kk: 'қайталанбассың' },
  }),
  m(
    'msg_13',
    'A',
    'neutral',
    'Enerjin her şeyi değiştirir.',
    'Ваша энергия меняет всё.',
    'Сенің энергияң бәрін өзгертеді.',
    { vurgu: { tr: 'her şeyi değiştirir', ru: 'меняет всё', kk: 'бәрін өзгертеді' } },
  ),
  m(
    'msg_14',
    'A',
    'neutral',
    'Hayallerinin peşinden git.',
    'Идите за своей мечтой.',
    'Арманыңның соңынан ер.',
    { vurgu: { tr: 'Hayallerinin', ru: 'мечтой', kk: 'Арманыңның' } },
  ),
  m(
    'msg_15',
    'A',
    'female',
    'Bugün de harikasın!',
    'Вы сегодня великолепны!',
    'Сен бүгін де кереметсің!',
    { vurgu: { tr: 'harikasın', ru: 'великолепны', kk: 'кереметсің' } },
  ),
  m(
    'msg_16',
    'A',
    'neutral',
    'Kendini sevmek en büyük güçtür.',
    'Любовь к себе — великая сила.',
    'Өзіңді сүю — ең үлкен күш.',
    { vurgu: { tr: 'en büyük güçtür', ru: 'великая сила', kk: 'ең үлкен күш' } },
  ),
  m(
    'msg_17',
    'A',
    'neutral',
    'Küçük bir bakım, büyük bir özgüven.',
    'Немного заботы — много уверенности.',
    'Кішкене күтім — үлкен сенімділік.',
    { vurgu: { tr: 'büyük bir özgüven', ru: 'много уверенности', kk: 'үлкен сенімділік' } },
  ),
  m('msg_18', 'A', 'female', 'Sen buna değersin.', 'Вы этого достойны.', 'Сен бұған лайықсың.', {
    vurgu: { tr: 'buna değersin', ru: 'этого достойны', kk: 'бұған лайықсың' },
  }),
  m(
    'msg_19',
    'A',
    'neutral',
    'Parlamaktan asla vazgeçme.',
    'Никогда не переставайте сиять.',
    'Жарқырауды ешқашан тоқтатпа.',
    { vurgu: { tr: 'asla vazgeçme', ru: 'Никогда не переставайте', kk: 'ешқашан тоқтатпа' } },
  ),
  m(
    'msg_20',
    'A',
    'neutral',
    'Güzellik bir yolculuktur — tadını çıkar.',
    'Красота — это путь. Наслаждайтесь им.',
    'Сұлулық — бұл жол. Ләззатын ал.',
    { vurgu: { tr: 'tadını çıkar', ru: 'Наслаждайтесь', kk: 'Ләззатын ал' } },
  ),

  // ── GRUP B · Hizmete yönlendiren (her zaman havuzda) ─────────────────
  m(
    'msg_21',
    'B',
    'neutral',
    "Bugün kendin için bir şey yap — spa'ya git!",
    'Сделайте сегодня что-то для себя — сходите в спа!',
    'Бүгін өзің үшін бірдеңе жаса — спаға бар!',
    { vurgu: { tr: "spa'ya git", ru: 'сходите в спа', kk: 'спаға бар' } },
  ),
  m(
    'msg_22',
    'B',
    'neutral',
    'Manikür zamanı gelmedi mi?',
    'Не пора ли на маникюр?',
    'Маникюр жасайтын уақыт келді емес пе?',
    { vurgu: { tr: 'Manikür zamanı', ru: 'маникюр', kk: 'Маникюр' } },
  ),
  m(
    'msg_23',
    'B',
    'neutral',
    'İyi bir masaj her şeyi çözer.',
    'Хороший массаж решает всё.',
    'Жақсы массаж бәрін шешеді.',
    { vurgu: { tr: 'her şeyi çözer', ru: 'решает всё', kk: 'бәрін шешеді' } },
  ),
  m(
    'msg_24',
    'B',
    'neutral',
    'Cildin sana teşekkür edecek — bir bakım planla.',
    'Ваша кожа скажет спасибо — запишитесь на уход.',
    'Терің саған алғыс айтады — күтімге жазыл.',
    { vurgu: { tr: 'bir bakım planla', ru: 'запишитесь на уход', kk: 'күтімге жазыл' } },
  ),
  m(
    'msg_25',
    'B',
    'female',
    'Yeni bir saç, yeni bir sen!',
    'Новая причёска — новая вы!',
    'Жаңа шаш үлгісі — жаңа сен!',
    { vurgu: { tr: 'yeni bir sen', ru: 'новая вы', kk: 'жаңа сен' } },
  ),
  m(
    'msg_26',
    'B',
    'neutral',
    'Kendine bir güzellik molası ver.',
    'Устройте себе бьюти-паузу.',
    'Өзіңе сұлулық үзілісін жаса.',
    { vurgu: { tr: 'güzellik molası', ru: 'бьюти-паузу', kk: 'сұлулық үзілісін' } },
  ),
  m(
    'msg_27',
    'B',
    'neutral',
    'Işıldamak için bir randevu yeter.',
    'Одна запись — и вы сияете.',
    'Бір жазылу — сен жарқырап шыға келесің.',
    { vurgu: { tr: 'bir randevu yeter', ru: 'Одна запись', kk: 'Бір жазылу' } },
  ),
  m(
    'msg_28',
    'B',
    'neutral',
    'Dileğini yaz, uzmanlar sana gelsin!',
    'Напишите своё желание — мастера откликнутся!',
    'Тілегіңді жаз — мамандар өздері хабарласады!',
    {
      vurgu: {
        tr: 'uzmanlar sana gelsin',
        ru: 'мастера откликнутся',
        kk: 'мамандар өздері хабарласады',
      },
    },
  ),

  // ── GRUP C · Zaman dilimi ────────────────────────────────────────────
  m(
    'tod_01',
    'C',
    'neutral',
    'Günaydın! Bugün ışıldamak için harika bir gün.',
    'Доброе утро! Отличный день, чтобы сиять.',
    'Қайырлы таң! Бүгін жарқырауға тамаша күн.',
    { saat: SABAH, vurgu: { tr: 'Günaydın', ru: 'Доброе утро', kk: 'Қайырлы таң' } },
  ),
  m(
    'tod_02',
    'C',
    'neutral',
    'Güne bir gülümsemeyle başla.',
    'Начните день с улыбки.',
    'Күнді күлкіден баста.',
    { saat: SABAH, vurgu: { tr: 'bir gülümsemeyle', ru: 'с улыбки', kk: 'күлкіден' } },
  ),
  m(
    'tod_03',
    'C',
    'neutral',
    'Kendine küçük bir mola borçlusun.',
    'Вы заслуживаете маленькой паузы.',
    'Сен шағын үзіліске лайықсың.',
    { saat: OGLE, vurgu: { tr: 'küçük bir mola', ru: 'маленькой паузы', kk: 'шағын үзіліске' } },
  ),
  m(
    'tod_04',
    'C',
    'neutral',
    'Bugün kendine ne kadar zaman ayırdın?',
    'Сегодня было время для себя?',
    'Бүгін өзіңе уақыт бөлдің бе?',
    {
      saat: AKSAM,
      vurgu: { tr: 'ne kadar zaman ayırdın', ru: 'было время для себя', kk: 'уақыт бөлдің бе' },
    },
  ),
  m(
    'tod_05',
    'C',
    'neutral',
    'Yarın için güzel bir plan yapalım mı?',
    'Составим красивый план на завтра?',
    'Ертеңге әдемі жоспар құрайық па?',
    { saat: AKSAM, vurgu: { tr: 'güzel bir plan', ru: 'красивый план', kk: 'әдемі жоспар' } },
  ),
  m(
    'tod_06',
    'C',
    'neutral',
    'Hafta sonu, kendine bakım zamanı!',
    'Выходные — время заботы о себе!',
    'Демалыс — өзіңе қамқорлық уақыты!',
    {
      haftaSonu: true,
      vurgu: {
        tr: 'kendine bakım zamanı',
        ru: 'время заботы о себе',
        kk: 'өзіңе қамқорлық уақыты',
      },
    },
  ),

  // ── GRUP D · Haftanın günü ───────────────────────────────────────────
  m(
    'dow_01',
    'D',
    'neutral',
    'Haftaya ışıldayarak başla!',
    'Начните неделю с сияния!',
    'Аптаны жарқыраудан баста!',
    { gunler: [1], vurgu: { tr: 'ışıldayarak', ru: 'с сияния', kk: 'жарқыраудан' } },
  ),
  m(
    'dow_02',
    'D',
    'neutral',
    'Hafta sonu planın hazır mı? Belki bir manikür?',
    'Планы на выходные готовы? Может, маникюр?',
    'Демалысқа жоспар дайын ба? Мүмкін маникюр?',
    { gunler: [5], vurgu: { tr: 'bir manikür', ru: 'маникюр', kk: 'маникюр' } },
  ),

  // ── GRUP E · Özel gün ve sezon ───────────────────────────────────────
  m(
    'sp_01',
    'E',
    'neutral',
    'Yeni yıl, yeni sen! Nice ışıltılı yıllara.',
    'Новый год — ваша новая версия!',
    'Жаңа жыл — жаңа сен!',
    {
      pencere: { bas: [12, 31], son: [1, 7] },
      oncelikliOzelGun: true,
      vurgu: {
        tr: 'Yeni yıl, yeni sen',
        ru: 'ваша новая версия',
        kk: 'Жаңа жыл — жаңа сен',
      },
    },
  ),
  m(
    'sp_02',
    'E',
    'neutral',
    'Bugün sevginin günü — önce kendini sev.',
    'Сегодня день любви — начните с любви к себе.',
    'Бүгін махаббат күні — өзіңді сүюден баста.',
    {
      pencere: { bas: [2, 14], son: [2, 14] },
      oncelikliOzelGun: true,
      vurgu: { tr: 'önce kendini sev', ru: 'начните с любви к себе', kk: 'өзіңді сүюден баста' },
    },
  ),
  m(
    'sp_03',
    'E',
    'female',
    '8 Mart kutlu olsun! Bugün gün senin günün.',
    'С 8 Марта! Сегодня ваш день.',
    '8 Наурыз мейрамы құтты болсын! Бүгін — сенің күнің.',
    {
      pencere: { bas: [3, 8], son: [3, 8] },
      oncelikliOzelGun: true,
      vurgu: { tr: '8 Mart kutlu olsun', ru: 'С 8 Марта', kk: '8 Наурыз мейрамы құтты болсын' },
    },
  ),
  m(
    'sp_04',
    'E',
    'neutral',
    'Nauryz kutlu olsun! Baharla birlikte yenilen.',
    'С Наурызом! Обновляйтесь вместе с весной.',
    'Наурыз мейрамы құтты болсын! Көктеммен бірге жаңар.',
    {
      pencere: { bas: [3, 21], son: [3, 23] },
      oncelikliOzelGun: true,
      vurgu: { tr: 'Nauryz kutlu olsun', ru: 'С Наурызом', kk: 'Наурыз мейрамы құтты болсын' },
    },
  ),
  m(
    'sp_05',
    'E',
    'neutral',
    'Soğuk havada cildin ekstra sevgi ister.',
    'В холода ваша кожа просит больше заботы.',
    'Суықта терің көбірек қамқорлық қалайды.',
    {
      pencere: { bas: [12, 1], son: [2, 29] },
      vurgu: { tr: 'ekstra sevgi ister', ru: 'больше заботы', kk: 'көбірек қамқорлық қалайды' },
    },
  ),
  m(
    'sp_06',
    'E',
    'neutral',
    'Güneş çıktı — sen de parla!',
    'Солнце сияет — сияйте и вы!',
    'Күн жарқырап тұр — сен де жарқыра!',
    {
      pencere: { bas: [6, 1], son: [8, 31] },
      vurgu: { tr: 'sen de parla', ru: 'сияйте и вы', kk: 'сен де жарқыра' },
    },
  ),
  m(
    'sp_07',
    'E',
    'neutral',
    'Düğün sezonu açıldı! Davetlere hazır mısın?',
    'Сезон свадеб открыт! Готовитесь к торжествам?',
    'Той маусымы басталды! Тойларға дайынсың ба?',
    {
      pencere: { bas: [5, 1], son: [9, 30] },
      vurgu: { tr: 'Düğün sezonu açıldı', ru: 'Сезон свадеб открыт', kk: 'Той маусымы басталды' },
    },
  ),

  // ── GRUP F · Kişiselleştirilmiş ──────────────────────────────────────
  m(
    'pn_01',
    'F',
    'neutral',
    'Hoş geldin, {name}! Bugün senin günün.',
    'С возвращением, {name}! Сегодня ваш день.',
    'Қош келдің, {name}! Бүгін — сенің күнің.',
    { adGerekli: true, vurgu: { tr: 'Hoş geldin', ru: 'С возвращением', kk: 'Қош келдің' } },
  ),
  m(
    'pn_02',
    'F',
    'neutral',
    'İyi ki doğdun, {name}! Bugün ışılda!',
    'С днём рождения, {name}! Сияйте сегодня!',
    'Туған күніңмен, {name}! Бүгін жарқыра!',
    {
      dogumGunu: true,
      // Brief §2.6 — ad yoksa kısaltılmış varyant; mesaj HAVUZDAN DÜŞMÜYOR.
      adsizMetin: {
        tr: 'İyi ki doğdun! Bugün ışılda!',
        ru: 'С днём рождения! Сияйте сегодня!',
        kk: 'Туған күніңмен! Бүгін жарқыра!',
      },
      vurgu: { tr: 'İyi ki doğdun', ru: 'С днём рождения', kk: 'Туған күніңмен' },
    },
  ),

  // ── GRUP G · Samimi / espri ──────────────────────────────────────────
  m(
    'fun_01',
    'G',
    'female',
    'Ayna ayna, söyle bana... Söylemeye gerek yok — harikasın.',
    'Свет мой, зеркальце, скажи... Можно не говорить — вы прекрасны.',
    'Айна, айна, айтшы маған... Айтудың қажеті жоқ — сен кереметсің.',
    { vurgu: { tr: 'harikasın', ru: 'вы прекрасны', kk: 'сен кереметсің' } },
  ),
  m(
    'fun_02',
    'G',
    'neutral',
    'Aynaya bir gülümse — bunu hak etti.',
    'Улыбнитесь зеркалу — оно это заслужило.',
    'Айнаға күлімсіреші — ол соған лайық.',
    { vurgu: { tr: 'bunu hak etti', ru: 'оно это заслужило', kk: 'ол соған лайық' } },
  ),
  m(
    'fun_03',
    'G',
    'neutral',
    'Güzellik uykusu iyi de… biraz da güzellik randevusu?',
    'Бьюти-сон — это хорошо. А бьюти-запись — ещё лучше!',
    'Сұлулық ұйқысы жақсы. Ал сұлулық жазылымы — одан да жақсы!',
    { vurgu: { tr: 'güzellik randevusu', ru: 'бьюти-запись', kk: 'сұлулық жазылымы' } },
  ),

  // ── GRUP H · Davranış bazlı ──────────────────────────────────────────
  m(
    'bh_01',
    'H',
    'neutral',
    "AYNA'ya hoş geldin! İlk dileğini yazmaya hazır mısın?",
    'Добро пожаловать в AYNA! Загадайте своё первое желание.',
    'AYNA-ға қош келдің! Алғашқы тілегіңді жаз.',
    {
      davranis: 'ilk_acilis',
      vurgu: { tr: 'hoş geldin', ru: 'Добро пожаловать', kk: 'қош келдің' },
    },
  ),
  m(
    'bh_02',
    'H',
    'neutral',
    'Seni özledik! Kendine yeniden zaman ayırma vakti.',
    'Мы соскучились! Пора снова уделить себе время.',
    'Сені сағындық! Өзіңе қайта уақыт бөлетін кез келді.',
    {
      davranis: 'uzun_yokluk',
      vurgu: { tr: 'Seni özledik', ru: 'Мы соскучились', kk: 'Сені сағындық' },
    },
  ),
  m(
    'bh_03',
    'H',
    'neutral',
    'Yarın randevun var — heyecan başlasın!',
    'Завтра ваша запись. Уже ждём!',
    'Ертең жазылуың бар. Асыға күтеміз!',
    {
      davranis: 'yarin_randevu',
      vurgu: { tr: 'Yarın randevun var', ru: 'Завтра ваша запись', kk: 'Ертең жазылуың бар' },
    },
  ),
  m(
    'bh_04',
    'H',
    'neutral',
    'Bugün randevu günü! Harika görüneceksin.',
    'Сегодня день записи! Всё будет красиво.',
    'Бүгін жазылу күні! Бәрі керемет болады.',
    {
      davranis: 'bugun_randevu',
      vurgu: { tr: 'Bugün randevu günü', ru: 'Сегодня день записи', kk: 'Бүгін жазылу күні' },
    },
  ),
  m(
    'bh_05',
    'H',
    'neutral',
    'Yeni halin çok yakışmış!',
    'Обновление вам к лицу!',
    'Жаңа келбетің жарасып тұр!',
    { davranis: 'randevu_sonrasi', vurgu: { tr: 'çok yakışmış', ru: 'к лицу', kk: 'жарасып тұр' } },
  ),
  m(
    'bh_06',
    'H',
    'neutral',
    'Puanların hazır — bir sonraki randevunda kullan!',
    'Ваши баллы готовы — используйте при следующей записи!',
    'Ұпайларың дайын — келесі жазылымда қолдан!',
    {
      davranis: 'puan_hazir',
      vurgu: { tr: 'Puanların hazır', ru: 'Ваши баллы готовы', kk: 'Ұпайларың дайын' },
    },
  ),
];

/** Brief §2.8 — bh_06 eşiği, puan kullanım minimumuyla senkron. */
export const PUAN_ESIGI = 5000;
