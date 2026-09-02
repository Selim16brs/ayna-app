import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { darkColors, lightColors } from './theme.palette';

/**
 * ORTAK BİLEŞENLER — `src/ui`.
 *
 * Buradaki bir hata tek ekranda değil, o bileşeni kullanan HER ekranda
 * görünüyor. Ekranları tararken en sona kalmışlardı ve iki gerçek sorun
 * çıktı.
 */

const oku = (ad: string) => readFileSync(join(__dirname, 'ui', ad), 'utf8');
const yorumsuz = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

function parlaklik(hex: string): number {
  const h = hex.replace('#', '');
  const k = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
}
function oran(a: string, b: string): number {
  const [x, y] = [parlaklik(a), parlaklik(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

test('TEMA KİPİ renk karşılaştırmasıyla anlaşılmıyor', () => {
  /*
   * `DateField` koyu temayı `colors.bg === '#191E1B'` ile anlıyordu. O renk
   * Figma geçişinde gitti (artık #18061C), yani koşul HİÇ doğru olmadı:
   * yerli tarih seçici koyu temada da AÇIK görünümde açılıyordu.
   *
   * Palet değerine gömülü bir karşılaştırma sessizce ölür — renk değişince
   * kimse haber vermez. Kip token'dan okunmalı.
   */
  const kok = join(__dirname, 'ui');
  for (const ad of readdirSync(kok)) {
    if (!ad.endsWith('.tsx')) continue;
    const k = yorumsuz(oku(ad));
    assert.doesNotMatch(
      k,
      /colors\.\w+ === '#[0-9A-Fa-f]{6}'/,
      `${ad}: tema kipi renk karşılaştırmasıyla anlaşılıyor — palet değişince sessizce bozulur`,
    );
  }
});

test('SALON ROZETLERİ palette ve iki temada okunuyor', () => {
  // Üç rozet sabit pastel yazılıydı (lime/lavanta/şeftali): palette olmayan
  // renkler, temaya hiç bakmıyorlardı.
  const k = yorumsuz(oku('SalonRow.tsx'));
  for (const olu of ['#DDF08A', '#E1DAF3', '#F8DFC2']) {
    assert.doesNotMatch(k, new RegExp(olu, 'i'), `${olu} hâlâ duruyor`);
  }
  for (const [bg, fg] of [
    ['goldSoft', 'gold'],
    ['successSoft', 'success'],
    ['accentSoft', 'accent'],
  ] as const) {
    assert.match(k, new RegExp(`bg: '${bg}', fg: '${fg}'`), `${bg}/${fg} rozeti yok`);
    for (const [tema, c] of [
      ['açık', lightColors],
      ['koyu', darkColors],
    ] as const) {
      const o = oran(c[fg], c[bg]);
      assert.ok(o >= 4.5, `${tema} tema: ${bg} rozeti ${o.toFixed(2)}:1`);
    }
  }
});
