import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type DemandOffer, sortOffers } from './data';

/*
 * §5.3 — teklif sıralama (fiyat/mesafe/puan/önerilen).
 *
 * `distanceKm` alanı KALKTI: sunucu o sayıyı teklifin kimlik dizesinden
 * üretiyordu. Yerine GERÇEK koordinattan hesaplanan `mesafeKm` var ve
 * bilinmiyorsa `null`.
 */
const mk = (price: number, mesafeKm: number | null, rating: number): DemandOffer =>
  ({ price, mesafeKm, rating }) as DemandOffer;

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
    r.map((o) => o.mesafeKm),
    [2, 5, 12],
  );
});

test('MESAFESİ BİLİNMEYEN teklif "yakın" sayılmıyor', () => {
  /*
   * Koordinatı olmayan uzmanın mesafesi bilinmiyor. Yakınlığa göre
   * sıralarken onu başa koymak "en yakın" demek olurdu; sona gidiyor.
   */
  const karisik = [mk(10000, null, 4.5), ...offers];
  const r = sortOffers(karisik, 'distance');
  assert.equal(r[r.length - 1]!.mesafeKm, null, 'bilinmeyen mesafe başa geçti');
  assert.equal(r[0]!.mesafeKm, 2);
});

test('BİLİNMEYEN MESAFE "önerilen" skorunu ne düşürüyor ne yükseltiyor', () => {
  /*
   * Bilinmeyeni "0 km" saymak onu en yakın gibi gösterir, "9 km" saymak
   * haksız yere cezalandırırdı. Skora hiç katılmıyor.
   */
  const bilinmeyen = mk(15000, null, 4.6);
  const sifir = mk(15000, 0, 4.6);
  const r = sortOffers([bilinmeyen, sifir], 'recommended');
  // İkisi de aynı skoru alıyor → sıra girdi sırasını koruyor.
  assert.equal(r[0]!.mesafeKm, null);
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
