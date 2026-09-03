import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CATEGORY_DEFAULTS, CATEGORY_IDS, CATEGORY_META } from './category-ids.js';
import { KATALOG } from './katalog.js';

/**
 * Kategori listesi TEK KAYNAKTAN gelmeli.
 *
 * Liste iki yerde ayrı yazılıydı: mobil taksonomide 12, sunucunun admin
 * varsayılanında 8 kategori. Eksik dördün İKİSİ AKTİFTİ (pmu, bridal) —
 * o kategorilerde uzman vardı ama panelde kategori hiç görünmüyor, bakım
 * periyodu ve hizmet süresi ayarlanamıyordu.
 */

test('her kategorinin varsayılanı var', () => {
  // Eksik girdi = panelde görünmeyen kategori. Sorun tam olarak buydu.
  for (const id of CATEGORY_IDS) {
    assert.ok(CATEGORY_DEFAULTS[id], `${id} için varsayılan yok — panelde görünmez`);
  }
});

test('varsayılanlarda fazladan kategori yok', () => {
  const fazla = Object.keys(CATEGORY_DEFAULTS).filter(
    (k) => !(CATEGORY_IDS as readonly string[]).includes(k),
  );
  assert.deepEqual(fazla, [], `listede olmayan kategori(ler): ${fazla.join(', ')}`);
});

test('kimlikler benzersiz', () => {
  assert.equal(new Set(CATEGORY_IDS).size, CATEGORY_IDS.length);
});

test('değerler makul aralıkta', () => {
  for (const id of CATEGORY_IDS) {
    const d = CATEGORY_DEFAULTS[id];
    assert.ok(d.maintenanceDays >= 0 && d.maintenanceDays <= 730, `${id} bakım periyodu saçma`);
    // Sıfır süre randevu takvimini kırar: slot hesabı süreye bölünüyor.
    assert.ok(d.serviceMin > 0 && d.serviceMin <= 480, `${id} hizmet süresi saçma`);
  }
});

test('KATALOGDAKİ her kategorinin varsayılanı var — panelde ayarsız kalan yok', () => {
  /*
   * Bu testin asıl derdi: admin paneli `service_categories` tablosunu
   * okuyor ve varsayılanı olmayan kategori orada AYARSIZ görünüyor.
   * Eskiden dört kategori (pmu, bridal, wellness, style) elle unutulmuştu.
   *
   * Artık liste katalogdan geliyor; katalog büyüdüğünde bu test hangi
   * kategoriye varsayılan konmadığını söyler.
   */
  const eksik = KATALOG.map((k) => k.id).filter((id) => !CATEGORY_DEFAULTS[id]);
  assert.deepEqual(eksik, [], `varsayılanı olmayan kategori: ${eksik.join(', ')}`);
});

test('varsayılanlar KATALOGDA OLMAYAN kategori taşımıyor', () => {
  // Kategori kimliği değişince (`skincare` → `skin`) eski satır burada
  // öylece kalır: panelde karşılığı olmayan bir ayar görünür.
  const gecerli = new Set(KATALOG.map((k) => k.id));
  const fazla = Object.keys(CATEGORY_DEFAULTS).filter((id) => !gecerli.has(id));
  assert.deepEqual(fazla, [], `katalogda karşılığı olmayan varsayılan: ${fazla.join(', ')}`);
});

test('kategori kimlikleri ve meta KATALOGLA birebir', () => {
  assert.deepEqual(
    CATEGORY_IDS,
    KATALOG.map((k) => k.id),
    'kimlik listesi katalogdan sapmış',
  );
  for (const k of KATALOG) {
    assert.equal(CATEGORY_META[k.id]?.nameTr, k.ad.tr, `${k.id} adı katalogla aynı değil`);
  }
});
