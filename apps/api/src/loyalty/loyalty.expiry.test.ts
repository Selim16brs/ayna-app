import assert from 'node:assert/strict';
import { test } from 'node:test';
import { POINTS_EXPIRY_MONTHS, expiringSoon, expiryDateFrom } from './loyalty.expiry';

// §8 — kazanılan puan 12 ay sonra sona erer
test('expiryDateFrom: +12 ay', () => {
  assert.equal(POINTS_EXPIRY_MONTHS, 12);
  const from = new Date('2026-07-03T00:00:00Z');
  const exp = expiryDateFrom(from);
  assert.equal(exp.getFullYear(), 2027);
  assert.equal(exp.getMonth(), 6); // Temmuz (0 tabanlı)
});

// §8 — 30 gün içinde sona erecek puan uyarısı
test('expiringSoon: 30 gün içinde sona eren earn puanı sayar', () => {
  const now = new Date('2026-07-03T00:00:00Z');
  const in10days = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
  const in90days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const r = expiringSoon(
    [
      { kind: 'earn', points: 300, expiresAt: in10days },
      { kind: 'earn', points: 500, expiresAt: in90days }, // pencere dışı
      { kind: 'spend', points: -100, expiresAt: null },
    ],
    now,
  );
  assert.equal(r.points, 300);
  assert.equal(r.nextExpiry?.getTime(), in10days.getTime());
});

test('expiringSoon: pencerede earn yoksa 0 + null', () => {
  const now = new Date('2026-07-03T00:00:00Z');
  const r = expiringSoon([{ kind: 'earn', points: 100, expiresAt: null }], now);
  assert.equal(r.points, 0);
  assert.equal(r.nextExpiry, null);
});

test('expiringSoon: zaten süresi geçmiş puan uyarıya girmez', () => {
  const now = new Date('2026-07-03T00:00:00Z');
  const past = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const r = expiringSoon([{ kind: 'earn', points: 200, expiresAt: past }], now);
  assert.equal(r.points, 0);
});
