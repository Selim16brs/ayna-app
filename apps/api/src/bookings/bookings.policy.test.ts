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
  assert.deepEqual(cancelOutcome('depozito_bekliyor', start(1), NOW), {
    status: 'iptal_musteri',
    forfeit: false,
  });
  assert.deepEqual(cancelOutcome('onay_bekliyor', start(10), NOW), {
    status: 'iptal_musteri',
    forfeit: false,
  });
});

test('kapora ödenmiş + serbest iptal (>3sa) → iade hakkı doğar (yanmaz)', () => {
  assert.deepEqual(cancelOutcome('kesinlesti', start(5), NOW), {
    status: 'iptal_musteri',
    forfeit: false,
  });
  assert.deepEqual(cancelOutcome('kesinlesti', start(4), NOW), {
    status: 'iptal_musteri',
    forfeit: false,
  });
});

test('kapora ödenmiş + geç iptal (<3sa) → kapora yanar', () => {
  assert.deepEqual(cancelOutcome('kesinlesti', start(2), NOW), {
    status: 'iptal_musteri',
    forfeit: true,
  });
  assert.deepEqual(cancelOutcome('kesinlesti', start(0), NOW), {
    status: 'iptal_musteri',
    forfeit: true,
  });
});

test('sınır: TAM 3 saat geç SAYILMAZ (brief §4.7 "3 saatten az kala")', () => {
  // Eski davranış tam 3 saati "geç" sayıyordu. Brief "3 saatten AZ kala" diyor;
  // tam 3 saat azdan değildir, dolayısıyla depozito yanmaz. Sınırı bir tarafa
  // yıkmak gerekiyordu — kullanıcı lehine olan taraf seçildi.
  const start = Date.parse('2026-08-31T15:00:00Z');
  const now = start - 3 * 60 * 60 * 1000;
  assert.deepEqual(cancelOutcome('kesinlesti', start, now), {
    status: 'iptal_musteri',
    forfeit: false,
  });
  // Bir saniye sonrası artık "az kala" → yanar.
  assert.equal(cancelOutcome('kesinlesti', start, now + 1000).forfeit, true);
});

test('startAt yok → serbest (pencere belirlenemez)', () => {
  assert.deepEqual(cancelOutcome('kesinlesti', null, NOW), {
    status: 'iptal_musteri',
    forfeit: false,
  });
});

// ── §7.8 erteleme hakkı ─────────────────────────────────────────────────────

const RES = {
  status: 'kesinlesti',
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
  for (const st of [
    'tamamlandi',
    'iptal_musteri',
    'no_show_musteri',
    'otomatik_dustu',
    'onay_bekliyor',
  ]) {
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
