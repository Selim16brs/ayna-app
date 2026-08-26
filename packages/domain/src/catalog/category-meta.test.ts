import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CATEGORY_IDS, CATEGORY_META } from './category-ids.js';

/**
 * Kategori tablosu uygulamayla AYNI olmalı.
 *
 * `service_categories` 8 satır içeriyordu, uygulamada 12 kategori vardı.
 * Eksik dördün ikisi (pmu, bridal) AKTİFTİ — o kategoriler admin panelinde
 * hiç görünmüyordu, çünkü panel bu tabloyu okuyor.
 */

test('her kategorinin görünen bilgisi var', () => {
  for (const id of CATEGORY_IDS) {
    const m = CATEGORY_META[id];
    assert.ok(m, `${id} için meta yok — tabloya eklenemez`);
    assert.ok(m.nameTr.trim().length > 0, `${id} adsız`);
    assert.ok(m.icon.trim().length > 0, `${id} ikonsuz`);
  }
});

test('sıralama benzersiz — panelde rastgele dizilmesin', () => {
  const s = CATEGORY_IDS.map((id) => CATEGORY_META[id].sortOrder);
  assert.equal(new Set(s).size, s.length, `çakışan sortOrder: ${s.join(', ')}`);
});

test('meta ile kimlik listesi birebir', () => {
  assert.deepEqual(Object.keys(CATEGORY_META).sort(), [...CATEGORY_IDS].sort());
});
