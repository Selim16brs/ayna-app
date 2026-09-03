import assert from 'node:assert/strict';
import { test } from 'node:test';
import { KATALOG } from './katalog.js';
import { reguleHizmetler, reguleSebebi } from './regule.js';

/**
 * REGÜLE HİZMET TARAMASI — brief §5.
 *
 * "Enjeksiyon işlemleri (botoks, dudak/yüz dolgusu, mezoterapi — yüz ve
 * saç), diş işlemleri (beyazlatma dahil), beslenme/diyetisyen danışmanlığı
 * katalogda YER ALMAZ… Uzman manuel hizmet adına bu işlemleri yazarsa
 * admin panelde moderasyon kuyruğuna düşer."
 */

test('üç dilde de regüle işlem yakalanıyor', () => {
  for (const ad of [
    'Dudak dolgusu',
    'Yüz botoksu',
    'Botox уколы',
    'Филлеры для губ',
    'Мезотерапия лица',
    'Yüz mezoterapisi',
    'Diş beyazlatma',
    'Отбеливание зубов',
    'Тіс ағарту',
    'Диетолог консультациясы',
    'Diyetisyen görüşmesi',
    'Beslenme danışmanlığı',
  ]) {
    assert.ok(reguleSebebi(ad), `yakalanmadı: ${ad}`);
  }
});

test('BÜYÜK HARF ve türkçe "I" taramayı düşürmüyor', () => {
  /*
   * Uzman adı klavyeden nasıl gelirse gelsin taranmalı. Türkçe kilit:
   * `toLocaleLowerCase('tr-TR')` "DIŞ"ı "dış", "DİŞ"i "diş" yapar ve
   * kural listesiyle eşleşme klavyeye bağlı hâle gelirdi.
   */
  assert.ok(reguleSebebi('DUDAK DOLGUSU'));
  assert.ok(reguleSebebi('DİŞ BEYAZLATMA'));
  assert.ok(reguleSebebi('DIŞ BEYAZLATMA'));
  assert.ok(reguleSebebi('МЕЗОТЕРАПИЯ'));
});

test('TIRNAK DOLGUSU meşru — yanlış pozitif yok', () => {
  /*
   * Brief örnek olarak "dolgu" veriyor ama tırnak dünyasında protez
   * tırnak dolgusu günlük ve tamamen meşru. Her "dolgu"yu işaretlemek her
   * tırnak uzmanını kuyruğa düşürür, kuyruğu kullanılmaz hâle getirir ve
   * asıl tehlikeli kayıtlar gürültüde kaybolurdu.
   */
  assert.equal(reguleSebebi('Dolgu', 'nails.nail_extensions'), undefined);
  assert.equal(reguleSebebi('Tırnak dolgusu', null), undefined, 'serbest yazım da geçmeli');
  // Ama tırnağa bağlı olmayan bir "dudak dolgusu" YAKALANIYOR.
  assert.ok(reguleSebebi('Dudak dolgusu', 'skin.facial'));
});

test('SAÇ BOTOKSU meşru — katalogun kendisinde var', () => {
  /*
   * `hair.keratin` = "Keratin & Saç Botoksu". Saç botoksu enjeksiyon
   * değil keratin bakımıdır. Kendi kataloğumuzdaki hizmeti işaretlemek
   * uzmanları anlamsızca kuyruğa düşürürdü.
   */
  assert.equal(reguleSebebi('Keratin & Saç Botoksu', 'hair.keratin'), undefined);
  assert.equal(reguleSebebi('Saç botoksu', null), undefined, 'serbest yazım da geçmeli');
  assert.equal(reguleSebebi('Ботокс для волос', null), undefined);
  /*
   * Uzman satırı kısaca "Botoks" diye adlandırabilir; hangi botoks
   * olduğunu BAĞLI OLDUĞU ALT HİZMET söylüyor. Ad öbeğe benzemiyor,
   * onu kurtaran tek şey kategori muafiyeti.
   */
  assert.equal(reguleSebebi('Botoks', 'hair.keratin'), undefined);
  assert.equal(reguleSebebi('Botoks', 'hair_health.scalp_care'), undefined);
  // Aynı kısa ad CİLDE bağlıysa yakalanıyor.
  assert.ok(reguleSebebi('Botoks', 'skin.anti_age'));
  // Yüz botoksu YAKALANIYOR.
  assert.ok(reguleSebebi('Botoks (yüz)', null));
});

test('CİLT beyazlatma meşru — regüle olan DİŞ beyazlatma', () => {
  // "beyazlatma" tek başına aranmıyor; cilt beyazlatma meşru kozmetik.
  assert.equal(reguleSebebi('Cilt beyazlatma', 'skin.facial'), undefined);
  assert.equal(reguleSebebi('Leke ve beyazlatma bakımı', null), undefined);
  assert.ok(reguleSebebi('Diş beyazlatma', null));
});

test('SAÇ MEZOTERAPİSİ yakalanıyor — brief "yüz ve saç" diyor', () => {
  // Saç botoksu muaf ama saç mezoterapisi DEĞİL: brief §5 mezoterapiyi
  // "(yüz ve saç)" diye açıkça ikisini de kapsayacak şekilde yazıyor.
  assert.ok(reguleSebebi('Saç mezoterapisi', 'hair_health.scalp_care'));
});

test('KATALOGDAKİ HİÇBİR HİZMET işaretlenmiyor', () => {
  /*
   * En güçlü yanlış-pozitif kontrolü: kendi kataloğumuzun 64 adının
   * hiçbiri kuyruğa düşmemeli. Uzman katalogdaki adı aynen yazdığında
   * moderasyona gitmesi saçma olurdu.
   */
  const isaretli: string[] = [];
  for (const k of KATALOG) {
    for (const a of k.altHizmetler) {
      for (const dil of ['tr', 'kk', 'ru'] as const) {
        if (reguleSebebi(a.ad[dil], a.id)) isaretli.push(`${a.id}/${dil}: ${a.ad[dil]}`);
      }
    }
  }
  assert.deepEqual(isaretli, [], `katalog hizmeti işaretlendi: ${isaretli.join(' · ')}`);
});

test('sıradan hizmet adları işaretlenmiyor', () => {
  for (const ad of [
    'Kesim & fön',
    'Roza özel bakım paketi',
    'Gelin saçı',
    'Klasik manikür',
    'Шугаринг ног',
    'Lenf drenaj masajı',
  ]) {
    assert.equal(reguleSebebi(ad), undefined, `yanlış yere işaretlendi: ${ad}`);
  }
});

test('liste taraması: yalnız regüle satırlar, tekrarsız', () => {
  const bulunan = reguleHizmetler([
    { id: 'hair.haircut', name: 'Kesim' },
    { id: 'nails.nail_extensions', name: 'Dolgu' },
    { serviceId: null, name: 'Dudak dolgusu' },
    { serviceId: null, name: 'DUDAK DOLGUSU' },
    { name: 'Diş beyazlatma' },
    { name: 42 },
    null,
  ] as never);
  assert.deepEqual(
    bulunan.map((b) => b.ad),
    ['Dudak dolgusu', 'Diş beyazlatma'],
  );
  assert.ok(bulunan[0]!.sebep.includes('dolgu'));
});

test('boş ve bozuk girdi çökertmiyor', () => {
  assert.equal(reguleSebebi(''), undefined);
  assert.equal(reguleSebebi('   '), undefined);
  assert.equal(reguleSebebi(undefined as never), undefined);
  assert.deepEqual(reguleHizmetler([] as never), []);
});
