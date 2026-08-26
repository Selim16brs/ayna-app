import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SPEND_RULES, paymentSplit, spendGate, shouldUnlock } from './spend-rules.js';

const KILITLI = null;
const ACIK = new Date('2026-01-01T00:00:00Z');

test('K4 varsayılanları kararla aynı: 5.000 eşik, %25 tavan', () => {
  // Eşik 50.000'den 5.000'e indirildi: 90 günlük yanma kuralıyla birlikte
  // 50.000 matematiksel olarak ulaşılamıyordu (3 ayda ~111 randevu).
  assert.deepEqual(DEFAULT_SPEND_RULES, { unlockAt: 5_000, capPct: 25 });
});

// ── K4.2 kilit ──────────────────────────────────────────────────────────────

test('eşiğin altında puan harcanamaz', () => {
  const g = spendGate(4_000, KILITLI);
  assert.equal(g.allowed, false);
  assert.equal(g.allowed === false && g.remaining, 1001);
});

test('tam eşikte HENÜZ açılmaz — kural "üzerine çıkınca"', () => {
  assert.equal(spendGate(5_000, KILITLI).allowed, false);
  assert.equal(spendGate(5_001, KILITLI).allowed, true);
});

test('kilit bir kez açıldıysa bakiye düşse de kapanmaz (V1)', () => {
  assert.equal(spendGate(100, ACIK).allowed, true);
  assert.equal(spendGate(0, ACIK).allowed, true);
});

test('shouldUnlock yalnız eşik AŞILDIĞINDA ve damga yokken true', () => {
  assert.equal(shouldUnlock(5_001, KILITLI), true);
  assert.equal(shouldUnlock(5_000, KILITLI), false);
  assert.equal(shouldUnlock(90_000, ACIK), false, 'zaten açık — tekrar damgalama');
});

test('kilitliyken ödeme tamamen nakit ve sebebi bildirilir', () => {
  const r = paymentSplit(20_000, 5_000, 4_000, KILITLI);
  assert.deepEqual(r, { pointsUsed: 0, cashAmount: 20_000, blocked: 'LOCKED' });
});

// ── K4.3 tavan ──────────────────────────────────────────────────────────────

test('tavan: 20.000 ₸ ödemede en çok 5.000 puan', () => {
  const r = paymentSplit(20_000, 99_999, 80_000, ACIK);
  assert.equal(r.pointsUsed, 5_000);
  assert.equal(r.cashAmount, 15_000);
});

test('eski %50 tavanı artık geçerli değil', () => {
  assert.equal(paymentSplit(10_000, 10_000, 80_000, ACIK).pointsUsed, 2_500);
});

test('istenen tavanın altındaysa istenen kadar', () => {
  const r = paymentSplit(20_000, 1_200, 80_000, ACIK);
  assert.equal(r.pointsUsed, 1_200);
  assert.equal(r.cashAmount, 18_800);
});

test('bakiye tavandan azsa bakiye sınırlar', () => {
  const r = paymentSplit(20_000, 5_000, 900, ACIK);
  assert.equal(r.pointsUsed, 900);
  assert.equal(r.cashAmount, 19_100);
});

test('puan istenmediyse tamamı nakit', () => {
  assert.equal(paymentSplit(20_000, 0, 80_000, ACIK).pointsUsed, 0);
});

test('tavan aşağı yuvarlanır — kuruş oluşmaz', () => {
  // 999 × %25 = 249,75 → 249
  assert.equal(paymentSplit(999, 999, 80_000, ACIK).pointsUsed, 249);
});

test('nakit + puan her zaman tutarı verir', () => {
  for (const tutar of [1, 999, 10_000, 20_000, 33_333, 250_000]) {
    for (const istenen of [0, 1, 5_000, 999_999]) {
      const r = paymentSplit(tutar, istenen, 500_000, ACIK);
      assert.equal(r.pointsUsed + r.cashAmount, tutar, `${tutar}/${istenen}`);
      assert.ok(r.pointsUsed >= 0 && r.cashAmount >= 0);
    }
  }
});

// ── Kötü girdi ──────────────────────────────────────────────────────────────

test('negatif/geçersiz istek güvenli sıfırlanır', () => {
  assert.equal(paymentSplit(20_000, -5_000, 80_000, ACIK).pointsUsed, 0);
  assert.equal(paymentSplit(20_000, Number.NaN, 80_000, ACIK).pointsUsed, 0);
  // Infinity "elinden geldiğince harca" diye yorumlanmaz: bozuk bir istekte
  // kullanıcının puanını harcamaktansa hiç harcamamak doğru olan.
  assert.equal(paymentSplit(20_000, Number.POSITIVE_INFINITY, 80_000, ACIK).pointsUsed, 0);
});

test('negatif bakiye puan kullandırmaz', () => {
  assert.equal(paymentSplit(20_000, 5_000, -100, ACIK).pointsUsed, 0);
});

test('geçersiz tutar sıfır ödemeye düşer', () => {
  assert.deepEqual(paymentSplit(Number.NaN, 5_000, 80_000, ACIK), {
    pointsUsed: 0,
    cashAmount: 0,
    blocked: null,
  });
  assert.equal(paymentSplit(-500, 5_000, 80_000, ACIK).cashAmount, 0);
});

test('admin tavanı %100 üstüne çıkaramaz', () => {
  const r = paymentSplit(20_000, 999_999, 500_000, ACIK, { unlockAt: 0, capPct: 500 });
  assert.equal(r.pointsUsed, 20_000, 'ödemeden fazlası puanla kapatılamaz');
  assert.equal(r.cashAmount, 0);
});

test('admin tavanı negatif olamaz', () => {
  const r = paymentSplit(20_000, 5_000, 80_000, ACIK, { unlockAt: 0, capPct: -25 });
  assert.equal(r.pointsUsed, 0);
});

test('eşik 0 ise kilit yok — kampanya senaryosu', () => {
  const r = paymentSplit(20_000, 5_000, 100, ACIK, { unlockAt: 0, capPct: 25 });
  assert.equal(r.pointsUsed, 100);
  assert.equal(spendGate(1, KILITLI, { unlockAt: 0, capPct: 25 }).allowed, true);
});
