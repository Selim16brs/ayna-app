import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkOffer, hasExternalContact, slotAllowed } from './offers.rules';

const base = {
  discountType: 'percent' as const,
  discountValue: 20,
  basePrice: 10000,
  startsAtMs: Date.UTC(2026, 6, 15),
  endsAtMs: Date.UTC(2026, 6, 30),
  texts: ['Salı sakin saat indirimi', 'Öğlen saatlerinde %20'],
  avgRecentPrice: null,
};

test('geçerli yüzde kampanyası → finalPrice hesaplanır', () => {
  const r = checkOffer(base);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.finalPrice, 8000);
});

test('indirim aralığı %5-50 dışı reddedilir', () => {
  assert.equal(checkOffer({ ...base, discountValue: 4 }).ok, false);
  assert.equal(checkOffer({ ...base, discountValue: 51 }).ok, false);
  assert.equal(checkOffer({ ...base, discountValue: 50 }).ok, true);
});

test('30 günden uzun kampanya reddedilir', () => {
  const r = checkOffer({ ...base, endsAtMs: base.startsAtMs + 31 * 24 * 3600 * 1000 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, 'TOO_LONG');
});

test('sahte indirim: basePrice ortalamanın %120 üstünde → reddedilir', () => {
  const r = checkOffer({ ...base, avgRecentPrice: 8000 }); // cap 9600 < 10000
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, 'BASE_PRICE_INFLATED');
  assert.equal(checkOffer({ ...base, avgRecentPrice: 9000 }).ok, true); // cap 10800
});

test('fixed_price normal fiyatın altında olmalı', () => {
  const r = checkOffer({ ...base, discountType: 'fixed_price', discountValue: 12000 });
  assert.equal(r.ok, false);
  const ok = checkOffer({ ...base, discountType: 'fixed_price', discountValue: 7500 });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.finalPrice, 7500);
});

test('dış yönlendirme metni engellenir (İlke #1)', () => {
  assert.equal(hasExternalContact('Ara beni +7 707 123 45 67'), true);
  assert.equal(hasExternalContact('instagram: @guzellik_x'), true);
  assert.equal(hasExternalContact('detay www.salon.kz adresinde'), true);
  assert.equal(hasExternalContact('Salı günleri %20 indirim'), false);
  const r = checkOffer({ ...base, texts: ['Rezervasyon: wa.me/77071234567 https://x.com'] });
  assert.equal(r.ok, false);
});

test('slotAllowed: gün + saat penceresi (Almatı UTC+5)', () => {
  const offer = { validDays: [2], timeFrom: '14:00', timeTo: '17:00' }; // yalnız Salı 14-17
  // 2026-07-14 Salı 15:00 Almatı = 10:00 UTC
  assert.equal(slotAllowed(offer, Date.UTC(2026, 6, 14, 10, 0)), true);
  // Salı 17:00 (sınır, dahil değil)
  assert.equal(slotAllowed(offer, Date.UTC(2026, 6, 14, 12, 0)), false);
  // Çarşamba 15:00
  assert.equal(slotAllowed(offer, Date.UTC(2026, 6, 15, 10, 0)), false);
  // kısıtsız kampanya her slota açık
  assert.equal(
    slotAllowed({ validDays: [], timeFrom: '', timeTo: '' }, Date.UTC(2026, 6, 14, 3)),
    true,
  );
});
