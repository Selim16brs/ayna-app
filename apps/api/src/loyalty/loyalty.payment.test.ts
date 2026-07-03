import assert from 'node:assert/strict';
import { test } from 'node:test';
import { maxPointsForPayment, planPointsPayment } from './loyalty.payment';

// §8.336 — azami %50
test('maxPointsForPayment: %50 tavan', () => {
  assert.equal(maxPointsForPayment(10000, 50), 5000);
  assert.equal(maxPointsForPayment(999, 50), 499); // floor
  assert.equal(maxPointsForPayment(0, 50), 0);
});

test('planPointsPayment: istenen tavan altında → tam kullanılır', () => {
  const p = planPointsPayment(10000, 3000, 50, 8000);
  assert.equal(p.pointsUsed, 3000);
  assert.equal(p.cashKzt, 7000);
  assert.equal(p.capped, false);
});

test('planPointsPayment: istenen tavanı aşıyor → tavana kırpılır (capped)', () => {
  const p = planPointsPayment(10000, 9000, 50, 20000);
  assert.equal(p.pointsUsed, 5000); // %50 tavan
  assert.equal(p.cashKzt, 5000);
  assert.equal(p.capped, true);
});

test('planPointsPayment: bakiye yetersiz → bakiyeyle sınırlı', () => {
  const p = planPointsPayment(10000, 5000, 50, 1200);
  assert.equal(p.pointsUsed, 1200);
  assert.equal(p.cashKzt, 8800);
});

test('planPointsPayment: tam bedava YOK — nakit her zaman > 0', () => {
  const p = planPointsPayment(10000, 100000, 50, 100000);
  assert.ok(p.cashKzt >= 5000, 'en az %50 nakit kalır');
});
