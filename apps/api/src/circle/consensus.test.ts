import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tallyConsensus } from './consensus';

test('doğrulanmamış öneri SAYILMAZ — "duydum ki iyiymiş" fikir birliği üretmez', () => {
  const r = tallyConsensus([
    { proId: 'p1', userId: 'u1', proVerified: false },
    { proId: 'p1', userId: 'u2', proVerified: false },
  ]);
  assert.deepEqual(r, { voters: 0, items: [] });
});

test('aynı kişinin aynı uzmanı tekrar önermesi BİR sayılır', () => {
  const r = tallyConsensus([
    { proId: 'p1', userId: 'u1', proVerified: true },
    { proId: 'p1', userId: 'u1', proVerified: true },
    { proId: 'p1', userId: 'u1', proVerified: true },
  ]);
  assert.equal(r.voters, 1);
  assert.deepEqual(r.items, [{ proId: 'p1', count: 1 }]);
});

test('payda = öneride bulunan KİŞİ sayısı, yorum sayısı değil', () => {
  const r = tallyConsensus([
    { proId: 'p1', userId: 'u1', proVerified: true },
    { proId: 'p2', userId: 'u1', proVerified: true }, // aynı kişi iki uzman önerdi
    { proId: 'p1', userId: 'u2', proVerified: true },
  ]);
  assert.equal(r.voters, 2, '2 kişi öneride bulundu');
  assert.deepEqual(r.items, [
    { proId: 'p1', count: 2 },
    { proId: 'p2', count: 1 },
  ]);
});

test('çoktan aza sıralanır; eşitlikte sabit sıra (liste zıplamasın)', () => {
  const r = tallyConsensus([
    { proId: 'pB', userId: 'u1', proVerified: true },
    { proId: 'pA', userId: 'u2', proVerified: true },
  ]);
  assert.deepEqual(r.items, [
    { proId: 'pA', count: 1 },
    { proId: 'pB', count: 1 },
  ]);
});

test('uzman bağı olmayan yorum sayıma girmez', () => {
  const r = tallyConsensus([
    { proId: null, userId: 'u1', proVerified: true },
    { proId: 'p1', userId: 'u2', proVerified: true },
  ]);
  assert.equal(r.voters, 1);
  assert.deepEqual(r.items, [{ proId: 'p1', count: 1 }]);
});
