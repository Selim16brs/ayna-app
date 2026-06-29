import assert from 'node:assert/strict';
import { test } from 'node:test';
import { kk, ru, tr } from './index.js';

// tr KAYNAK dildir ve eksiksiz olmalı. kk/ru alt küme olabilir (eksikler tr'ye düşer),
// fakat tr'de OLMAYAN bir anahtar içeremezler (yetim çeviri = hata).
const trKeys = new Set(Object.keys(tr));

test('kk/ru yalnızca tr içinde var olan anahtarları içerir', () => {
  for (const k of Object.keys(kk)) assert.ok(trKeys.has(k), `kk yetim anahtar: ${k}`);
  for (const k of Object.keys(ru)) assert.ok(trKeys.has(k), `ru yetim anahtar: ${k}`);
});

test('hiçbir çeviri boş değil', () => {
  for (const [locale, dict] of Object.entries({ tr, kk, ru })) {
    for (const [key, value] of Object.entries(dict)) {
      assert.ok((value ?? '').trim().length > 0, `${locale}.${key} boş`);
    }
  }
});

test('tr kaynak dili boş değil', () => {
  assert.ok(Object.keys(tr).length > 0);
});
