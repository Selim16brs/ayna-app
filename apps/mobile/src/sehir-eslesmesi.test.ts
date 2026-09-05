import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { sehirEslesir } from '@ayna/domain';

/**
 * ŞEHİR EŞLEŞMESİ HİÇBİR EKRANDA DÜZ METİN DEĞİL.
 *
 * Canlıda görülen (05.09.2026): haritadan konumunu işaretleyen uzmanın
 * şehri 'Алматы' oluyordu (ters geocode Kazakistan'da Rusça döner).
 * 'Almatı' seçmiş müşterinin keşif ekranı, araması, haritası ve kategori
 * listesi `p.city === city` diye karşılaştırdığı için o uzman SESSİZCE
 * kayboluyordu — ne hata, ne uyarı, sadece yok.
 *
 * Tek bir ekranı düzeltmek yetmiyor: kullanıcı diğerinden aynı boşluğa
 * düşerdi. Bu test hepsini birden bekçiliyor.
 */

function yorumsuz(yol: string): string {
  return readFileSync(yol, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const EKRANLAR = [
  'app/(tabs)/discover.tsx',
  'app/search.tsx',
  'app/map.tsx',
  'app/nearby.tsx',
  'app/category/[id].tsx',
];

for (const yol of EKRANLAR) {
  test(`${yol}: şehir DÜZ METİN karşılaştırılmıyor`, () => {
    const kaynak = yorumsuz(yol);
    assert.doesNotMatch(
      kaynak,
      /\.city\s*(===|!==)\s*(city|filtre\.sehir)/,
      'düz metin karşılaştırması geri geldi — Rusça yazımlı uzman kayboluyor',
    );
    assert.match(kaynak, /sehirEslesir\(/, 'normalleştirilmiş eşleşme kullanılmıyor');
  });
}

test('kural gerçekten çalışıyor — Rusça yazım eşleşiyor', () => {
  // Kaynak taraması "çağrı var mı" der; bu satır çağrının DOĞRU şeyi
  // yaptığını söyler.
  assert.equal(sehirEslesir('Алматы', 'Almatı'), true);
  assert.equal(sehirEslesir('Алматы', 'Astana'), false);
});
