import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_SECTORS, sectorsFromServiceIds, servesSector } from './sectors.js';

test('alt hizmet kimliğinden kategori çıkar', () => {
  assert.deepEqual(sectorsFromServiceIds(['hair-cut', 'hair-color']), ['hair']);
});

test('birden çok alan korunur — kayıt ekranındaki asıl senaryo', () => {
  // Uzman saç + tırnak seçtiyse İKİSİNDE de görünmeli. Eskiden yalnız ilki
  // saklanıyordu ve tırnak aramasında hiç çıkmıyordu.
  assert.deepEqual(sectorsFromServiceIds(['hair-cut', 'nails-art', 'nails-pedi']), [
    'hair',
    'nails',
  ]);
});

test('sunucu demo kataloğunun numaralı kimlikleri de çözülür', () => {
  assert.deepEqual(sectorsFromServiceIds(['hair-1', 'nails-3']), ['hair', 'nails']);
});

test('tiresiz kimlik kategorinin kendisidir', () => {
  assert.deepEqual(sectorsFromServiceIds(['hair']), ['hair']);
});

test('ilk hizmetin alanı ilk sırada kalır (ana alan bozulmaz)', () => {
  assert.equal(sectorsFromServiceIds(['nails-art', 'hair-cut'])[0], 'nails');
});

test('bozuk girdi listeyi kirletmez', () => {
  assert.deepEqual(sectorsFromServiceIds([null, 42, '', '  ', '-orphan', 'hair-cut']), ['hair']);
});

test('alan sayısı sınırlanır', () => {
  const cok = Array.from({ length: 40 }, (_, i) => `k${i}-x`);
  assert.equal(sectorsFromServiceIds(cok).length, MAX_SECTORS);
});

test('boş liste boş set verir — uydurma alan yok', () => {
  assert.deepEqual(sectorsFromServiceIds([]), []);
});

// ── servesSector ────────────────────────────────────────────────────────────

test('alan setine göre eşleşir', () => {
  const pro = { sectors: ['hair', 'nails'], sector: 'hair' };
  assert.equal(servesSector(pro, 'nails'), true);
  assert.equal(servesSector(pro, 'brows'), false);
});

test('yogacı tırnak aramasında ÇIKMAZ', () => {
  // Kullanıcının bildirdiği hata: her uzman her alanda görünüyordu.
  const yogaci = { sectors: ['fitness'], sector: 'fitness' };
  assert.equal(servesSector(yogaci, 'nails'), false);
});

test('alan seti boş olan ESKİ kayıt tek sector ile eşleşir', () => {
  // Geçiş sırasında kimse keşiften kaybolmamalı.
  assert.equal(servesSector({ sectors: [], sector: 'hair' }, 'hair'), true);
  assert.equal(servesSector({ sector: 'hair' }, 'hair'), true);
  assert.equal(servesSector({ sectors: null, sector: 'hair' }, 'nails'), false);
});
