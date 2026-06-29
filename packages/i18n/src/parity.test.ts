import assert from 'node:assert/strict';
import { test } from 'node:test';
import { kk, ru, tr } from './index.js';

// CI gate: tüm diller aynı anahtar kümesine sahip olmalı (eksik çeviri prod'a kaçmasın — risk R11)
// tr kaynak dildir; kk/ru onunla birebir eşleşmeli.
test('tr, kk ve ru aynı anahtar kümesine sahip', () => {
  const trKeys = Object.keys(tr).sort();
  assert.deepEqual(Object.keys(kk).sort(), trKeys, 'kk anahtarları tr ile eşleşmiyor');
  assert.deepEqual(Object.keys(ru).sort(), trKeys, 'ru anahtarları tr ile eşleşmiyor');
});

test('hiçbir çeviri boş değil', () => {
  for (const [locale, dict] of Object.entries({ tr, kk, ru })) {
    for (const [key, value] of Object.entries(dict)) {
      assert.ok(value.trim().length > 0, `${locale}.${key} boş`);
    }
  }
});
