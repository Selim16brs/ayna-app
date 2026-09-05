import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

/**
 * UYDURULMUŞ PUAN YOK — kurucu kuralı.
 *
 *   "sistem hiçbir şekilde randevu, değerlendirme, not, puanlama, ayna para,
 *    bildirim ya da benzeri hiçbir şeyi kendiliğinden uydurmamalı."
 *
 * Hiç yorumu olmayan uzmanın puanı sunucudan 0 geliyor. Kart bunu altın
 * yıldızla "0.0" diye yazınca müşteri onu 5 üzerinden 0 almış, yani EN KÖTÜ
 * puanlı uzman sanıyor — oysa kimse puan vermemiş. Canlıda (05.09.2026)
 * keşif karuselinde ve salon listesinde tam olarak bu vardı; arama ekranı
 * ile promosyon kartı ise doğru davranıyordu.
 */

/** Yorumları eler — test kendi açıklamasıyla eşleşmesin. */
function yorumsuz(yol: string): string {
  return readFileSync(yol, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const KARTLAR = ['src/ui/ProCard.tsx', 'src/ui/SalonRow.tsx', 'app/search.tsx'];

for (const yol of KARTLAR) {
  test(`${yol}: puan YALNIZ yorum varsa çiziliyor`, () => {
    const kaynak = yorumsuz(yol);
    const i = kaynak.indexOf('rating.toFixed(1)');
    assert.ok(i > 0, 'puan gösterimi bulunamadı');
    // Puanın ÖNÜNDE yorum sayısı koşulu olmalı. Koşul kaldırılırsa
    // (ya da `pro.reviewCount ?` gibi yalnız SAYIYI saran bir koşula
    // dönerse) bu eşleşme düşer.
    const once = kaynak.slice(Math.max(0, i - 400), i);
    assert.match(once, /reviewCount\s*>\s*0\s*\?/, 'yorumu olmayan uzmana yıldızla 0.0 yazılıyor');
  });

  test(`${yol}: yorumsuz uzman "Yeni" diye anılıyor`, () => {
    const kaynak = yorumsuz(yol);
    assert.match(kaynak, /t\('pro\.new'\)/, 'yorumsuz uzman için karşılık yok');
  });
}

test('kartlar UZMANIN ADINI uzmanlık diye yazmıyor', () => {
  /*
   * Sunucu düzeltildi ama eski kayıtlarda `specialty` hâlâ ad olabilir
   * (temizlik SQL'i koşana kadar). Kartlar ham alanı yazıyordu:
   * "Darina Serbu / Darina Serbu". `uzmanlikYazisi` adla aynıysa alanı
   * atıp uzmanın KENDİ seçtiği ana alanın çevrilmiş adına düşüyor.
   */
  for (const yol of ['src/ui/ProCard.tsx', 'src/ui/SalonRow.tsx']) {
    const kaynak = yorumsuz(yol);
    assert.doesNotMatch(kaynak, /\|\|\s*pro\.specialty/, `${yol}: ham specialty yazılıyor`);
    assert.match(kaynak, /uzmanlikYazisi\(pro, locale\)/, `${yol}: güvenli yedek kullanılmıyor`);
  }
});
