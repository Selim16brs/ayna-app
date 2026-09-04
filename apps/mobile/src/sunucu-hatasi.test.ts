import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { kk, ru, tr } from '@ayna/i18n';

/**
 * SUNUCU HATASI KULLANICININ DİLİNDE.
 *
 * Sunucunun `message` alanı TÜRKÇE ("İade edilecek depozito yok") ve bazı
 * ekranlar onu OLDUĞU GİBİ gösteriyordu. Kazak ya da Rus kullanıcı
 * reddedilme sebebini hiç anlamıyor, aynı şeyi tekrar deniyordu.
 *
 * (Sebebi göstermenin kendisi doğruydu: düz "bir hata oluştu" yazarken
 * kullanıcı yanlış şeyi düzeltmeye çalışıyordu. Eksik olan diliydi.)
 */

const oku = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');

test('HATA KODLARININ karşılığı ÜÇ DİLDE var', () => {
  const kodlar = Object.keys(tr).filter((k) => k.startsWith('err.'));
  assert.ok(kodlar.length >= 6, `hata karşılığı az: ${kodlar.length}`);
  const eksik: string[] = [];
  for (const k of kodlar) {
    for (const [dil, s] of [
      ['kk', kk],
      ['ru', ru],
    ] as const) {
      const v = (s as Record<string, string>)[k];
      if (!v?.trim()) eksik.push(`${dil}/${k}: boş`);
      else if (v === (tr as Record<string, string>)[k]) eksik.push(`${dil}/${k}: çevrilmemiş`);
    }
  }
  assert.deepEqual(eksik, []);
});

test('KODLAR SUNUCUDA GERÇEKTEN var — ölü çeviri yok', () => {
  /*
   * Karşılığını yazdığımız kod sunucuda yoksa o metin hiç görünmez ve
   * kimse fark etmez: sözlük şişer, kullanıcı yine Türkçe okur.
   */
  const kok = join(__dirname, '..', '..', 'api', 'src');
  const kaynak = ['bookings/bookings.service.ts', 'ad-orders/ad-orders.service.ts']
    .map((f) => readFileSync(join(kok, f), 'utf8'))
    .join('\n');
  const bulunmayan = Object.keys(tr)
    .filter((k) => k.startsWith('err.'))
    .map((k) => k.slice(4))
    .filter((kod) => !kaynak.includes(`code: '${kod}'`));
  assert.deepEqual(bulunmayan, [], 'sunucuda olmayan hata kodu için çeviri var');
});

test('BİLİNMEYEN kodda SUNUCUNUN cümlesi yedek', () => {
  /*
   * Yeni bir hata kodu eklendiğinde ekran boş kalmamalı: anlaşılmayan bir
   * sebep, hiç sebep yazmamaktan iyidir.
   */
  const k = oku('src', 'sunucu-hatasi.ts');
  assert.match(k, /return err\.message \|\| t\('common\.error'\)/, 'yedek yok');
  assert.match(k, /cevrilmis !== anahtar/, 'bilinmeyen anahtar ayrımı yok');
});

test('EKRANLAR ham sunucu metnini basmıyor', () => {
  for (const yol of [
    ['app', 'booking', 'refund.tsx'],
    ['app', 'seller', 'ads.tsx'],
  ]) {
    const k = oku(...yol);
    assert.match(k, /sunucuHatasi\(/, `${yol.join('/')}: ortak kural kullanılmıyor`);
    assert.doesNotMatch(k, /\?\s*e\.message\s*:/, `${yol.join('/')}: ham metin basılıyor`);
    assert.doesNotMatch(
      k,
      /err\.message \? err\.message :/,
      `${yol.join('/')}: ham metin basılıyor`,
    );
  }
});
