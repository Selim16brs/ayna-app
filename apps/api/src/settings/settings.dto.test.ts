import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apiKeySchema, citiesSchema, rateSchema } from './settings.dto';
import { maskKey } from './settings.service';

// §12.9 — maskeleme: ham anahtar ASLA sızmamalı
test('maskKey: uzun anahtar ilk3+son4 gösterir, arası gizli', () => {
  const out = maskKey('sk-test1234567890abcdef');
  assert.equal(out, 'sk-****…cdef');
  assert.ok(!out.includes('test1234567890'), 'orta kısım sızmamalı');
});

test('maskKey: boş/null → boş', () => {
  assert.equal(maskKey(''), '');
  assert.equal(maskKey(null), '');
});

test('maskKey: kısa değer tamamen maskeli', () => {
  assert.equal(maskKey('abc'), '****');
  assert.equal(maskKey('12345678'), '****');
});

// §12.9 — parametrik oran anahtarı beyaz listeye kapalı
test('rateSchema: geçerli anahtar + tamsayı kabul', () => {
  const r = rateSchema.safeParse({ key: 'commission.rate', value: 15 });
  assert.equal(r.success, true);
});

test('rateSchema: bilinmeyen anahtar reddedilir', () => {
  const r = rateSchema.safeParse({ key: 'rate.bogus', value: 5 });
  assert.equal(r.success, false);
});

test('rateSchema: negatif değer reddedilir', () => {
  const r = rateSchema.safeParse({ key: 'rate.deposit_kzt', value: -1 });
  assert.equal(r.success, false);
});

// §12.9 — API anahtarı: boş değer temizleme için geçerli (provider whitelisted)
test('apiKeySchema: geçerli provider + boş değer (temizle) kabul', () => {
  assert.equal(apiKeySchema.safeParse({ provider: 'openai', value: '' }).success, true);
  assert.equal(apiKeySchema.safeParse({ provider: 'sms', value: 'x'.repeat(50) }).success, true);
});

test('apiKeySchema: bilinmeyen provider reddedilir', () => {
  assert.equal(apiKeySchema.safeParse({ provider: 'stripe', value: 'x' }).success, false);
});

// §12.9 — şehir yönetimi
test('citiesSchema: aktif+yakında dizileri kabul', () => {
  const r = citiesSchema.safeParse({ active: ['Almatı'], soon: ['Astana', 'Şımkent'] });
  assert.equal(r.success, true);
});

test('citiesSchema: boş string şehir reddedilir', () => {
  assert.equal(citiesSchema.safeParse({ active: [''], soon: [] }).success, false);
});
