import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DAY_MS, commissionFor, overdueDaysBetween } from './commissions.calc';
import { closePeriodSchema, receiptSchema } from './commissions.dto';

// §12.8 — komisyon para matematiği (2 hane, kuruş yuvarlaması)
test('commissionFor: %10 → ciro/10', () => {
  assert.equal(commissionFor(30000, 10), 3000);
  assert.equal(commissionFor(18000, 10), 1800);
  assert.equal(commissionFor(6000, 10), 600);
});

test('commissionFor: %15 ve ondalık yuvarlama', () => {
  assert.equal(commissionFor(30000, 15), 4500);
  assert.equal(commissionFor(333, 15), 49.95);
});

test('commissionFor: sıfır ciro → 0', () => {
  assert.equal(commissionFor(0, 10), 0);
});

// §12.8 — gecikme gün sayacı
test('overdueDaysBetween: vade gelecekte → 0', () => {
  const due = new Date('2026-08-10T00:00:00Z');
  const now = new Date('2026-08-01T00:00:00Z');
  assert.equal(overdueDaysBetween(due, now), 0);
});

test('overdueDaysBetween: 10 gün geçmiş → 10', () => {
  const due = new Date('2026-08-01T00:00:00Z');
  const now = new Date(due.getTime() + 10 * DAY_MS);
  assert.equal(overdueDaysBetween(due, now), 10);
});

test('overdueDaysBetween: aynı gün → 0 (negatife düşmez)', () => {
  const d = new Date('2026-08-01T12:00:00Z');
  assert.equal(overdueDaysBetween(d, d), 0);
});

// §12.8 — DTO doğrulama
test('closePeriodSchema: geçerli dönem kabul', () => {
  const r = closePeriodSchema.safeParse({ periodStart: '2026-07-01', periodEnd: '2026-08-01' });
  assert.equal(r.success, true);
});

test('closePeriodSchema: opsiyonel dueDate kabul', () => {
  const r = closePeriodSchema.safeParse({
    periodStart: '2026-07-01',
    periodEnd: '2026-08-01',
    dueDate: '2026-08-08',
  });
  assert.equal(r.success, true);
});

test('closePeriodSchema: periodEnd eksik reddedilir', () => {
  assert.equal(closePeriodSchema.safeParse({ periodStart: '2026-07-01' }).success, false);
});

test('receiptSchema: boş dekont reddedilir', () => {
  assert.equal(receiptSchema.safeParse({ receiptUri: '' }).success, false);
  assert.equal(receiptSchema.safeParse({ receiptUri: 'file://d.jpg' }).success, true);
});
