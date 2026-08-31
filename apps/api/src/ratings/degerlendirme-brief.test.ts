import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** §4.11 — değerlendirme kuralları. Üçü de gizlilik/adalet dengesi kurar. */

const svc = readFileSync(join(import.meta.dirname, 'ratings.service.ts'), 'utf8');

test('pencere 7 gün, yansıma gecikmesi 1 gün', () => {
  assert.match(svc, /DEGERLENDIRME_PENCERESI_MS = 7 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(svc, /YANSIMA_GECIKMESI_MS = 24 \* 60 \* 60 \* 1000/);
});

test('yalnız TAMAMLANMIŞ randevu değerlendirilebilir (sahte yorum engeli)', () => {
  assert.match(svc, /booking\.status !== 'tamamlandi' && booking\.status !== 'degerlendirme'/);
});

test('gecikme OKUMADA uygulanıyor — yalnız yazarken damgalamak yetmez', () => {
  // Yalnız yazarken `publishAt` damgalayıp okurken bakmamak, yorumu yine
  // anında görünür kılardı: gecikme fiilen hiç uygulanmazdı.
  const okumalar = svc.match(/publishAt: \{ lte: new Date\(\) \}/g) ?? [];
  assert.ok(okumalar.length >= 2, 'okuma yollarının hepsi gecikmeyi süzmüyor');
});

test('uzmana KİMLİK gitmiyor — yalnız etiket', () => {
  const m = /reviews: revealed[\s\S]*?\n {8}: \[\]/.exec(svc);
  assert.ok(m, 'yorum listesi bulunamadı');
  assert.match(m[0], /authorLabel: r\.authorLabel/);
  // §4.11 isimsizlik: puanın hangi müşteriden geldiği uzmana gösterilmez.
  for (const alan of ['raterUserId', 'userId', 'authorName', 'phone']) {
    assert.ok(!new RegExp(`\\b${alan}:`).test(m[0]), `yorumda '${alan}' sızıyor`);
  }
});
