import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

/**
 * UZMANLIK ALANI OLARAK KENDİ ADI YAZILMIYOR.
 *
 * Canlıda görülen (05.09.2026): "Darina Serbu" adlı uzmanın `specialty`
 * alanı da "Darina Serbu". Kartta ad iki kez çıkıyor, biri de uzmanlık
 * diye — kullanıcının hiç girmediği bir bilgi, sistemin uydurması.
 *
 * Biyografi yazmamış olmak bir uzmanlık üretmez: alan boş kalıyor.
 */

function yorumsuz(yol: string): string {
  return readFileSync(yol, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

test('uzman kaydı ADI uzmanlık alanına yazmıyor', () => {
  const kaynak = yorumsuz('src/specialists/specialists.service.ts');
  const i = kaynak.indexOf('specialty:');
  assert.ok(i > 0, 'uzmanlık alanı hiç yazılmıyor');
  const satir = kaynak.slice(i, kaynak.indexOf('\n', i));
  assert.doesNotMatch(satir, /input\.name/, 'biyografi yoksa uzmanlık alanına AD yazılıyor');
});

test('salon onayı ADI uzmanlık alanına yazmıyor', () => {
  const kaynak = yorumsuz('src/businesses/businesses.service.ts');
  const i = kaynak.indexOf('specialty:');
  assert.ok(i > 0);
  const satir = kaynak.slice(i, kaynak.indexOf('\n', i));
  assert.doesNotMatch(satir, /b\.name/, 'tanıtım yoksa uzmanlık alanına salon ADI yazılıyor');
});

test('mevcut kayıtlar için temizlik SQL’i var', () => {
  // Kod düzeltmesi yalnız YENİ kayıtları kurtarır; canlıdaki satırlar
  // temizlenmezse kurucu ekranda aynı hatayı görmeye devam eder.
  const sql = readFileSync('prisma/pre-push/17-uzmanlik-adi.sql', 'utf8');
  assert.match(sql, /UPDATE professionals/);
  assert.match(sql, /WHERE specialty = name/, 'guard yok — başka kayıtlar da silinebilir');
});
