import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  announcementSchema,
  applicationSchema,
  articleSchema,
  reviewApplicationSchema,
} from './content.dto';

// §12.6 — makale: başlık/etiket/özet/gövde zorunlu
test('articleSchema: geçerli makale kabul', () => {
  const r = articleSchema.safeParse({
    title: 'Saç bakımı',
    tag: 'Bakım',
    excerpt: 'Kısa özet',
    body: ['Paragraf 1', 'Paragraf 2'],
    published: true,
  });
  assert.equal(r.success, true);
});

test('articleSchema: boş gövde reddedilir', () => {
  assert.equal(
    articleSchema.safeParse({ title: 'Xyz', tag: 'A', excerpt: 'e', body: [] }).success,
    false,
  );
});

test('articleSchema: kısa başlık (<3) reddedilir', () => {
  assert.equal(
    articleSchema.safeParse({ title: 'ab', tag: 'A', excerpt: 'e', body: ['p'] }).success,
    false,
  );
});

// §12.6 — kullanıcı başvurusu
test('applicationSchema: geçerli başvuru kabul', () => {
  const r = applicationSchema.safeParse({
    authorName: 'Aigerim',
    title: 'Cilt bakımı rehberi',
    body: ['İçerik'],
  });
  assert.equal(r.success, true);
});

// §12.6 — başvuru kararı
test('reviewApplicationSchema: approve/reject kabul, diğeri red', () => {
  assert.equal(reviewApplicationSchema.safeParse({ decision: 'approve' }).success, true);
  assert.equal(reviewApplicationSchema.safeParse({ decision: 'reject', note: 'x' }).success, true);
  assert.equal(reviewApplicationSchema.safeParse({ decision: 'maybe' }).success, false);
});

// §12.10 — duyuru: segment=city ise şehir zorunlu (refine)
test('announcementSchema: segment=all şehirsiz kabul', () => {
  const r = announcementSchema.safeParse({ title: 'Duyuru', body: 'Metin', segment: 'all' });
  assert.equal(r.success, true);
});

test('announcementSchema: segment=city şehirsiz REDDEDİLİR', () => {
  const r = announcementSchema.safeParse({ title: 'Duyuru', body: 'Metin', segment: 'city' });
  assert.equal(r.success, false);
});

test('announcementSchema: segment=city + şehir kabul', () => {
  const r = announcementSchema.safeParse({
    title: 'Duyuru',
    body: 'Metin',
    segment: 'city',
    city: 'Almatı',
  });
  assert.equal(r.success, true);
});

test('announcementSchema: bilinmeyen segment reddedilir', () => {
  assert.equal(
    announcementSchema.safeParse({ title: 'x', body: 'y', segment: 'vips' }).success,
    false,
  );
});
