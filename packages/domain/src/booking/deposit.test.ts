import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_DEPOSIT_RULES,
  DEPOSIT_SETTING_KEYS,
  depositFor,
  depositRulesFrom,
} from './deposit.js';

test('20.000 ₸ hizmette peşinat 2.000 ₸ (%10)', () => {
  assert.equal(depositFor(20_000), 2000);
});

// ── depositRulesFrom ────────────────────────────────────────────────────────

test('null intValue varsayılana düşer — silinmiş ayar hesabı bozmaz', () => {
  const rules = depositRulesFrom([
    { key: 'rate.deposit_pct', intValue: null },
    { key: 'rate.deposit_min', intValue: null },
  ]);
  assert.deepEqual(rules, DEFAULT_DEPOSIT_RULES);
});

// ── TEK KURAL: peşin = %10 ─────────────────────────────────────────────────

test('peşinat her fiyatta TAM %10', () => {
  // Kurucu: "kullanıcı randevu esnasında toplam işlem ücretinin %10'unu öder."
  assert.equal(depositFor(20_000), 2000);
  assert.equal(depositFor(10_000), 1000);
  assert.equal(depositFor(1000), 100);
  assert.equal(depositFor(500), 50);
  assert.equal(depositFor(100_000), 10_000);
});

test('alt/üst sınır KALDIRILDI — yüzdenin üstüne ikinci kural binmiyor', () => {
  // Eskiden 1.000 ₸ alt sınır 1.000 ₸'lik hizmette TAMAMINI istiyordu;
  // 5.000 ₸ üst sınır da 100.000 ₸'lik hizmeti %5'e düşürüyordu.
  assert.equal(depositFor(1000), 100, 'alt sınır hâlâ devrede');
  assert.equal(depositFor(100_000), 10_000, 'üst sınır hâlâ devrede');
});

test('kalan bakiye her zaman %90', () => {
  for (const p of [500, 1000, 7777, 20_000, 100_000]) {
    const d = depositFor(p);
    assert.ok(d < p, `${p} ₸ hizmette kalan bakiye yok`);
    // %10 ± yuvarlama adımı (100 ₸)
    assert.ok(Math.abs(d - p * 0.1) <= 50, `${p} → ${d} yüzde ondan sapıyor`);
  }
});

test('geçersiz fiyat peşinat üretmez', () => {
  for (const p of [0, -100, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(depositFor(p), 0, `fiyat ${p}`);
  }
});

test('oran admin panelinden değiştirilebilir', () => {
  const kural = depositRulesFrom([{ key: 'rate.deposit_pct', intValue: 20 }]);
  assert.equal(kural.pct, 20);
  assert.equal(depositFor(20_000, kural), 4000);
});

test('yuvarlama yüzdeyi BOZMUYOR — 100 ₸ adımı kaldırıldı', () => {
  // 500 ₸'lik hizmette %10 = 50 ₸; adıma yuvarlama 100 ₸ (yani %20) üretiyordu.
  assert.equal(depositFor(500), 50);
  assert.equal(depositFor(333), 33);
});

test('TEK PARAMETRE — kural yalnız yüzdeden ibaret', () => {
  // Alt sınır, üst sınır, adım ve tavan KALDIRILDI. Kullanılmadıkları hâlde
  // ayar gibi durmaları, para akışında "birden fazla kural" görüntüsü
  // yaratıyordu; panelde değiştirilebilir görünüp hiçbir şeyi değiştirmiyorlardı.
  assert.deepEqual(DEFAULT_DEPOSIT_RULES, { pct: 10 });
  assert.deepEqual(DEPOSIT_SETTING_KEYS, ['rate.deposit_pct']);
});
