import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CATEGORY_DEFAULTS, CATEGORY_IDS } from './category-ids.js';

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

test('panelde eksik olan dördü artık var', () => {
  for (const id of ['pmu', 'bridal', 'wellness', 'style'] as const) {
    assert.ok(CATEGORY_DEFAULTS[id], `${id} hâlâ eksik`);
  }
});
