import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SPEND_RULES, paymentSplit, spendGate, shouldUnlock } from './spend-rules.js';

/**
 * §5 PUAN KULLANIMI — brief tablosu tek kaynak.
 *
 * | Kullanım yeri   | Yalnızca depozito ödemesi              |
 * | Kullanım eşiği  | Minimum 5.000 puan bakiyesi            |
 * | Kullanım sınırı | İşlem başına biriken puanın en çok %25 |
 *
 * ESKİ "§8.4 sübvansiyon tavanı" (indirim, net komisyonun en çok %50'si)
 * KALDIRILDI: brief'te böyle bir kural yok ve kurucu "para akışıyla ilgili
 * birden fazla kural olamaz" dedi. Sonucu bilerek kabul ediyoruz — yüksek
 * bakiyeli bir müşteri, bir randevunun depozitosunun TAMAMINI puanla
 * kapatabilir; AYNA o randevudan komisyon almaz. Puan kazanımı %1 olduğu için
 * bunu biriktirmek ~10 tamamlanmış randevu gerektirir.
 */

const KILITLI = null;
const ACIK = new Date('2026-01-01T00:00:00Z');

test("§5 varsayılanları: 5.000 eşik, biriken puanın %25'i", () => {
  assert.deepEqual(DEFAULT_SPEND_RULES, { unlockAt: 5_000, capPct: 25 });
});

// ── Eşik (§5: "bakiyesi ≥ 5.000 ise") ───────────────────────────────────────

test('eşiğin altında puan harcanamaz', () => {
  const g = spendGate(4_000, KILITLI);
  assert.equal(g.allowed, false);
  assert.equal(g.allowed === false && g.remaining, 1_000);
});

test('TAM EŞİKTE açılır — MD "≥ 5.000" diyor', () => {
  // Kod bir süre `>` kullanıyordu: tam 5.000 puanı olan kullanıcı, MD ona hak
  // tanıdığı hâlde harcayamıyordu.
  assert.equal(spendGate(5_000, KILITLI).allowed, true);
  assert.equal(spendGate(4_999, KILITLI).allowed, false);
  assert.equal(shouldUnlock(5_000, KILITLI), true);
  assert.equal(shouldUnlock(4_999, KILITLI), false);
});

test('kilit bir kez açıldıysa bakiye düşse de kapanmaz (V1)', () => {
  assert.equal(spendGate(100, ACIK).allowed, true);
  assert.equal(spendGate(0, ACIK).allowed, true);
});

test('shouldUnlock zaten açık damgada tekrar true dönmez', () => {
  assert.equal(shouldUnlock(90_000, ACIK), false);
});

test('kilitliyken ödeme tamamen nakit ve sebebi bildirilir', () => {
  const r = paymentSplit(20_000, 5_000, 4_000, KILITLI);
  assert.equal(r.pointsUsed, 0);
  assert.equal(r.cashAmount, 20_000);
  assert.equal(r.blocked, 'LOCKED');
});

// ── Tavan: BİRİKEN PUANIN %25'i (tutarın değil) ─────────────────────────────

test("tavan BAKİYENİN %25'i — tutarın değil", () => {
  // 80.000 bakiye → 20.000 tavan. Tutarın %25\'i olsaydı 500 çıkardı.
  const r = paymentSplit(2_000, 99_999, 80_000, ACIK);
  assert.equal(r.pointsUsed, 2_000, 'depozitonun tamamı kapanabilmeli');
  assert.equal(r.cashAmount, 0);
});

test('tavan tutarı AŞAMAZ — depozitodan fazlası anlamsız', () => {
  const r = paymentSplit(1_000, 99_999, 80_000, ACIK);
  assert.equal(r.pointsUsed, 1_000);
  assert.equal(r.limitedBy, 'PRICE_CAP');
});

test('bakiye küçükse %25 bağlayıcı olur', () => {
  // 6.000 bakiye → tavan 1.500; 4.000 \u20b8 depozitonun yalnız 1.500\'ü kapanır.
  const r = paymentSplit(4_000, 4_000, 6_000, ACIK);
  assert.equal(r.pointsUsed, 1_500);
  assert.equal(r.cashAmount, 2_500);
  assert.equal(r.limitedBy, 'BALANCE_CAP');
});

test('istenen tavanın altındaysa istenen kadar', () => {
  const r = paymentSplit(20_000, 600, 80_000, ACIK);
  assert.equal(r.pointsUsed, 600);
  assert.equal(r.cashAmount, 19_400);
});

test('puan istenmediyse tamamı nakit', () => {
  assert.equal(paymentSplit(20_000, 0, 80_000, ACIK).pointsUsed, 0);
});

test('tavan aşağı yuvarlanır — kuruş oluşmaz', () => {
  // 5.001 bakiye · %25 = 1.250,25 → 1.250
  assert.equal(paymentSplit(9_000, 9_000, 5_001, ACIK).pointsUsed, 1_250);
});

test('nakit + puan her zaman tutarı verir', () => {
  for (const [tutar, istek, bakiye] of [
    [20_000, 5_000, 80_000],
    [999, 999, 5_500],
    [1, 1, 100_000],
    [0, 500, 80_000],
  ] as const) {
    const r = paymentSplit(tutar, istek, bakiye, ACIK);
    assert.equal(r.pointsUsed + r.cashAmount, tutar, `${tutar}/${istek}/${bakiye}`);
  }
});

test('negatif/geçersiz istek güvenli sıfırlanır', () => {
  assert.equal(paymentSplit(20_000, -5, 80_000, ACIK).pointsUsed, 0);
  assert.equal(paymentSplit(20_000, Number.NaN, 80_000, ACIK).pointsUsed, 0);
  assert.equal(paymentSplit(Number.NaN, 500, 80_000, ACIK).cashAmount, 0);
});

test('negatif bakiye puan kullandırmaz', () => {
  assert.equal(paymentSplit(20_000, 500, -100, ACIK).pointsUsed, 0);
});
