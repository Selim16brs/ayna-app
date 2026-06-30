import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeBookingStats } from './bookings.service';

test('boş liste → sıfırlar, noShowRate 0 (bölme yok)', () => {
  const s = computeBookingStats([]);
  assert.equal(s.total, 0);
  assert.equal(s.noShowRate, 0);
  assert.equal(s.revenue, 0);
});

test('§5/§6.C — gelir yalnızca tamamlanan; no-show oranı gerçekleşen üzerinden', () => {
  const s = computeBookingStats([
    { status: 'completed', price: 9000 },
    { status: 'completed', price: 15000 },
    { status: 'no_show', price: 6000 },
    { status: 'cancelled', price: 100 },
    { status: 'confirmed', price: 12000 },
    { status: 'awaiting_provider', price: 8000 },
  ]);
  assert.equal(s.total, 6);
  assert.equal(s.completed, 2);
  assert.equal(s.cancelled, 1);
  assert.equal(s.noShow, 1);
  assert.equal(s.revenue, 24000, 'iptal/no-show/yaklaşan gelire katılmaz');
  assert.equal(s.upcoming, 2, 'confirmed + awaiting_provider');
  // realized = 2 completed + 1 no_show = 3 → 1/3 ≈ %33
  assert.equal(s.noShowRate, 33);
});
