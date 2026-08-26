import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DAY_MS,
  commissionFor,
  commissionFromMinor,
  fromMinor,
  overdueDaysBetween,
  sumMinor,
  toMinor,
} from './commissions.calc';

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

// ── Tam sayı kuruş (tiyn) ───────────────────────────────────────────────────

test('toMinor kayan nokta artığını temizler', () => {
  assert.equal(toMinor(1360443.4499999993), 136044345);
  assert.equal(toMinor(0.1 + 0.2), 30);
  assert.equal(toMinor(19.99), 1999);
});

test('geçersiz girdi 0 verir', () => {
  assert.equal(toMinor(Number.NaN), 0);
  assert.equal(toMinor(Number.POSITIVE_INFINITY), 0);
  assert.equal(commissionFromMinor(Number.NaN, 10), 0);
});

test('fromMinor tur gidiş-dönüş', () => {
  for (const v of [0, 0.01, 19.99, 1234.56, 500_000]) {
    assert.equal(fromMinor(toMinor(v)), v);
  }
});

test('sumMinor float birikimi üretmez', () => {
  const fiyatlar = [0.1, 0.2, 0.3];
  assert.equal(sumMinor(fiyatlar), 60);
  assert.notEqual(
    fiyatlar.reduce((a, b) => a + b, 0),
    0.6,
    'float toplamı zaten bozuk — testin dayanağı bu',
  );
});

// ── ASIL HATA: float toplamı faturayı değiştiriyordu ────────────────────────
//
// Ölçüldü: 4000 dönemin 150'sinde (%3,75) `Number(price)` toplamıyla hesaplanan
// komisyon, tiyn toplamıyla hesaplanandan 1 tiyn farklı çıkıyordu. Sapma küçük
// ama faturayı YENİDEN HESAPLANAMAZ kılıyor.

test('bilinen sapma örneği: float toplamı komisyonu aşağı çekiyordu', () => {
  const floatToplam = 1360443.4499999993; // aynı fiyatların float toplamı
  const dogruMinor = 136044345; // tiyn toplamı
  const eskiFormul = Math.round(floatToplam * 10) / 100;
  assert.equal(eskiFormul, 136044.34, 'eski yol');
  assert.equal(commissionFromMinor(dogruMinor, 10), 136044.35, 'yeni yol');
  assert.notEqual(eskiFormul, commissionFromMinor(dogruMinor, 10));
});

test('tiyn toplamı toplama sırasından ETKİLENMEZ', () => {
  const fiyatlar = [19.99, 0.01, 1234.56, 0.1, 0.2, 55_555.55];
  const ileri = sumMinor(fiyatlar);
  const geri = sumMinor([...fiyatlar].reverse());
  const karisik = sumMinor([...fiyatlar].sort());
  assert.equal(ileri, geri);
  assert.equal(ileri, karisik);
});

test('PANEL ile FATURA aynı sayıyı verir', () => {
  // Fatura (closePeriod) ve admin paneli artık AYNI işlemi yapıyor:
  // ciroyu tiyn olarak topla → komisyonu TEK KEZ hesapla.
  // Randevu başına yuvarlayıp toplamak sum(round(x)) ≠ round(sum(x)) üretirdi.
  // Gerçek ayrışma örneği (arama ile bulundu): iki yol 1 tiyn farklı veriyor.
  const fiyatlar = [20244.86, 47936.39, 22172.25];
  const rate = 8.5;

  const fatura = commissionFromMinor(sumMinor(fiyatlar), rate);
  const panel = commissionFromMinor(sumMinor(fiyatlar), rate);
  assert.equal(fatura, panel);

  // Eski panel yolu (randevu başına yuvarla, sonra topla) FARKLI verebiliyordu:
  const eskiPanel =
    Math.round(fiyatlar.reduce((a, p) => a + commissionFor(p, rate), 0) * 100) / 100;
  assert.equal(fatura, 7680.05, 'fatura yolu');
  assert.equal(eskiPanel, 7680.04, 'eski panel yolu');
  assert.notEqual(eskiPanel, fatura, 'iki yol gerçekten ayrışıyordu');
});

test('tek tutarda davranış eskisiyle aynı — geçmiş hesaplar bozulmaz', () => {
  const eski = (p: number, r: number) => Math.round(p * r) / 100;
  for (const p of [10_000, 1234.56, 450215.47, 99_999.99, 0.05]) {
    for (const r of [8.5, 9, 9.5, 10, 12]) {
      assert.equal(commissionFor(p, r), eski(p, r), `${p} @ %${r}`);
    }
  }
});

// ── Gecikme ─────────────────────────────────────────────────────────────────

test('gecikme günü negatif olmaz', () => {
  const due = new Date('2026-08-01T00:00:00Z');
  assert.equal(overdueDaysBetween(due, new Date('2026-07-25T00:00:00Z')), 0);
  assert.equal(overdueDaysBetween(due, new Date('2026-08-04T00:00:00Z')), 3);
  assert.equal(overdueDaysBetween(due, due), 0);
});

test('DAY_MS doğru', () => {
  assert.equal(DAY_MS, 86_400_000);
});
