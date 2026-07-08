import assert from 'node:assert/strict';
import { test } from 'node:test';
import { maskContact, processMessage, resolvePair, sideOf } from './messaging.util';

test('sideOf: rol → taraf', () => {
  assert.equal(sideOf('user'), 'customer');
  assert.equal(sideOf('professional'), 'pro');
  assert.equal(sideOf('salon'), 'pro');
  assert.equal(sideOf('admin'), null);
});

test('resolvePair: müşteri başlatınca customerId=ben', () => {
  const r = resolvePair('me', 'user', 'target', 'professional');
  assert.deepEqual(r, { customerId: 'me', proUserId: 'target' });
});

test('resolvePair: uzman başlatınca proUserId=ben', () => {
  const r = resolvePair('me', 'salon', 'target', 'user');
  assert.deepEqual(r, { customerId: 'target', proUserId: 'me' });
});

test('resolvePair: aynı taraf → null (müşteri↔müşteri yasak)', () => {
  assert.equal(resolvePair('a', 'user', 'b', 'user'), null);
  assert.equal(resolvePair('a', 'professional', 'b', 'salon'), null);
  assert.equal(resolvePair('a', 'admin', 'b', 'user'), null);
});

test('maskContact: 7+ haneli numara maskelenir', () => {
  assert.equal(maskContact('ara beni 7071234567'), 'ara beni •••');
  assert.equal(maskContact('+7 707 123 45 67 ara'), '+•••ara');
  assert.equal(maskContact('whatsapp 8-777-000-11-22'), 'whatsapp •••');
});

test('maskContact: kısa sayılar (fiyat/saat) korunur', () => {
  assert.equal(maskContact('saat 14 fiyat 5000 tenge'), 'saat 14 fiyat 5000 tenge');
});

test('processMessage: numara maskele + moderasyon', () => {
  const clean = processMessage('Yarın 15:00 uygun mu?');
  assert.equal(clean.verdict.flagged, false);
  const bad = processMessage('salak seni');
  assert.equal(bad.verdict.flagged, true);
});
