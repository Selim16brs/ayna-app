import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EARN_RULES, ONCE_PER_LIFETIME, ruleFor } from './earn-rules';

test('bilinmeyen sebep kural üretmez — uydurma sebeple puan basılamaz', () => {
  assert.equal(ruleFor('rewards.earn.hediye'), undefined);
  assert.equal(ruleFor(''), undefined);
  // Düz nesnede bu satır Object.prototype döndürüyordu — Map ile kapatıldı.
  assert.equal(ruleFor('__proto__'), undefined);
  assert.equal(ruleFor('constructor'), undefined);
  assert.equal(ruleFor('toString'), undefined);
});

test('tutar sebebe göre SABİT — istemcinin gönderdiği değer kullanılamaz', () => {
  assert.equal(ruleFor('rewards.earn.review')?.points, 40);
  assert.equal(ruleFor('rewards.earn.first_booking')?.points, 300);
  assert.equal(ruleFor('rewards.earn.provider_noshow')?.points, 1000);
});

test('her sebebin günlük sınırı var — sınırsız tekrar mümkün değil', () => {
  for (const [reason, rule] of EARN_RULES) {
    assert.ok(rule.dailyLimit > 0, `${reason} günlük sınırı yok`);
    assert.ok(rule.dailyLimit <= 20, `${reason} günlük sınırı fazla gevşek`);
  }
});

test('günlük en yüksek teorik kazanım sınırlı kalır', () => {
  const maxPerDay = [...EARN_RULES.values()].reduce((n, r) => n + r.points * r.dailyLimit, 0);
  // Açık öncesinde tek istekle 10.000 basılabiliyordu ve tekrar sınırı yoktu.
  assert.ok(maxPerDay <= 4000, `günlük tavan ${maxPerDay} — fazla yüksek`);
});

test('ilk randevu ödülü ömür boyu bir kez', () => {
  assert.ok(ONCE_PER_LIFETIME.has('rewards.earn.first_booking'));
});
