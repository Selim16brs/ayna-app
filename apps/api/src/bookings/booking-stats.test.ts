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
    { status: 'tamamlandi', price: 9000 },
    { status: 'degerlendirme', price: 15000 },
    { status: 'no_show_musteri', price: 6000 },
    { status: 'iptal_musteri', price: 100 },
    { status: 'kesinlesti', price: 12000 },
    { status: 'onay_bekliyor', price: 8000 },
  ]);
  assert.equal(s.total, 6);
  assert.equal(s.completed, 2);
  assert.equal(s.cancelled, 1);
  assert.equal(s.noShow, 1);
  assert.equal(s.revenue, 24000, 'iptal/no-show/yaklaşan gelire katılmaz');
  assert.equal(s.upcoming, 2, 'kesinlesti + onay_bekliyor');
  // realized = 2 tamamlanan + 1 no-show = 3 → 1/3 ≈ %33
  assert.equal(s.noShowRate, 33);
});

test('§12.8 — komisyon tabanı yalnız online (userId dolu) tamamlanan; offline/userId-yok hariç', () => {
  const s = computeBookingStats([
    { status: 'tamamlandi', price: 10000, userId: 'u1' }, // online
    { status: 'tamamlandi', price: 8000, userId: null }, // offline walk-in
    { status: 'kapandi', price: 5000 }, // userId yok → offline sayılır
    { status: 'no_show_uzman', price: 6000, userId: 'u2' },
  ]);
  assert.equal(s.revenue, 23000, 'gelir = tüm tamamlananlar (online + offline)');
  assert.equal(s.commissionBase, 10000, 'komisyon tabanı = yalnız online tamamlananlar');
});
