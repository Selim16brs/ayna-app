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

// EK Z.9 — kk/ru gerçek çevrilmiş olmalı: tr ile BİREBİR AYNI + Latince bir değer,
// çevrilmemiş (Türkçe kalmış) sinyalidir. İstisna: marka/özel/uluslararası terimler
// ve salt-interpolasyon değerleri (tüm dillerde aynı kalır).
const ALLOWED_IDENTICAL = new Set([
  'AYNA',
  'AYNA Life',
  'AYNA Passport',
  'AYNA Platinum',
  'AYNA Premium',
  'AYNA Safe',
  'AYNA W2W',
  'Always',
  'Always ✓',
  'App Store',
  'Boni',
  'Express',
  'Google Play',
  'Nail',
  'No-show',
  'Offline',
  'Platinum',
  'Premium',
  'Spa & Wellness',
  'TOP',
  '{pro} · {slot}',
]);
const hasCyrillic = (s: string) => /[а-яА-ЯёЁ]/.test(s);
const hasLatinWord = (s: string) => /[a-zA-ZçğıöşüÇĞİÖŞÜ]{3,}/.test(s);

test('kk/ru çevrilmemiş (tr ile aynı, Latince) girdi içermez', () => {
  for (const [locale, dict] of Object.entries({ kk, ru })) {
    for (const key of Object.keys(tr)) {
      const v = (dict as Record<string, string>)[key];
      if (v === undefined) continue; // eksikse tr'ye düşer (üstteki testler kapsıyor)
      if (v === tr[key as keyof typeof tr] && hasLatinWord(v) && !hasCyrillic(v)) {
        assert.ok(
          ALLOWED_IDENTICAL.has(v.trim()),
          `${locale}.${key} çevrilmemiş görünüyor: ${JSON.stringify(v)}`,
        );
      }
    }
  }
});
