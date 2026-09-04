import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ANONIM_YAZAR_ETIKETI, BEN_YAZAR_ETIKETI } from '@ayna/domain';
import { yorumYazariYazisi } from './yorum-yazari';

/**
 * YORUM YAZARI TÜRKÇE SABİT DEĞİL.
 *
 * Anonim yoruma "Doğrulanmış üye", kullanıcının kendi yorumuna "Sen"
 * yazılıp ekrana olduğu gibi basılıyordu: Kazak/Rus müşteri yorumların
 * altında Türkçe okuyordu.
 */

const oku = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');
const t = ((k: string) => k) as never;

test('ETİKETLER kullanıcının dilinde', () => {
  assert.equal(yorumYazariYazisi(ANONIM_YAZAR_ETIKETI, t), 'review.author.anon');
  assert.equal(yorumYazariYazisi(BEN_YAZAR_ETIKETI, t), 'review.author.me');
  assert.equal(yorumYazariYazisi('', t), 'review.author.anon', 'boş ad kimliksiz kalıyor');
});

test('GERÇEK İSME dokunulmuyor', () => {
  // Anonim olmayan yorumda kullanıcının kendi adı yazıyor; onu çevirmek olmaz.
  assert.equal(yorumYazariYazisi('Darina', t), 'Darina');
  assert.equal(yorumYazariYazisi('  Aigerim  ', t), 'Aigerim', 'boşluklar kırpılmıyor');
});

test('ETİKET TEK KAYNAKTAN — sunucu ve uygulama aynı dizeyi yazıyor', () => {
  /*
   * Çeviri KARŞILAŞTIRMAYLA yapılıyor: sunucunun kaydettiği dize ile
   * uygulamanınki birebir aynı olmazsa o yorumlar çevrilmeden Türkçe kalır
   * ve kimse fark etmez.
   */
  const sunucu = readFileSync(
    join(__dirname, '..', '..', 'api', 'src', 'ratings', 'ratings.service.ts'),
    'utf8',
  );
  assert.match(sunucu, /ANONIM_YAZAR_ETIKETI/, 'sunucu kendi dizesini yazıyor');
  assert.doesNotMatch(sunucu, /'Doğrulanmış üye'/, 'sunucuda sabit dize kalmış');

  const store = oku('src', 'store.ts');
  assert.doesNotMatch(store, /'Doğrulanmış üye'/, 'store sabit dize yazıyor');
  assert.doesNotMatch(store, /author: anonymous \? '/, 'store sabit dize yazıyor');
});

test('YAZARIN GÖRÜNDÜĞÜ her ekran aynı kuraldan', () => {
  for (const yol of [
    ['app', 'professional', '[id].tsx'],
    ['app', 'seller', 'reviews.tsx'],
    ['app', 'seller', 'reports.tsx'],
  ]) {
    assert.match(oku(...yol), /yorumYazariYazisi\(/, `${yol.join('/')}: ham yazar basılıyor`);
  }
});
