import assert from 'node:assert/strict';
import { test } from 'node:test';
import { paymentSplit } from './payment.split';

test('puan %50 tavanla sınırlı', () => {
  // 10000 bedel, 8000 puan istendi, bakiye bol → en fazla 5000 (%50)
  assert.deepEqual(paymentSplit(10000, 8000, 20000), { pointsUsed: 5000, cashAmount: 5000 });
});

test('bakiye tavandan azsa bakiyeyle sınırlı', () => {
  assert.deepEqual(paymentSplit(10000, 8000, 3000), { pointsUsed: 3000, cashAmount: 7000 });
});

test('istenen tavanın altındaysa istenen kadar', () => {
  assert.deepEqual(paymentSplit(10000, 2000, 20000), { pointsUsed: 2000, cashAmount: 8000 });
});

test('puan istenmedi → tamamı nakit', () => {
  assert.deepEqual(paymentSplit(10000, 0, 20000), { pointsUsed: 0, cashAmount: 10000 });
});

test('negatif/aşırı istek güvenli sıfırlanır', () => {
  assert.deepEqual(paymentSplit(10000, -500, 20000), { pointsUsed: 0, cashAmount: 10000 });
});

test('tek sayı bedelde tavan aşağı yuvarlanır', () => {
  // 5001 * 0.5 = 2500.5 → floor 2500
  assert.deepEqual(paymentSplit(5001, 9999, 99999), { pointsUsed: 2500, cashAmount: 2501 });
});
