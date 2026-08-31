import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_DEPOSIT_RULES, depositFor, depositRulesFrom } from './deposit.js';

test('K1 kararının çalışan örneği: 20.000 ₸ hizmette kapora 2.000 ₸', () => {
  assert.equal(depositFor(20_000), 2000);
});

test('alt sınır: küçük hizmette depozito 1.000 ₸ altına inmez', () => {
  assert.equal(depositFor(5000), 1000); // ham %10 = 500 → alt sınır
  assert.equal(depositFor(10_000), 1000); // tam sınırda: ham 1000
});

test('K2 · depozito fiyatın tamamı OLAMAZ — kalan hep vardır', () => {
  // Kurucunun bildirdiği hata: "depozito diye alınan şey esasında ücretin
  // tamamı oluyor". Sebep alt sınırın (1.000 ₸) fiyatı aşabilmesiydi.
  assert.equal(depositFor(1000), 500); // eskiden 1000 → kalan 0
  assert.equal(depositFor(800), 400); // eskiden 1000 → kalan −200 (!)
  assert.equal(depositFor(500), 200); // eskiden 1000 → fiyatın iki katı
  // Değişmez kural: her fiyatta ödenecek bir kalan bulunur.
  for (const p of [200, 500, 800, 1000, 1500, 2000, 9999, 10_000, 50_000]) {
    assert.ok(depositFor(p) < p, `${p} ₸ hizmette depozito kalan bırakmıyor`);
  }
});

test('K2 · tavan adımdan küçükse depozito sıfıra düşmez', () => {
  // 100 ₸ adıma yuvarlamak bu aralıkta 0 üretirdi — ucuz hizmet depozitosuz
  // doğardı. Tavanın kendisi kullanılıyor.
  assert.equal(depositFor(150), 75);
  assert.ok(depositFor(150) > 0);
});

test('üst sınır: pahalı hizmette kapora 5.000 ₸ üstüne çıkmaz', () => {
  assert.equal(depositFor(50_000), 5000); // tam sınırda: ham 5000
  assert.equal(depositFor(80_000), 5000);
  assert.equal(depositFor(1_000_000), 5000);
});

test('bandın içi 100 ₸ adımına yuvarlanır', () => {
  assert.equal(depositFor(15_555.55), 1600); // ham 1555,555
  assert.equal(depositFor(23_400), 2300); // ham 2340 → aşağı
  assert.equal(depositFor(23_500), 2400); // ham 2350 → yarım yukarı
  assert.equal(depositFor(31_270), 3100); // ham 3127
});

test('bandın uçları', () => {
  assert.equal(depositFor(10_001), 1000);
  assert.equal(depositFor(49_999), 5000); // ham 4999,9 → 5000
  assert.equal(depositFor(49_400), 4900);
});

test('sonuç her zaman tam sayı; 100 ₸ katı (tavan bağlamadıkça)', () => {
  for (const p of [1234.56, 20_000.01, 33_333.33, 7.7, 47_777]) {
    const d = depositFor(p);
    assert.equal(Number.isInteger(d), true, `${p} → ${d} tam sayı değil`);
    // K2 istisnası: tavan bir adımın (100 ₸) altına düşerse adım yuvarlaması
    // 0 üretirdi. O aralıkta tavanın kendisi kullanılır, yani katlık bozulur.
    if (d >= 100) assert.equal(d % 100, 0, `${p} → ${d} 100'ün katı değil`);
  }
});

test('geçersiz fiyat alt sınıra düşer — kaporasız randevu doğmaz', () => {
  assert.equal(depositFor(0), 1000);
  assert.equal(depositFor(-5000), 1000);
  assert.equal(depositFor(Number.NaN), 1000);
  assert.equal(depositFor(Number.POSITIVE_INFINITY), 1000);
});

test('sınırlar adımın katı olmasa bile tam korunur', () => {
  const rules = { pct: 10, minKzt: 1250, maxKzt: 4750, stepKzt: 100 };
  assert.equal(depositFor(5000, rules), 1250); // ham 500 → alt sınır aynen
  assert.equal(depositFor(90_000, rules), 4750); // ham 9000 → üst sınır aynen
  assert.equal(depositFor(20_000, rules), 2000); // band içi: adıma yuvarlanır
});

test('admin oranı uygulanır', () => {
  const rules = { pct: 20, minKzt: 1000, maxKzt: 20_000, stepKzt: 100 };
  assert.equal(depositFor(20_000, rules), 4000);
  assert.equal(depositFor(500_000, rules), 20_000);
});

test('ters ayarlanmış sınırlarda alt sınır kazanır — clamp ters çalışmaz', () => {
  const bozuk = { pct: 10, minKzt: 5000, maxKzt: 1000, stepKzt: 100 };
  assert.equal(depositFor(20_000, bozuk), 5000);
  assert.equal(depositFor(1_000_000, bozuk), 5000);
});

test('geçersiz oran alt sınıra düşer', () => {
  const r = (pct: number) => ({ pct, minKzt: 1000, maxKzt: 5000, stepKzt: 100 });
  assert.equal(depositFor(20_000, r(0)), 1000);
  assert.equal(depositFor(20_000, r(-10)), 1000);
  assert.equal(depositFor(20_000, r(Number.NaN)), 1000);
});

test('varsayılan kurallar K1 + K2 kararlarıyla aynı', () => {
  assert.deepEqual(DEFAULT_DEPOSIT_RULES, {
    pct: 10,
    minKzt: 1000,
    maxKzt: 5000,
    stepKzt: 100,
    maxSharePct: 50,
  });
});

// ── depositRulesFrom ────────────────────────────────────────────────────────

test('boş ayar listesi varsayılanları verir', () => {
  assert.deepEqual(depositRulesFrom([]), DEFAULT_DEPOSIT_RULES);
});

test('admin ayarları varsayılanın yerine geçer', () => {
  const rules = depositRulesFrom([
    { key: 'rate.deposit_pct', intValue: 15 },
    { key: 'rate.deposit_min', intValue: 2000 },
    { key: 'rate.deposit_max', intValue: 8000 },
  ]);
  assert.deepEqual(rules, {
    pct: 15,
    minKzt: 2000,
    maxKzt: 8000,
    stepKzt: 100,
    maxSharePct: 50,
  });
  assert.equal(depositFor(20_000, rules), 3000);
});

test('eski rate.deposit_kzt yalnız alt sınır yedeği olarak okunur', () => {
  const rules = depositRulesFrom([{ key: 'rate.deposit_kzt', intValue: 1500 }]);
  assert.equal(rules.minKzt, 1500);
  assert.equal(rules.pct, 10, 'eski anahtar oranı etkilememeli');
  assert.equal(rules.maxKzt, 5000, 'eski anahtar üst sınırı etkilememeli');
});

test('yeni alt sınır anahtarı eski anahtarı ezer', () => {
  const rules = depositRulesFrom([
    { key: 'rate.deposit_kzt', intValue: 1500 },
    { key: 'rate.deposit_min', intValue: 900 },
  ]);
  assert.equal(rules.minKzt, 900);
});

test('null intValue varsayılana düşer — silinmiş ayar hesabı bozmaz', () => {
  const rules = depositRulesFrom([
    { key: 'rate.deposit_pct', intValue: null },
    { key: 'rate.deposit_min', intValue: null },
  ]);
  assert.deepEqual(rules, DEFAULT_DEPOSIT_RULES);
});
