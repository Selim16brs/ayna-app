import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SPEND_RULES, paymentSplit, spendGate, shouldUnlock } from './spend-rules.js';

const KILITLI = null;
const ACIK = new Date('2026-01-01T00:00:00Z');

test('K4 varsayılanları: 5.000 eşik, %25 fiyat tavanı, %50 sübvansiyon tavanı', () => {
  // Eşik 50.000'den 5.000'e indirildi: 90 günlük yanma kuralıyla birlikte
  // 50.000 matematiksel olarak ulaşılamıyordu (3 ayda ~111 randevu).
  assert.deepEqual(DEFAULT_SPEND_RULES, {
    unlockAt: 5_000,
    capPct: 25,
    commissionPct: 10,
    subsidyCapPct: 50,
  });
});

// ── §8.4 sübvansiyon tavanı ─────────────────────────────────────────────────

test('§8.4: indirim net komisyonun yarısını aşamaz', () => {
  // 20.000 ₸ · komisyon %10 = 2.000 ₸ · tavan 1.000 ₸ (K4.3 tek başına 5.000 derdi)
  const r = paymentSplit(20_000, 99_999, 500_000, ACIK);
  assert.equal(r.pointsUsed, 1_000);
  assert.equal(r.maxAllowed, 1_000);
  assert.equal(r.limitedBy, 'SUBSIDY_CAP');
});

test('§8.4 olmadan AYNA her randevuda zarar ederdi', () => {
  // K4.3 tek başına: 20.000 × %25 = 5.000 ₸ indirim.
  // O randevunun komisyonu ise 20.000 × %10 = 2.000 ₸.
  // Yani indirim komisyondan 3.000 ₸ büyük — fark birinin cebinden çıkardı.
  const fiyat = 20_000;
  const fiyatTavaniTekBasina = (fiyat * 25) / 100;
  const komisyon = (fiyat * 10) / 100;
  assert.ok(fiyatTavaniTekBasina > komisyon, 'sorunun kendisi');
  assert.equal(fiyatTavaniTekBasina - komisyon, 3_000);

  // Sınır eklendikten sonra indirim komisyonun yarısında kalıyor.
  const r = paymentSplit(fiyat, 99_999, 500_000, ACIK);
  assert.equal(r.pointsUsed, komisyon / 2);
  assert.ok(r.pointsUsed < komisyon, 'indirim komisyonu aşmamalı');
});

test('yüksek komisyonda fiyat tavanı bağlayıcı olur', () => {
  // Komisyon %60 → sübvansiyon tavanı %30, fiyat tavanı %25 → küçük olan kazanır.
  const r = paymentSplit(20_000, 99_999, 500_000, ACIK, {
    unlockAt: 5_000,
    capPct: 25,
    commissionPct: 60,
    subsidyCapPct: 50,
  });
  assert.equal(r.pointsUsed, 5_000);
  assert.equal(r.limitedBy, 'PRICE_CAP');
});

test('indirim hiçbir zaman komisyonu aşmaz', () => {
  for (const fiyat of [1_000, 10_000, 20_000, 75_500, 250_000]) {
    for (const kom of [8.5, 9, 10, 12]) {
      const kural = { unlockAt: 0, capPct: 25, commissionPct: kom, subsidyCapPct: 50 };
      const r = paymentSplit(fiyat, 999_999, 999_999, ACIK, kural);
      const komisyon = (fiyat * kom) / 100;
      assert.ok(
        r.pointsUsed <= komisyon,
        `fiyat ${fiyat} kom %${kom}: indirim ${r.pointsUsed} > komisyon ${komisyon}`,
      );
    }
  }
});

test('komisyon 0 ise puan hiç kullanılamaz — bedava indirim yok', () => {
  const r = paymentSplit(20_000, 5_000, 80_000, ACIK, {
    unlockAt: 0,
    capPct: 25,
    commissionPct: 0,
    subsidyCapPct: 50,
  });
  assert.equal(r.pointsUsed, 0);
  assert.equal(r.maxAllowed, 0);
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
  assert.equal(r.pointsUsed, 0);
  assert.equal(r.cashAmount, 20_000);
  assert.equal(r.blocked, 'LOCKED');
});

// ── K4.3 tavan ──────────────────────────────────────────────────────────────

test('varsayılan kurallarda 20.000 ₸ ödemede en çok 1.000 puan', () => {
  const r = paymentSplit(20_000, 99_999, 80_000, ACIK);
  assert.equal(r.pointsUsed, 1_000);
  assert.equal(r.cashAmount, 19_000);
});

test('eski %50 tavanı artık geçerli değil', () => {
  assert.equal(paymentSplit(10_000, 10_000, 80_000, ACIK).pointsUsed, 500);
});

test('istenen tavanın altındaysa istenen kadar', () => {
  const r = paymentSplit(20_000, 600, 80_000, ACIK);
  assert.equal(r.pointsUsed, 600);
  assert.equal(r.cashAmount, 19_400);
});

test('bakiye tavandan azsa bakiye sınırlar', () => {
  const r = paymentSplit(20_000, 5_000, 400, ACIK);
  assert.equal(r.pointsUsed, 400);
  assert.equal(r.cashAmount, 19_600);
});

test('puan istenmediyse tamamı nakit', () => {
  assert.equal(paymentSplit(20_000, 0, 80_000, ACIK).pointsUsed, 0);
});

test('tavan aşağı yuvarlanır — kuruş oluşmaz', () => {
  // 999 ₸ · komisyon %10 = 99,9 · sübvansiyon tavanı %50 = 49,95 → 49
  assert.equal(paymentSplit(999, 999, 80_000, ACIK).pointsUsed, 49);
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
  const r = paymentSplit(Number.NaN, 5_000, 80_000, ACIK);
  assert.equal(r.pointsUsed, 0);
  assert.equal(r.cashAmount, 0);
  assert.equal(paymentSplit(-500, 5_000, 80_000, ACIK).cashAmount, 0);
});

test('admin tavanı %100 üstüne çıkaramaz', () => {
  const r = paymentSplit(20_000, 999_999, 500_000, ACIK, {
    unlockAt: 0,
    capPct: 500,
    commissionPct: 100,
    subsidyCapPct: 500,
  });
  assert.equal(r.pointsUsed, 20_000, 'ödemeden fazlası puanla kapatılamaz');
  assert.equal(r.cashAmount, 0);
});

test('admin tavanı negatif olamaz', () => {
  const r = paymentSplit(20_000, 5_000, 80_000, ACIK, {
    unlockAt: 0,
    capPct: -25,
    commissionPct: 10,
    subsidyCapPct: 50,
  });
  assert.equal(r.pointsUsed, 0);
});

test('eşik 0 ise kilit yok — kampanya senaryosu', () => {
  const kural = { unlockAt: 0, capPct: 25, commissionPct: 10, subsidyCapPct: 50 };
  const r = paymentSplit(20_000, 5_000, 100, ACIK, kural);
  assert.equal(r.pointsUsed, 100);
  assert.equal(spendGate(1, KILITLI, kural).allowed, true);
});
