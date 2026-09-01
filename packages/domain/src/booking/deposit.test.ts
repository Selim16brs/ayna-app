import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_DEPOSIT_RULES,
  DEPOSIT_SETTING_KEYS,
  depositFor,
  depositRulesFrom,
  odemeReferansi,
  reklamGunu,
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

test('ödeme referansı kararlı ve tek biçimli', () => {
  // Müşteriye gösterilen kodla adminin aradığı kod AYNI türetmeden gelmeli.
  assert.equal(odemeReferansi('bk-abc12'), 'AYNA-ABC12');
  // Ayırıcılar atılır: kimlik biçimi değişse de kod aynı kalır.
  assert.equal(odemeReferansi('bk_ab-c12'), 'AYNA-ABC12');
  // Kısa kimlikte de kod üretilir (kırpma değil, olanı al).
  assert.equal(odemeReferansi('x9'), 'AYNA-X9');
  // Aynı girdi her zaman aynı çıktı — saklanmadığı için bu şart.
  assert.equal(odemeReferansi('bk-77aa'), odemeReferansi('bk-77aa'));
});

test('reklam gün sayacı: ilk gün 1/30, son gün 30/30', () => {
  const GUN = 86_400_000;
  const bas = Date.UTC(2026, 0, 1);
  const bit = bas + 30 * GUN;
  // İlk gün 1'dir; 0/30 göstermek insanın saymadığı gibi saymaktır.
  assert.deepEqual(reklamGunu(bas, bit, bas), { gun: 1, toplam: 30, kalan: 30 });
  assert.equal(reklamGunu(bas, bit, bas + 4 * 3600_000).gun, 1, 'ilk gün içinde hâlâ 1');
  assert.equal(reklamGunu(bas, bit, bas + GUN).gun, 2);
  assert.equal(reklamGunu(bas, bit, bas + 29 * GUN).gun, 30, 'son gün 30/30');
  // Gün toplamı AŞAMAZ: süresi geçmiş kayıt "31/30" göstermemeli.
  assert.equal(reklamGunu(bas, bit, bas + 45 * GUN).gun, 30);
  assert.equal(reklamGunu(bas, bit, bas + 45 * GUN).kalan, 0, 'biten reklamda kalan 0');
});

test('reklam gün sayacı: kalan YUKARI yuvarlanır', () => {
  const GUN = 86_400_000;
  const bas = Date.UTC(2026, 0, 1);
  const bit = bas + 30 * GUN;
  // Son günün içindeki 4 saat de "1 gün kaldı"dır; 0 demek bitmiş demektir.
  assert.equal(reklamGunu(bas, bit, bit - 4 * 3600_000).kalan, 1);
  assert.equal(reklamGunu(bas, bit, bit).kalan, 0);
});
