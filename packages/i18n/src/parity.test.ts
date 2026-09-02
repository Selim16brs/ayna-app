import assert from 'node:assert/strict';
import { test } from 'node:test';
import { kk, ru, tr } from './index.js';

// tr KAYNAK dildir ve eksiksiz olmalı; kk/ru onunla BİREBİR aynı anahtar kümesine
// sahip olmalı (CLAUDE.md: "kk/ru parite testi 3 dili senkron tutar").
//
// Bu test eskiden yalnız TEK YÖN denetliyordu — "kk/ru'da olup tr'de olmayan"
// yetim anahtar. Eksik yönü "alt küme olabilir, eksikler tr'ye düşer" diye
// gerekçelendirmiştim. Geri düşüş hatayı çözmüyor, GİZLİYOR: uzman doğrulama
// ekranının 17 anahtarı ru'ya hiç eklenmemişti ve Rus uzman ekranı baştan sona
// Türkçe görüyordu. Çökme yok, uyarı yok — kk %100 tamdı, yani politika değil
// unutulmuş bir çeviriydi. ru + kk birincil pazar dilleri; eksik olan hata.
const trKeys = new Set(Object.keys(tr));

test('kk/ru yalnızca tr içinde var olan anahtarları içerir', () => {
  for (const k of Object.keys(kk)) assert.ok(trKeys.has(k), `kk yetim anahtar: ${k}`);
  for (const k of Object.keys(ru)) assert.ok(trKeys.has(k), `ru yetim anahtar: ${k}`);
});

test('her tr anahtarının kk ve ru karşılığı var', () => {
  for (const [ad, sozluk] of Object.entries({ kk, ru })) {
    const eksik = Object.keys(tr).filter((k) => !(k in sozluk));
    assert.deepEqual(
      eksik,
      [],
      `${ad} çevirisi eksik (${eksik.length}) — kullanıcı bu ekranı Türkçe görür:\n  ` +
        eksik.join('\n  '),
    );
  }
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
  // İsimli selamlama: '{selam}' saate göre karşılama, '{ad}' kullanıcının adı.
  // Kelimesi yok, üç dilde de aynı — çeviri eksikliği değil.
  '{selam}, {ad}',
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
