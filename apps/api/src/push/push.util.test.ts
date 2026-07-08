import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildExpoMessages, isValidExpoToken } from './push.util';

test('isValidExpoToken: geçerli/geçersiz', () => {
  assert.equal(isValidExpoToken('ExponentPushToken[abc123]'), true);
  assert.equal(isValidExpoToken('ExpoPushToken[xyz]'), true);
  assert.equal(isValidExpoToken('random-token'), false);
  assert.equal(isValidExpoToken(''), false);
});

test('buildExpoMessages: geçersiz token elenir + payload kurulur', () => {
  const msgs = buildExpoMessages(['ExponentPushToken[a]', 'bad', 'ExpoPushToken[b]'], {
    title: 'Yeni mesaj',
    body: 'Merhaba',
    data: { route: '/messages/123' },
  });
  assert.equal(msgs.length, 2);
  assert.equal(msgs[0]!.to, 'ExponentPushToken[a]');
  assert.equal(msgs[0]!.title, 'Yeni mesaj');
  assert.deepEqual(msgs[0]!.data, { route: '/messages/123' });
  assert.equal(msgs[1]!.to, 'ExpoPushToken[b]');
});

test('buildExpoMessages: data yoksa boş obje', () => {
  const msgs = buildExpoMessages(['ExpoPushToken[a]'], { title: 't', body: 'b' });
  assert.deepEqual(msgs[0]!.data, {});
});
