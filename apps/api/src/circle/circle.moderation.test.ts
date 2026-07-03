import assert from 'node:assert/strict';
import { test } from 'node:test';
import { keywordModeration } from './circle.moderation';

// §5.5 — temiz metin geçer
test('keywordModeration: temiz metin flagged=false', () => {
  const v = keywordModeration('Bu salonu çok beğendim, herkese tavsiye ederim.');
  assert.equal(v.flagged, false);
  assert.equal(v.reason, '');
});

// §5.5 — küfür bloklanır
test('keywordModeration: küfür flagged=true', () => {
  const v = keywordModeration('Sen tam bir salaksın');
  assert.equal(v.flagged, true);
  assert.match(v.reason, /Yasaklı/);
});

// §5.5 — spam bloklanır (büyük harf duyarsız)
test('keywordModeration: spam/reklam bloklanır (case-insensitive)', () => {
  assert.equal(keywordModeration('TIKLA KAZAN bedava hediye').flagged, true);
  assert.equal(keywordModeration('Casino linki burada').flagged, true);
});

test('keywordModeration: büyük harf İngilizce ifade (locale-nötr lower) eşleşir', () => {
  assert.equal(keywordModeration('You IDIOT').flagged, true);
  assert.equal(keywordModeration('FUCK this').flagged, true);
});
