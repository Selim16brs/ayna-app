import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DAY_MS, commissionFor, overdueDaysBetween } from './commissions.calc';

test('komisyon: 20.000 ₸ × %10 = 2.000 ₸', () => {
  assert.equal(commissionFor(20_000, 10), 2000);
});

test('kesirli oran doğru hesaplanır', () => {
  assert.equal(commissionFor(20_000, 8.5), 1700);
  assert.equal(commissionFor(20_000, 9.5), 1900);
});

test('kuruşlu tutarda 2 haneye yuvarlar', () => {
  assert.equal(commissionFor(1234.56, 10), 123.46);
  assert.equal(commissionFor(0.05, 10), 0.01);
});

test('sıfır ve sıfır oran', () => {
  assert.equal(commissionFor(0, 10), 0);
  assert.equal(commissionFor(20_000, 0), 0);
});

// Admin paneli eskiden AYRI bir formül kullanıyordu:
//   Math.round(Math.round(price * 100) * rate) / 100  →  sonra tekrar /100
// Tam sayı oranlarda ikisi aynı sonucu veriyor, KESİRLİ oranlarda 1 tiyn
// ayrışıyordu (1.000.000 rastgele örnekte ~1.955 sapma; hepsi %8,5 gibi
// oranlarda). D4'ün kademeli oran matrisi (%8,5 / %9 / %9,5) devreye girdiği
// gün panel ile fatura birbirini tutmamaya başlayacaktı. Bu testler ayrışmanın
// gerçek olduğunu ve tek formüle geçmenin neden gerektiğini kayda geçirir.
const eskiPanelFormulu = (p: number, r: number) =>
  Math.round(Math.round(Math.round(p * 100) * r) / 100) / 100;

test('eski panel formülü KESİRLİ oranda ayrışıyordu', () => {
  const p = 450215.47;
  assert.notEqual(eskiPanelFormulu(p, 8.5), commissionFor(p, 8.5));
  assert.equal(commissionFor(p, 8.5), 38268.31);
  assert.equal(eskiPanelFormulu(p, 8.5), 38268.32);
});

test('tam sayı oranda iki formül aynıydı — bu yüzden bugüne kadar fark edilmedi', () => {
  for (const p of [10_000, 1234.56, 450215.47, 99_999.99]) {
    assert.equal(eskiPanelFormulu(p, 10), commissionFor(p, 10), `fiyat ${p}`);
  }
});

test('gecikme günü negatif olmaz', () => {
  const due = new Date('2026-08-01T00:00:00Z');
  assert.equal(overdueDaysBetween(due, new Date('2026-07-25T00:00:00Z')), 0);
  assert.equal(overdueDaysBetween(due, new Date('2026-08-04T00:00:00Z')), 3);
  assert.equal(overdueDaysBetween(due, due), 0);
});

test('DAY_MS doğru', () => {
  assert.equal(DAY_MS, 86_400_000);
});
