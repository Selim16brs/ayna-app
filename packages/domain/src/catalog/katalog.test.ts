import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  KATALOG,
  TUM_ALT_HIZMETLER,
  altHizmetBul,
  altHizmetinKategorisi,
  kategoriBul,
  ucDil,
} from './katalog.js';

/**
 * KATALOG BRIEF'E BİREBİR UYUYOR MU?
 *
 * Kaynak: `AYNA_HIZMET_KATALOGU_BRIEF.md` v1.0.
 *
 * Brief §7.2: "ID'ler bu dokümandakiyle birebir aynı olacak ve
 * değiştirilmeyecek (analitik ve derin linkler ID'ye bağlanacak)."
 *
 * Bu dosya kimlikleri ve sırayı DONDURUYOR. Bir kimliğin sessizce
 * değişmesi, o hizmete bağlı analitiği ve derin linkleri kırar — ve
 * kırıldığı gün fark edilmez.
 */

test('13 kategori var ve SIRASI brief §3 ile aynı', () => {
  /*
   * Brief §7.3: sıra talep hacmine göre (saç → tırnak → kirpik&kaş → ...)
   * ve varsayılan UI sırasıdır. Sıra değişirse Keşfet ekranı brief'ten
   * sapar.
   */
  assert.deepEqual(
    KATALOG.map((k) => k.id),
    [
      'hair',
      'nails',
      'lashes_brows',
      'epilation',
      'skin',
      'makeup',
      'massage',
      'spa',
      'body_contouring',
      'hair_health',
      'style',
      'wellness',
      'other',
    ],
  );
});

test('her kategorinin alt hizmet SAYISI brief tablolarıyla aynı', () => {
  const beklenen: Record<string, number> = {
    hair: 8,
    nails: 6,
    lashes_brows: 6,
    epilation: 4,
    skin: 4,
    makeup: 4,
    massage: 4,
    spa: 6,
    body_contouring: 6,
    hair_health: 2,
    style: 4,
    wellness: 3,
    other: 7,
  };
  for (const k of KATALOG) {
    assert.equal(k.altHizmetler.length, beklenen[k.id], `${k.id}: alt hizmet sayısı`);
  }
});

test('alt hizmet kimlikleri brief §3 ile BİREBİR', () => {
  // Tam liste: bir kimlik değişirse burada patlar.
  assert.deepEqual(
    TUM_ALT_HIZMETLER.map((a) => a.id),
    [
      'hair.haircut',
      'hair.blowdry',
      'hair.coloring',
      'hair.balayage',
      'hair.keratin',
      'hair.straightening',
      'hair.extensions',
      'hair.event_hair',
      'nails.manicure',
      'nails.hw_manicure',
      'nails.pedicure',
      'nails.gel_polish',
      'nails.nail_extensions',
      'nails.nail_art',
      'lashes_brows.lash_ext',
      'lashes_brows.lash_lift',
      'lashes_brows.brow_shape',
      'lashes_brows.brow_lam',
      'lashes_brows.brow_tint',
      'lashes_brows.microblading',
      'epilation.sugaring',
      'epilation.waxing',
      'epilation.laser',
      'epilation.electrolysis',
      'skin.facial',
      'skin.cleansing',
      'skin.peeling',
      'skin.anti_age',
      'makeup.day_makeup',
      'makeup.bridal',
      'makeup.photo_makeup',
      'makeup.pmu',
      'massage.classic',
      'massage.anticellulite',
      'massage.lymph',
      'massage.body_wrap',
      'spa.spa_package',
      'spa.couple_spa',
      'spa.banya',
      'spa.sauna',
      'spa.float',
      'spa.salt_room',
      'body_contouring.lpg',
      'body_contouring.cavitation',
      'body_contouring.pressotherapy',
      'body_contouring.rf_lifting',
      'body_contouring.cryolipolysis',
      'body_contouring.ems',
      'hair_health.trichology',
      'hair_health.scalp_care',
      'style.color_analysis',
      'style.stylist',
      'style.wardrobe',
      'style.shopping',
      'wellness.yoga',
      'wellness.pilates',
      'wellness.stretching',
      'other.solarium',
      'other.spray_tan',
      'other.henna',
      'other.kids_haircut',
      'other.piercing',
      'other.tattoo',
      'other.podology',
    ],
  );
});

test('kimlikler TEKİL', () => {
  // Aynı kimlik iki kez geçerse arama/analitik sessizce yanlış eşleşir.
  const hepsi = TUM_ALT_HIZMETLER.map((a) => a.id);
  assert.equal(new Set(hepsi).size, hepsi.length, 'tekrarlayan alt hizmet kimliği');
  const katlar = KATALOG.map((k) => k.id);
  assert.equal(new Set(katlar).size, katlar.length, 'tekrarlayan kategori kimliği');
});

test('ÜÇ DİLDE de ad var — hiçbiri boş değil', () => {
  // Brief §2: uygulama dilleri RU/KK/TR. Eksik çeviri, o dilde boş satır.
  for (const k of KATALOG) {
    for (const dil of ['tr', 'kk', 'ru'] as const) {
      assert.ok(k.ad[dil]?.trim(), `${k.id}: kategori adı eksik (${dil})`);
      for (const a of k.altHizmetler) {
        assert.ok(a.ad[dil]?.trim(), `${a.id}: alt hizmet adı eksik (${dil})`);
      }
    }
  }
});

test('REGÜLE hizmetler katalogda YOK', () => {
  /*
   * Brief §5: enjeksiyon (botoks, dolgu, mezoterapi), diş estetiği ve
   * diyetisyen danışmanlığı MVP kapsamı dışında — "uzmanlar SMS + yüz
   * doğrulamayla anında yayına geçtiği için lisanssız medikal işlem satışı
   * ciddi hukuki/itibar riski."
   *
   * Katalogda böyle bir kimlik AÇILIRSA bu test düşer.
   */
  const yasak = ['botox', 'filler', 'dolgu', 'mezo', 'meso', 'diyet', 'diet', 'whitening'];
  for (const a of TUM_ALT_HIZMETLER) {
    for (const y of yasak) {
      assert.equal(a.id.includes(y), false, `regüle hizmet katalogda: ${a.id}`);
    }
  }
});

test('Kazakçadaki Rusça alıntı terimler KORUNUYOR', () => {
  /*
   * Brief §2: "sektörde yerleşik Rusça alıntı terimler (маникюр, шугаринг,
   * ламинация vb.) bilinçli olarak korunmuştur — kullanıcılar bu terimleri
   * böyle arar." Türkçeleştirme girişimi aramayı bozar.
   */
  assert.equal(altHizmetBul('epilation.sugaring')!.ad.kk, 'Шугаринг');
  assert.equal(altHizmetBul('nails.manicure')!.ad.kk, 'Классикалық маникюр');
  assert.equal(altHizmetBul('lashes_brows.lash_lift')!.ad.kk, 'Кірпік ламинациясы');
});

test('kategori ve alt hizmet ARANABİLİYOR', () => {
  assert.equal(kategoriBul('hair')!.ad.tr, 'Saç');
  assert.equal(altHizmetBul('makeup.bridal')!.ad.ru, 'Свадебный макияж');
  assert.equal(kategoriBul('yok-boyle-bir-sey'), undefined);
  assert.equal(altHizmetBul('hair.yok'), undefined);
});

test('alt hizmetten kategoriye çözülüyor', () => {
  assert.equal(altHizmetinKategorisi('lashes_brows.brow_lam'), 'lashes_brows');
  // Nokta içeren ama TANIMSIZ kategori kabul edilmemeli.
  assert.equal(altHizmetinKategorisi('uydurma.alt'), undefined);
  assert.equal(altHizmetinKategorisi('noktasiz'), undefined);
});

test('dil çözümü bilinmeyen dilde TR’ye düşüyor', () => {
  // Ekranda boş metin göstermektense kaynak dili göstermek doğru.
  assert.equal(ucDil({ tr: 'Saç', kk: 'Шаш', ru: 'Волосы' }, 'de'), 'Saç');
  assert.equal(ucDil({ tr: 'Saç', kk: 'Шаш', ru: 'Волосы' }, 'ru'), 'Волосы');
});

test('her kategorinin İKON KONSEPTİ tanımlı', () => {
  // Brief §6.2 — çizim bu metne göre üretiliyor; boşsa ikon işi tarifsiz kalır.
  for (const k of KATALOG) {
    assert.ok(k.ikonKonsepti.trim().length > 5, `${k.id}: ikon konsepti yok`);
  }
});
