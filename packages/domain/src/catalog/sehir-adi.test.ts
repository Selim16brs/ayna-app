import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SEHIRLER,
  kanonikSehir,
  sehirAnahtari,
  sehirEslesir,
  sehirYazimlari,
} from './sehir-adi.js';

/**
 * Aynı şehrin üç yazımı TEK şehir sayılmalı.
 *
 * Canlıda görülen (05.09.2026): haritadan konumunu işaretleyen uzmanın
 * şehri 'Алматы' oluyordu (ters geocode Kazakistan'da Rusça döner);
 * 'Almatı' şehrindeki müşterinin keşif ekranı `p.city === city` diye düz
 * metin karşılaştırdığı için o uzman SESSİZCE kayboluyordu. Kampanyası da
 * hiç görünmüyordu — kampanya şehri kayıt anında kopyalanıyor.
 */

/** 28 kanonik şehrin Rusça adları — canlıda ters geocode bunları döndürüyor. */
const RUSCA: Record<string, string> = {
  Aktau: 'Актау',
  Aktöbe: 'Актобе',
  Almatı: 'Алматы',
  Arkalık: 'Аркалык',
  Astana: 'Астана',
  Atırav: 'Атырау',
  Balkaş: 'Балхаш',
  Ekibastuz: 'Экибастуз',
  Jezkazgan: 'Жезказган',
  Janaözen: 'Жанаозен',
  Karagandı: 'Караганда',
  Kentau: 'Кентау',
  Kızılorda: 'Кызылорда',
  Kökşetau: 'Кокшетау',
  Kostanay: 'Костанай',
  Oral: 'Уральск',
  Öskemen: 'Усть-Каменогорск',
  Pavlodar: 'Павлодар',
  Ridder: 'Риддер',
  Rudnıy: 'Рудный',
  Sarıağaş: 'Сарыагаш',
  Semey: 'Семей',
  Stepnogorsk: 'Степногорск',
  Şımkent: 'Шымкент',
  Taldıkorgan: 'Талдыкорган',
  Taraz: 'Тараз',
  Temirtau: 'Темиртау',
  Türkistan: 'Туркестан',
};

/** Kazakça yazımlar — uygulamanın kk dilinde girilen adlar. */
const KAZAKCA: Record<string, string> = {
  Almatı: 'Алматы',
  Astana: 'Астана',
  Şımkent: 'Шымкент',
  Karagandı: 'Қарағанды',
  Aktöbe: 'Ақтөбе',
  Atırav: 'Атырау',
  Kızılorda: 'Қызылорда',
  Türkistan: 'Түркістан',
  Öskemen: 'Өскемен',
  Kökşetau: 'Көкшетау',
  Kostanay: 'Қостанай',
  Janaözen: 'Жаңаөзен',
  Jezkazgan: 'Жезқазған',
  Balkaş: 'Балқаш',
  Taldıkorgan: 'Талдықорған',
  Sarıağaş: 'Сарыағаш',
  Oral: 'Орал',
};

test('HER kanonik şehrin RUSÇA adı aynı şehre çözülüyor', () => {
  for (const sehir of SEHIRLER) {
    const rusca = RUSCA[sehir];
    assert.ok(rusca, `${sehir}: Rusça karşılık tablosu eksik`);
    assert.equal(kanonikSehir(rusca), sehir, `${rusca} → ${sehir} çözülmüyor`);
  }
});

test('KAZAKÇA yazımlar da aynı şehre çözülüyor', () => {
  for (const [sehir, kazakca] of Object.entries(KAZAKCA)) {
    assert.equal(kanonikSehir(kazakca), sehir, `${kazakca} → ${sehir} çözülmüyor`);
  }
});

test('LATİN romanizasyonları — geocode ve elle giriş', () => {
  const cift: [string, string][] = [
    ['Almaty', 'Almatı'],
    ['Shymkent', 'Şımkent'],
    ['Karaganda', 'Karagandı'],
    ['Atyrau', 'Atırav'],
    ['Aktobe', 'Aktöbe'],
    ['Kyzylorda', 'Kızılorda'],
    ['Taldykorgan', 'Taldıkorgan'],
    ['Ust-Kamenogorsk', 'Öskemen'],
    ['Uralsk', 'Oral'],
    ['Nur-Sultan', 'Astana'],
    ['Alma-Ata', 'Almatı'],
    ['Semipalatinsk', 'Semey'],
  ];
  for (const [yazim, beklenen] of cift) {
    assert.equal(kanonikSehir(yazim), beklenen, `${yazim} → ${beklenen} çözülmüyor`);
  }
});

test('kanonik ad KENDİSİNE çözülüyor — liste kendiyle tutarlı', () => {
  for (const sehir of SEHIRLER) assert.equal(kanonikSehir(sehir), sehir);
});

test('İKİ FARKLI şehir aynı anahtara düşmüyor', () => {
  // Takma ad listesi genişledikçe en büyük risk bu: iki şehri tek şehir
  // saymak, birinin uzmanlarını diğerinin müşterisine göstermek demek.
  const anahtarlar = SEHIRLER.map((s) => sehirAnahtari(s));
  assert.equal(new Set(anahtarlar).size, SEHIRLER.length, 'iki şehir aynı anahtarda');
});

test('TANINMAYAN ad uydurulmuyor', () => {
  // En yakın benzerine çekmek, kullanıcıyı hiç yaşamadığı şehre taşırdı.
  assert.equal(kanonikSehir('Berlin'), null);
  assert.equal(kanonikSehir('İstanbul'), null);
  assert.equal(kanonikSehir(''), null);
  assert.equal(kanonikSehir(null), null);
});

test('BOŞ şehir hiçbir şeyle eşleşmiyor', () => {
  // Yoksa şehri girilmemiş iki kayıt "aynı şehirde" sayılırdı.
  assert.equal(sehirEslesir('', ''), false);
  assert.equal(sehirEslesir(null, 'Almatı'), false);
  assert.equal(sehirEslesir('Almatı', undefined), false);
});

test('FARKLI şehirler eşleşmiyor', () => {
  assert.equal(sehirEslesir('Almatı', 'Astana'), false);
  assert.equal(sehirEslesir('Алматы', 'Астана'), false);
  assert.equal(sehirEslesir('Semey', 'Şımkent'), false);
});

test('AYNI şehrin yazımları eşleşiyor', () => {
  assert.equal(sehirEslesir('Almatı', 'Алматы'), true);
  assert.equal(sehirEslesir('Алматы', 'Almaty'), true);
  assert.equal(sehirEslesir('  ALMATI  ', 'алматы'), true);
  assert.equal(sehirEslesir('Şımkent', 'Shymkent'), true);
});

test('yazım listesi SORGU için tüm biçimleri veriyor', () => {
  const y = sehirYazimlari('Алматы');
  assert.ok(y.includes('Almatı'), 'kanonik ad listede yok');
  assert.ok(y.includes('Алматы'), 'sorgudaki ham ad listede yok');
  // Tanınmayan şehir: ham ad tek başına dönüyor — sorgu boşa düşmesin.
  assert.deepEqual(sehirYazimlari('Berlin'), ['Berlin']);
  assert.deepEqual(sehirYazimlari(''), []);
});

test('yazım listesi RUSÇA ve KAZAKÇA adları da içeriyor', () => {
  // Veritabanı sütunu ham metin: sorgu bu literalleri içermezse haritadan
  // işaretlenmiş ('Алматы') kayıtlar hiçbir zaman bulunmaz.
  for (const sehir of SEHIRLER) {
    const y = sehirYazimlari(sehir);
    assert.ok(y.includes(sehir), `${sehir}: kanonik ad listede yok`);
    assert.ok(
      y.some((x) => /[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/.test(x)),
      `${sehir}: Kiril yazım listede yok — canlıdaki kayıt bulunamaz`,
    );
  }
});

test('yazım listesi HANGİ yazımla sorulursa sorulsun tüm bilinenleri veriyor', () => {
  const bilinen = sehirYazimlari('Almatı');
  for (const soru of ['Алматы', 'almaty', '  ALMATI ', 'Алма-Ата']) {
    const y = sehirYazimlari(soru);
    for (const b of bilinen) {
      assert.ok(y.includes(b), `"${soru}" sorusunda "${b}" yazımı düşüyor`);
    }
    // SORULAN ham ad da listede: veritabanında tam o metinle duran satır
    // (ör. kullanıcının elle yazdığı bir biçim) sorgudan düşmesin.
    assert.ok(y.includes(soru.trim()) || y.includes(soru), `"${soru}" ham hâliyle listede yok`);
  }
});
