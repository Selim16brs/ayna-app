import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  HOUR,
  MIN,
  canLock,
  computeAvailableSlots,
  computeDaySlots,
  hasConflict,
  isValidInterval,
  overlaps,
} from './slots.js';

// Sabit referans an (UTC): 2026-01-01T00:00:00Z. Testler görece hesaplar.
const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);
const at = (h: number, m = 0) => T0 + h * HOUR + m * MIN;
const iv = (startH: number, endH: number) => ({ startMs: at(startH), endMs: at(endH) });

test('isValidInterval: pozitif süre gerekir', () => {
  assert.equal(isValidInterval(iv(10, 11)), true);
  assert.equal(isValidInterval(iv(11, 11)), false); // sıfır süre
  assert.equal(isValidInterval({ startMs: 10, endMs: 5 }), false); // negatif
});

test('overlaps: yarı-açık aralıklar — bitişiklik çakışma değildir', () => {
  assert.equal(overlaps(iv(10, 11), iv(11, 12)), false); // 11:00 biter, 11:00 başlar
  assert.equal(overlaps(iv(10, 12), iv(11, 13)), true); // kısmi
  assert.equal(overlaps(iv(10, 14), iv(11, 12)), true); // iç içe
  assert.equal(overlaps(iv(11, 12), iv(10, 14)), true); // simetrik
  assert.equal(overlaps(iv(10, 11), iv(12, 13)), false); // ayrık
});

test('hasConflict: herhangi bir meşgulle çakışma', () => {
  const busy = [iv(10, 11), iv(14, 15)];
  assert.equal(hasConflict(iv(11, 12), busy), false); // araya sığar
  assert.equal(hasConflict(iv(10, 30 / 60 + 10), busy), true); // 10:00-10:30 → çakışır
  assert.equal(hasConflict(iv(14, 16), busy), true);
});

test('computeAvailableSlots: tek pencere, temiz gün', () => {
  // 10:00–13:00 açık, 60dk hizmet, 60dk step, tampon yok, now = gün başı
  const slots = computeAvailableSlots({
    openWindows: [iv(10, 13)],
    busy: [],
    serviceDurationMs: 60 * MIN,
    stepMs: 60 * MIN,
    nowMs: T0,
  });
  assert.deepEqual(
    slots.map((s) => s.startMs),
    [at(10), at(11), at(12)],
  );
  // Son slot 12:00–13:00 tam sığar; 13:00 başlangıç sığmaz.
});

test('computeAvailableSlots: hizmet süresi pencereye sığmalı (kesintisiz)', () => {
  // 2,5 saatlik hizmet, 10:00–13:00 pencere → yalnız 10:00 ve 10:30 sığar (step 30)
  const slots = computeAvailableSlots({
    openWindows: [iv(10, 13)],
    busy: [],
    serviceDurationMs: 150 * MIN,
    stepMs: 30 * MIN,
    nowMs: T0,
  });
  assert.deepEqual(
    slots.map((s) => s.startMs),
    [at(10), at(10, 30)],
  );
});

test('computeAvailableSlots: mevcut randevu slotları eler', () => {
  // 10:00–14:00, 60dk hizmet/step, 11:00–12:00 dolu
  const slots = computeAvailableSlots({
    openWindows: [iv(10, 14)],
    busy: [iv(11, 12)],
    serviceDurationMs: 60 * MIN,
    stepMs: 60 * MIN,
    nowMs: T0,
  });
  // 10:00 ok, 11:00 çakışır, 12:00 ok, 13:00 ok
  assert.deepEqual(
    slots.map((s) => s.startMs),
    [at(10), at(12), at(13)],
  );
});

test('computeAvailableSlots: kısmi çakışma da eler', () => {
  // 10:00–13:00, 90dk hizmet, 30dk step, 11:00–11:30 dolu
  const slots = computeAvailableSlots({
    openWindows: [iv(10, 13)],
    busy: [{ startMs: at(11), endMs: at(11, 30) }],
    serviceDurationMs: 90 * MIN,
    stepMs: 30 * MIN,
    nowMs: T0,
  });
  // 10:00-11:30 çakışır, 10:30-12:00 çakışır, 11:00-12:30 çakışır,
  // 11:30-13:00 temiz → yalnız 11:30
  assert.deepEqual(
    slots.map((s) => s.startMs),
    [at(11, 30)],
  );
});

test('computeAvailableSlots: çok pencere (öğle arası) birleşik', () => {
  // 09:00–12:00 ve 13:00–15:00, 60dk hizmet/step
  const slots = computeAvailableSlots({
    openWindows: [iv(9, 12), iv(13, 15)],
    busy: [],
    serviceDurationMs: 60 * MIN,
    stepMs: 60 * MIN,
    nowMs: T0,
  });
  assert.deepEqual(
    slots.map((s) => s.startMs),
    [at(9), at(10), at(11), at(13), at(14)],
  );
});

test('computeAvailableSlots: geçmiş ve tampon (minLead) elenir', () => {
  // now = 10:15, 2 saat tampon → en erken 12:15; step 30dk hizasında ilk 12:30
  const slots = computeAvailableSlots({
    openWindows: [iv(10, 16)],
    busy: [],
    serviceDurationMs: 60 * MIN,
    stepMs: 30 * MIN,
    nowMs: at(10, 15),
    minLeadMs: 2 * HOUR,
  });
  assert.equal(slots[0]!.startMs, at(12, 30));
  assert.ok(slots.every((s) => s.startMs >= at(12, 15)));
});

test('computeAvailableSlots: kapalı gün (pencere yok) → boş', () => {
  const slots = computeAvailableSlots({
    openWindows: [],
    busy: [],
    serviceDurationMs: 60 * MIN,
    stepMs: 30 * MIN,
    nowMs: T0,
  });
  assert.deepEqual(slots, []);
});

test('computeAvailableSlots: hizmet penceresinden uzunsa → boş', () => {
  const slots = computeAvailableSlots({
    openWindows: [iv(10, 11)],
    busy: [],
    serviceDurationMs: 90 * MIN,
    stepMs: 30 * MIN,
    nowMs: T0,
  });
  assert.deepEqual(slots, []);
});

test('computeAvailableSlots: geçersiz süre/step → boş', () => {
  const base = { openWindows: [iv(10, 13)], busy: [], stepMs: 30 * MIN, nowMs: T0 };
  assert.deepEqual(computeAvailableSlots({ ...base, serviceDurationMs: 0 }), []);
  assert.deepEqual(computeAvailableSlots({ ...base, serviceDurationMs: 60 * MIN, stepMs: 0 }), []);
});

test('computeDaySlots: dolu ve geçmiş slotlar bayrakla döner (soluk UX)', () => {
  // 10:00–14:00, 60dk hizmet/step, 11:00–12:00 dolu, now=10:30
  const day = computeDaySlots({
    openWindows: [iv(10, 14)],
    busy: [iv(11, 12)],
    serviceDurationMs: 60 * MIN,
    stepMs: 60 * MIN,
    nowMs: at(10, 30),
  });
  assert.deepEqual(
    day.map((s) => [s.startMs, s.available]),
    [
      [at(10), false], // geçmiş (now 10:30)
      [at(11), false], // dolu
      [at(12), true],
      [at(13), true],
    ],
  );
  // müsait alt kümesi computeAvailableSlots ile tutarlı
  const avail = computeAvailableSlots({
    openWindows: [iv(10, 14)],
    busy: [iv(11, 12)],
    serviceDurationMs: 60 * MIN,
    stepMs: 60 * MIN,
    nowMs: at(10, 30),
  });
  assert.deepEqual(
    day.filter((s) => s.available).map((s) => s.startMs),
    avail.map((s) => s.startMs),
  );
});

test('canLock: temiz slot kilitlenebilir', () => {
  const res = canLock(iv(11, 12), {
    openWindows: [iv(10, 18)],
    busy: [iv(14, 15)],
    nowMs: T0,
  });
  assert.deepEqual(res, { ok: true });
});

test('canLock: çakışan slot reddedilir (CONFLICT)', () => {
  const res = canLock(iv(14, 15), {
    openWindows: [iv(10, 18)],
    busy: [{ startMs: at(14, 30), endMs: at(15, 30) }],
    nowMs: T0,
  });
  assert.deepEqual(res, { ok: false, reason: 'CONFLICT' });
});

test('canLock: çalışma saati dışı reddedilir', () => {
  const res = canLock(iv(19, 20), { openWindows: [iv(10, 18)], busy: [], nowMs: T0 });
  assert.deepEqual(res, { ok: false, reason: 'OUT_OF_HOURS' });
});

test('canLock: geçmiş/tampon içi reddedilir (PAST)', () => {
  const res = canLock(iv(10, 11), {
    openWindows: [iv(9, 18)],
    busy: [],
    nowMs: at(9, 30),
    minLeadMs: 2 * HOUR,
  });
  assert.deepEqual(res, { ok: false, reason: 'PAST' });
});

test('canLock: geçersiz aralık reddedilir (INVALID)', () => {
  const res = canLock({ startMs: at(12), endMs: at(11) }, {
    openWindows: [iv(10, 18)],
    busy: [],
    nowMs: T0,
  });
  assert.deepEqual(res, { ok: false, reason: 'INVALID' });
});

test('canLock: bitişik randevu çakışmaz (yarı-açık)', () => {
  // 14:00–15:00 dolu; 15:00–16:00 kilitlenebilmeli
  const res = canLock(iv(15, 16), {
    openWindows: [iv(10, 18)],
    busy: [iv(14, 15)],
    nowMs: T0,
  });
  assert.deepEqual(res, { ok: true });
});

test('çift rezervasyon senaryosu: aynı slota ikinci kilit CONFLICT', () => {
  const openWindows = [iv(10, 18)];
  const nowMs = T0;
  const slot = iv(12, 13);
  // İlk kilit başarılı → busy'e eklenir (sunucu transaction taklidi)
  const busy: { startMs: number; endMs: number }[] = [];
  const first = canLock(slot, { openWindows, busy, nowMs });
  assert.deepEqual(first, { ok: true });
  busy.push(slot);
  // Aynı slota ikinci talep artık reddedilir
  const second = canLock(slot, { openWindows, busy, nowMs });
  assert.deepEqual(second, { ok: false, reason: 'CONFLICT' });
});
