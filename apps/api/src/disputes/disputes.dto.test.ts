import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileDisputeSchema, resolveDisputeSchema } from './disputes.dto';

// §12.4 — itiraz açma
test('fileDisputeSchema: geçerli depozito itirazı kabul', () => {
  const r = fileDisputeSchema.safeParse({
    bookingRef: 'bk-1',
    proName: 'Lotus Spa',
    kind: 'deposit',
    amount: 1000,
    receiptUri: 'file://d.jpg',
  });
  assert.equal(r.success, true);
});

test('fileDisputeSchema: refund türü kabul', () => {
  const r = fileDisputeSchema.safeParse({ bookingRef: 'bk-2', proName: 'X', kind: 'refund' });
  assert.equal(r.success, true);
});

test('fileDisputeSchema: geçersiz kind reddedilir', () => {
  const r = fileDisputeSchema.safeParse({ bookingRef: 'bk', proName: 'X', kind: 'chargeback' });
  assert.equal(r.success, false);
});

test('fileDisputeSchema: bookingRef boş reddedilir', () => {
  assert.equal(
    fileDisputeSchema.safeParse({ bookingRef: '', proName: 'X', kind: 'deposit' }).success,
    false,
  );
});

// §12.4 — admin kararı
test('resolveDisputeSchema: approve/reject kabul', () => {
  assert.equal(resolveDisputeSchema.safeParse({ decision: 'approve' }).success, true);
  assert.equal(
    resolveDisputeSchema.safeParse({ decision: 'reject', resolution: 'gerekçe' }).success,
    true,
  );
});

test('resolveDisputeSchema: geçersiz karar reddedilir', () => {
  assert.equal(resolveDisputeSchema.safeParse({ decision: 'escalate' }).success, false);
});
