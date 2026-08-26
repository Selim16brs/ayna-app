import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canReschedule,
  cancelOutcome,
  FREE_CANCEL_WINDOW_MS,
  RESCHEDULABLE_STATUSES,
} from './bookings.policy';

const NOW = 1_000_000_000_000;
const start = (hoursAhead: number) => NOW + hoursAhead * 60 * 60 * 1000;

test('kapora ödenmemiş → düz iptal, yakma yok', () => {
  assert.deepEqual(cancelOutcome('deposit_pending', start(1), NOW), {
    status: 'cancelled',
    forfeit: false,
  });
  assert.deepEqual(cancelOutcome('awaiting_provider', start(10), NOW), {
    status: 'cancelled',
    forfeit: false,
  });
});

test('kapora ödenmiş + serbest iptal (>3sa) → refund_pending', () => {
  assert.deepEqual(cancelOutcome('confirmed', start(5), NOW), {
    status: 'refund_pending',
    forfeit: false,
  });
  assert.deepEqual(cancelOutcome('deposit_submitted', start(4), NOW), {
    status: 'refund_pending',
    forfeit: false,
  });
});

test('kapora ödenmiş + geç iptal (<3sa) → kapora yanar', () => {
  assert.deepEqual(cancelOutcome('confirmed', start(2), NOW), {
    status: 'cancelled',
    forfeit: true,
  });
  assert.deepEqual(cancelOutcome('confirmed', start(0), NOW), {
    status: 'cancelled',
    forfeit: true,
  });
});

test('sınır: tam 3 saat → geç sayılır (yanar)', () => {
  assert.deepEqual(cancelOutcome('confirmed', NOW + FREE_CANCEL_WINDOW_MS, NOW), {
    status: 'cancelled',
    forfeit: true,
  });
  assert.deepEqual(cancelOutcome('confirmed', NOW + FREE_CANCEL_WINDOW_MS + 1, NOW), {
    status: 'refund_pending',
    forfeit: false,
  });
});

test('startAt yok → serbest (pencere belirlenemez)', () => {
  assert.deepEqual(cancelOutcome('confirmed', null, NOW), {
    status: 'refund_pending',
    forfeit: false,
  });
});

// ── §7.8 erteleme hakkı ─────────────────────────────────────────────────────

const RES = {
  status: 'confirmed',
  startAtMs: start(24),
  nowMs: NOW,
  used: 0,
  limit: 1,
  windowMs: FREE_CANCEL_WINDOW_MS,
};

test('erteleme: hakkı olan müşteri, pencerenin dışında erteleyebilir', () => {
  assert.deepEqual(canReschedule(RES), { ok: true });
});

test('erteleme: hak bir kez — ikinci deneme reddedilir', () => {
  assert.deepEqual(canReschedule({ ...RES, used: 1 }), {
    ok: false,
    code: 'RESCHEDULE_LIMIT',
  });
});

test('erteleme: geç pencerede reddedilir — geç iptal cezası anlamsızlaşmasın', () => {
  assert.deepEqual(canReschedule({ ...RES, startAtMs: start(1) }), {
    ok: false,
    code: 'RESCHEDULE_TOO_LATE',
  });
  // Tam sınırda da reddedilir (<=)
  assert.equal(canReschedule({ ...RES, startAtMs: NOW + FREE_CANCEL_WINDOW_MS }).ok, false);
});

test('erteleme: yaşanmış/kapanmış randevu ertelenemez', () => {
  for (const st of ['completed', 'cancelled', 'no_show', 'expired', 'awaiting_provider']) {
    assert.deepEqual(canReschedule({ ...RES, status: st }), {
      ok: false,
      code: 'RESCHEDULE_NOT_ALLOWED',
    });
  }
});

test('erteleme: başlangıcı bilinmeyen randevuda hak verilmez', () => {
  assert.deepEqual(canReschedule({ ...RES, startAtMs: null }), {
    ok: false,
    code: 'RESCHEDULE_NOT_ALLOWED',
  });
});

test('erteleme: limit 0 ise özellik tamamen kapalı', () => {
  assert.deepEqual(canReschedule({ ...RES, limit: 0 }), {
    ok: false,
    code: 'RESCHEDULE_LIMIT',
  });
});

test('erteleme: slot tutan üç durumun hepsinde açık', () => {
  for (const st of RESCHEDULABLE_STATUSES) {
    assert.equal(canReschedule({ ...RES, status: st }).ok, true, st);
  }
});
