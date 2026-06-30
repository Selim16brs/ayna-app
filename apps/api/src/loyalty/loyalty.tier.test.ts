import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeTier } from './loyalty.service';

// §11 — sadakat seviyeleri: kümülatif KAZANILAN puana göre bronz/gümüş/altın
test('0 puan → bronz, gümüşe ilerleme', () => {
  const t = computeTier(0);
  assert.equal(t.key, 'bronze');
  assert.equal(t.next, 'silver');
  assert.equal(t.pointsToNext, 500);
  assert.equal(t.progress, 0);
});

test('eşik altı bronz, ilerleme oransal', () => {
  const t = computeTier(200);
  assert.equal(t.key, 'bronze');
  assert.equal(t.pointsToNext, 300);
  assert.equal(t.progress, 0.4);
});

test('500 → gümüş (eşik dahil)', () => {
  const t = computeTier(500);
  assert.equal(t.key, 'silver');
  assert.equal(t.next, 'gold');
  assert.equal(t.pointsToNext, 1000);
});

test('1500+ → altın (en üst, sonraki yok)', () => {
  const t = computeTier(1600);
  assert.equal(t.key, 'gold');
  assert.equal(t.next, null);
  assert.equal(t.pointsToNext, 0);
  assert.equal(t.progress, 1);
});
