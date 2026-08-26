import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type DemandOffer, sortOffers } from './data';

// §5.3 — teklif sıralama (fiyat/mesafe/puan/önerilen)
const mk = (price: number, distanceKm: number, rating: number): DemandOffer =>
  ({ price, distanceKm, rating }) as DemandOffer;

const offers = [mk(20000, 5, 4.2), mk(12000, 12, 4.9), mk(15000, 2, 4.6)];

test('sortOffers price: artan fiyat', () => {
  const r = sortOffers(offers, 'price');
  assert.deepEqual(
    r.map((o) => o.price),
    [12000, 15000, 20000],
  );
});

test('sortOffers distance: artan mesafe', () => {
  const r = sortOffers(offers, 'distance');
  assert.deepEqual(
    r.map((o) => o.distanceKm),
    [2, 5, 12],
  );
});

test('sortOffers rating: azalan puan', () => {
  const r = sortOffers(offers, 'rating');
  assert.deepEqual(
    r.map((o) => o.rating),
    [4.9, 4.6, 4.2],
  );
});

test('sortOffers recommended: puan/mesafe/fiyat dengeli skor', () => {
  // score = rating*20 - distanceKm*2 - price/2000
  // 15000/2/4.6 → 92-4-7.5=80.5 ; 12000/12/4.9 → 98-24-6=68 ; 20000/5/4.2 → 84-10-10=64
  const r = sortOffers(offers, 'recommended');
  assert.equal(r[0]!.price, 15000, 'en yüksek dengeli skor öne gelir');
});

test('sortOffers: girdi dizisini mutasyona uğratmaz (kopya döner)', () => {
  const original = [...offers];
  sortOffers(offers, 'price');
  assert.deepEqual(offers, original);
});
