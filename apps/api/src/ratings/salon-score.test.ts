import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blendedSalonScore } from './ratings.service';

// §7.1 — salon skoru = %60 salon doğrudan + %40 bağlı uzman ortalaması
test('blendedSalonScore: salon 4.0 + uzmanlar [5,4] → 0.6*4 + 0.4*4.5 = 4.2', () => {
  assert.equal(blendedSalonScore(4.0, [5, 4]), 4.2);
});

test('blendedSalonScore: uzman puanı yoksa salon puanına düşer', () => {
  assert.equal(blendedSalonScore(4.3, []), 4.3);
  assert.equal(blendedSalonScore(4.3, [null, null]), 4.3);
});

test('blendedSalonScore: salon puanı yoksa uzman ortalamasına düşer', () => {
  assert.equal(blendedSalonScore(null, [5, 4]), 4.5);
});

test('blendedSalonScore: ikisi de yoksa null', () => {
  assert.equal(blendedSalonScore(null, []), null);
});

test('blendedSalonScore: 1 ondalığa yuvarlar', () => {
  // 0.6*4.7 + 0.4*4.2 = 2.82 + 1.68 = 4.5
  assert.equal(blendedSalonScore(4.7, [4.2]), 4.5);
});
