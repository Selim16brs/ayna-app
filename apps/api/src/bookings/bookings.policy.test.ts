import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cancelOutcome, FREE_CANCEL_WINDOW_MS } from './bookings.policy';

const NOW = 1_000_000_000_000;
const start = (hoursAhead: number) => NOW + hoursAhead * 60 * 60 * 1000;

test('kapora ödenmemiş → düz iptal, yakma yok', () => {
  assert.deepEqual(cancelOutcome('deposit_pending', start(1), NOW), { status: 'cancelled', forfeit: false });
  assert.deepEqual(cancelOutcome('awaiting_provider', start(10), NOW), { status: 'cancelled', forfeit: false });
});

test('kapora ödenmiş + serbest iptal (>3sa) → refund_pending', () => {
  assert.deepEqual(cancelOutcome('confirmed', start(5), NOW), { status: 'refund_pending', forfeit: false });
  assert.deepEqual(cancelOutcome('deposit_submitted', start(4), NOW), { status: 'refund_pending', forfeit: false });
});

test('kapora ödenmiş + geç iptal (<3sa) → kapora yanar', () => {
  assert.deepEqual(cancelOutcome('confirmed', start(2), NOW), { status: 'cancelled', forfeit: true });
  assert.deepEqual(cancelOutcome('confirmed', start(0), NOW), { status: 'cancelled', forfeit: true });
});

test('sınır: tam 3 saat → geç sayılır (yanar)', () => {
  assert.deepEqual(cancelOutcome('confirmed', NOW + FREE_CANCEL_WINDOW_MS, NOW), { status: 'cancelled', forfeit: true });
  assert.deepEqual(cancelOutcome('confirmed', NOW + FREE_CANCEL_WINDOW_MS + 1, NOW), { status: 'refund_pending', forfeit: false });
});

test('startAt yok → serbest (pencere belirlenemez)', () => {
  assert.deepEqual(cancelOutcome('confirmed', null, NOW), { status: 'refund_pending', forfeit: false });
});
