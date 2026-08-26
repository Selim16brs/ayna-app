import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ALMATY_OFFSET_MS,
  almatyDayStart,
  almatyParts,
  almatySlotMs,
  daysUntil,
  slotTime,
} from './datetime';

// Almatı sabit UTC+5 (DST yok) — deterministik
test('ALMATY_OFFSET_MS = +5 saat', () => {
  assert.equal(ALMATY_OFFSET_MS, 5 * 60 * 60_000);
});

test('almatyParts: UTC epoch → Almatı yerel saat', () => {
  // 2026-07-03T09:00:00Z → Almatı 14:00
  const ms = Date.UTC(2026, 6, 3, 9, 0, 0);
  const p = almatyParts(ms);
  assert.equal(p.h, 14);
  assert.equal(p.min, 0);
});

test('slotTime: HH:MM Almatı biçimi', () => {
  const ms = Date.UTC(2026, 6, 3, 9, 30, 0); // Almatı 14:30
  assert.equal(slotTime(ms), '14:30');
});

test('almatySlotMs: verilen Almatı saatini UTC ms olarak üretir (round-trip)', () => {
  const now = Date.UTC(2026, 6, 3, 0, 0, 0);
  const slot = almatySlotMs(now, 0, 14, 30); // bugün Almatı 14:30
  assert.equal(slotTime(slot), '14:30');
});

test('daysUntil: gün farkı', () => {
  const now = Date.UTC(2026, 6, 3, 6, 0, 0);
  const in3 = now + 3 * 24 * 60 * 60_000;
  assert.equal(daysUntil(in3, now), 3);
});

test('almatyDayStart: gün başı 00:00 Almatı', () => {
  const now = Date.UTC(2026, 6, 3, 9, 0, 0);
  const start = almatyDayStart(now, 0);
  assert.equal(slotTime(start), '00:00');
});
