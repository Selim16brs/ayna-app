import assert from 'node:assert/strict';
import { test } from 'node:test';
import { kk, ru } from './index.js';

// CI gate: kk ve ru anahtarları birebir aynı olmalı (eksik çeviri prod'a kaçmasın — risk R11)
test('kk ve ru aynı anahtar kümesine sahip', () => {
  const kkKeys = Object.keys(kk).sort();
  const ruKeys = Object.keys(ru).sort();
  assert.deepEqual(kkKeys, ruKeys, 'kk ve ru çeviri anahtarları eşleşmiyor');
});

test('hiçbir çeviri boş değil', () => {
  for (const [locale, dict] of Object.entries({ kk, ru })) {
    for (const [key, value] of Object.entries(dict)) {
      assert.ok(value.trim().length > 0, `${locale}.${key} boş`);
    }
  }
});
