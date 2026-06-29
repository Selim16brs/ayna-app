import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  InsufficientBalanceError,
  buildSpendEntry,
  computeAvailableBalance,
  computeBalance,
} from './ledger.js';

const now = new Date('2026-06-29T00:00:00Z');

test('bakiye ledger toplamıdır', () => {
  const entries = [
    { transactionType: 'earn' as const, amount: 100 },
    { transactionType: 'spend' as const, amount: -30 },
  ];
  assert.equal(computeBalance(entries), 70);
});

test('süresi dolan puan kullanılabilir bakiyeye girmez', () => {
  const entries = [
    { transactionType: 'earn' as const, amount: 100, expiresAt: new Date('2026-01-01T00:00:00Z') },
    { transactionType: 'earn' as const, amount: 50 },
  ];
  assert.equal(computeAvailableBalance(entries, now), 50);
});

test('yetersiz bakiyede harcama reddedilir', () => {
  const entries = [{ transactionType: 'earn' as const, amount: 20 }];
  assert.throws(() => buildSpendEntry(entries, 50, now), InsufficientBalanceError);
});

test('geçerli harcama negatif kayıt üretir', () => {
  const entries = [{ transactionType: 'earn' as const, amount: 100 }];
  assert.deepEqual(buildSpendEntry(entries, 40, now), { transactionType: 'spend', amount: -40 });
});
