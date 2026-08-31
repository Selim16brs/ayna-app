import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALLOWED_TRANSITIONS, canTransition } from '@ayna/domain';

/**
 * PARA EL DEĞİŞTİRME AKIŞI (kurucu kuralı, 31.08.2026).
 *
 *   randevu anında  → hizmet bedelinin %10'u
 *   uzman "bitirdim" → müşteride "ödemeyi yap" açılır      (balance_pending)
 *   müşteri "ödedim" → uzmanda "ödemeyi aldım" açılır      (balance_submitted)
 *   uzman "aldım"    → randevu kapanır                     (completed)
 *                      · komisyonun 45 dakikalık süresi BAŞLAR
 *                      · müşterinin AYNA puanı AKTİFLEŞİR
 */

const svc = readFileSync(join(import.meta.dirname, 'bookings.service.ts'), 'utf8');

test('akış sırası zorunlu — adım atlanamaz', () => {
  assert.ok(canTransition('confirmed', 'balance_pending'), 'uzman bitiremiyor');
  assert.ok(canTransition('balance_pending', 'balance_submitted'), 'müşteri ödedim diyemiyor');
  assert.ok(canTransition('balance_submitted', 'completed'), 'uzman teyit edemiyor');

  // ADIM ATLAMA YASAK: para el değiştirmeden randevu kapanamaz.
  assert.equal(canTransition('confirmed', 'completed'), false, 'ödeme atlanabiliyor');
  assert.equal(
    canTransition('balance_pending', 'completed'),
    false,
    'müşteri beyanı olmadan kapanıyor',
  );
});

test('her iki taraf da itiraz edebilir', () => {
  // Tek beyanla ilerleyen bir akışta karşı tarafın tek çaresi itirazdır.
  assert.ok(ALLOWED_TRANSITIONS.balance_pending.includes('disputed'));
  assert.ok(ALLOWED_TRANSITIONS.balance_submitted.includes('disputed'));
});

test('komisyon ve puan YALNIZ "ödemeyi aldım" anında', () => {
  // İkisi de paranın gerçekten el değiştirdiği ana bağlı. Uzman parayı
  // almadan komisyon istemek ya da müşteriye puan vermek yanlış olurdu.
  const m = /async balanceReceived\([\s\S]*?\n {2}\}/.exec(svc);
  assert.ok(m, 'balanceReceived yok');
  assert.match(m[0], /status: 'completed'/, 'randevu kapanmıyor');
  assert.match(m[0], /invoiceForBookings\(\[id\]\)/, 'komisyon faturası doğmuyor');
  assert.match(m[0], /grantCompletionRewards/, 'puan aktifleşmiyor');

  // "İşlemi bitirdim" adımında İKİSİ DE olmamalı.
  const c = /async complete\([\s\S]*?\n {2}\}/.exec(svc);
  assert.ok(c, 'complete yok');
  assert.doesNotMatch(c[0], /invoiceForBookings/, 'komisyon para el değişmeden başlıyor');
  assert.doesNotMatch(c[0], /grantCompletionRewards/, 'puan para el değişmeden veriliyor');
});

test('adımları doğru taraf tetikliyor', () => {
  // Müşterinin "ödemeyi aldım" diyebilmesi ya da uzmanın müşteri adına
  // "ödedim" demesi, akışı anlamsız kılardı.
  const c = /async complete\([\s\S]*?\n {2}\}/.exec(svc)![0];
  const bp = /async balancePaid\([\s\S]*?\n {2}\}/.exec(svc)![0];
  const br = /async balanceReceived\([\s\S]*?\n {2}\}/.exec(svc)![0];
  assert.match(c, /assertParty\(id, actorId, 'provider'\)/, 'bitirme uzmana kapalı değil');
  assert.match(bp, /assertParty\(id, actorId, 'owner'\)/, 'ödedim müşteriye ait değil');
  assert.match(br, /assertParty\(id, actorId, 'provider'\)/, 'aldım uzmana ait değil');
});
