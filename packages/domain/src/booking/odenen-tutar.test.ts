import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AZAMI_TUTAR,
  beyanEdilenTutarGecerli,
  odenenTutar,
  uzmanCariBorcu,
} from './odenen-tutar.js';

test('beyan yoksa para hesabına rezervasyon fiyatı girer', () => {
  assert.equal(odenenTutar({ price: 18000 }), 18000);
  assert.equal(odenenTutar({ price: 18000, finalPrice: null }), 18000);
});

test('beyan varsa para hesabına BEYAN girer (yükselen de düşen de)', () => {
  assert.equal(odenenTutar({ price: 18000, finalPrice: 22000 }), 22000);
  assert.equal(odenenTutar({ price: 18000, finalPrice: 9000 }), 9000);
});

test('Prisma Decimal gibi string taşıyan değerler okunur', () => {
  assert.equal(odenenTutar({ price: '18000.00', finalPrice: '22000.50' }), 22000.5);
});

test('bozuk değerde 0 döner, NaN yayılmaz', () => {
  assert.equal(odenenTutar({ price: 'abc' }), 0);
  assert.equal(odenenTutar({ price: -5 }), 0);
});

test('beyan: pozitif ve iki haneli tutar kabul edilir', () => {
  assert.equal(beyanEdilenTutarGecerli(22000), true);
  assert.equal(beyanEdilenTutarGecerli(22000.5), true);
  assert.equal(beyanEdilenTutarGecerli(0.01), true);
});

test('beyan: sıfır, negatif ve sayı olmayan reddedilir', () => {
  assert.equal(beyanEdilenTutarGecerli(0), false);
  assert.equal(beyanEdilenTutarGecerli(-1), false);
  assert.equal(beyanEdilenTutarGecerli('22000'), false);
  assert.equal(beyanEdilenTutarGecerli(Number.NaN), false);
  assert.equal(beyanEdilenTutarGecerli(undefined), false);
});

test('beyan: kuruştan ince tutar reddedilir — ₸ iki hanedir', () => {
  assert.equal(beyanEdilenTutarGecerli(10.005), false);
});

test('beyan: sütunun taşırdığı tutar reddedilir', () => {
  assert.equal(beyanEdilenTutarGecerli(AZAMI_TUTAR), true);
  assert.equal(beyanEdilenTutarGecerli(AZAMI_TUTAR + 1), false);
});

test('cari: fiyat değişmediyse borç doğmaz — komisyon zaten depozitodur', () => {
  assert.equal(uzmanCariBorcu(1800, 1800), 0);
});

test('cari: fiyat yükseldiyse fark uzmanın carisine yazılır', () => {
  // 18.000 → 22.000; komisyon %10 = 2.200, tahsil edilmiş depozito 1.800.
  assert.equal(uzmanCariBorcu(2200, 1800), 400);
});

test('cari: fiyat düştüyse borç negatife düşmez', () => {
  assert.equal(uzmanCariBorcu(900, 1800), 0);
});

test('cari: tiyn artığı biriktirmez', () => {
  assert.equal(uzmanCariBorcu(1800.126, 1800), 0.13);
});
