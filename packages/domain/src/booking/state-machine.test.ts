import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ALLOWED_TRANSITIONS,
  InvalidTransitionError,
  assertTransition,
  canTransition,
  isTerminal,
} from './state-machine.js';

test('geçerli geçişe izin verir', () => {
  assert.equal(canTransition('DRAFT', 'CONFIRMED'), true);
  assert.equal(canTransition('COMPLETION_PENDING_USER', 'COMPLETED'), true);
});

test('geçersiz geçişi reddeder', () => {
  assert.equal(canTransition('DRAFT', 'COMPLETED'), false);
  assert.throws(() => assertTransition('DRAFT', 'COMPLETED'), InvalidTransitionError);
});

test('CLOSED terminaldir', () => {
  assert.equal(isTerminal('CLOSED'), true);
  assert.equal(isTerminal('REFUNDED'), false); // REFUNDED -> CLOSED hâlâ mümkün
});

test('tüm durumlar haritada tanımlı', () => {
  for (const targets of Object.values(ALLOWED_TRANSITIONS)) {
    for (const t of targets) {
      assert.ok(t in ALLOWED_TRANSITIONS, `bilinmeyen hedef durum: ${t}`);
    }
  }
});

test('tamamlanmadan kamuya yorum yok: COMPLETED dışından review eligible olmamalı', () => {
  // Sadece COMPLETED durumdan dispute/close mümkün; review eligibility COMPLETED'e bağlıdır.
  assert.equal(canTransition('IN_SERVICE', 'COMPLETED'), false);
});
