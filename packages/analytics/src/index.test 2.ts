import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenAnalyticsFieldError, assertSafeProps, createAnalytics } from './index.js';

test('güvenli payload geçer', () => {
  assert.doesNotThrow(() => assertSafeProps({ professional_id: 'abc', count: 3 }));
});

test('yasaklı alan reddedilir', () => {
  assert.throws(() => assertSafeProps({ lat: 51.1 }), ForbiddenAnalyticsFieldError);
  assert.throws(() => assertSafeProps({ phone: '+770...' }), ForbiddenAnalyticsFieldError);
});

test('capture yasaklı alanda sink çağırmaz', () => {
  let called = 0;
  const a = createAnalytics({ capture: () => (called += 1) });
  assert.throws(() => a.capture('app_opened', { email: 'x@y.z' }));
  assert.equal(called, 0);
});
