import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  decryptField,
  encryptField,
  generateOtp,
  hashOtp,
  hashPassword,
  phoneHash,
  verifyPassword,
} from './crypto';

const KEY = 'test-secret-key-0123456789';

test('parola scrypt round-trip', () => {
  const stored = hashPassword('hunter2');
  assert.ok(verifyPassword('hunter2', stored));
  assert.ok(!verifyPassword('wrong', stored));
});

test('alan şifreleme AES-GCM round-trip', () => {
  const enc = encryptField('+7 700 123 45 67', KEY);
  assert.notEqual(enc.toString('utf8'), '+7 700 123 45 67');
  assert.equal(decryptField(enc, KEY), '+7 700 123 45 67');
});

test('phoneHash deterministik + normalize (boşluk/format farkı eşitlenir)', () => {
  assert.equal(phoneHash('+7 700 123 45 67', KEY), phoneHash('77001234567', KEY));
  assert.notEqual(phoneHash('77001234567', KEY), phoneHash('77001234568', KEY));
});

test('§4.6 OTP: hashOtp deterministik, farklı kodlar farklı hash', () => {
  assert.equal(hashOtp('123456', KEY), hashOtp('123456', KEY));
  assert.notEqual(hashOtp('123456', KEY), hashOtp('654321', KEY));
});

test('§4.6 OTP üretimi 6 haneli (baştaki sıfırlar korunur)', () => {
  for (let i = 0; i < 50; i++) {
    const code = generateOtp();
    assert.match(code, /^\d{6}$/);
  }
});
