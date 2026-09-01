import assert from 'node:assert/strict';
import { test } from 'node:test';
import { darkGradients, lightGradients } from './theme.gradients';
import { darkColors, lightColors } from './theme.palette';

/**
 * GRADYAN ZEMİNLERİN OKUNABİLİRLİĞİ.
 *
 * Dolu gradyan bir yüzeydir: üstündeki yazı okunmalı, kendisi de arkasındaki
 * zeminden ayrışmalı. Bunlar token dosyasında tek satırda değişiyor ve
 * değişince UYGULAMANIN HER YERİNİ etkiliyor — `gradients.gold` birincil
 * düğmenin gradyanı, yani neredeyse her ekranda var.
 *
 * Buradaki eşikler ölçüm sonucudur, tahmin değil.
 */

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
/** Gradyanın EN KÖTÜ ucu — bir uç geçip öteki kalırsa yazı yarı yolda kaybolur. */
const enKotu = (grad: readonly [string, string], yazi: string) =>
  Math.min(oran(yazi, grad[0]), oran(yazi, grad[1]));

test('BİRİNCİL DÜĞME yazısı iki temada da okunuyor', () => {
  for (const [ad, g, c] of [
    ['açık', lightGradients.gold, lightColors],
    ['koyu', darkGradients.gold, darkColors],
  ] as const) {
    const o = enKotu(g, c.onAccent);
    assert.ok(o >= 4.5, `${ad} tema: birincil düğme yazısı ${o.toFixed(2)}:1 — 4.5 altında`);
  }
});

test('BİRİNCİL DÜĞME zeminden ayrışıyor', () => {
  // Düğme görülebilmeli; zemine karışan düğme basılabilir görünmez.
  for (const [ad, g, c] of [
    ['açık', lightGradients.gold, lightColors],
    ['koyu', darkGradients.gold, darkColors],
  ] as const) {
    const o = Math.min(oran(g[0], c.bg), oran(g[1], c.bg));
    assert.ok(o >= 3, `${ad} tema: düğme zeminden ${o.toFixed(2)}:1 ayrışıyor — 3 altında`);
  }
});

test('MARKA RENGİ temaya göre değişmiyor', () => {
  // Birincil düğme koyu temada GÜL, açık temada ERİKti. Aynı düğmenin iki
  // farklı marka rengi olması tasarım dilini bozuyordu.
  const erikMi = (hex: string) => {
    const h = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [
      number,
      number,
      number,
    ];
    // Erik/mor: mavi kanalı yeşilden belirgin yüksek, kırmızı da yeşilin üstünde.
    return b > g + 12 && r > g;
  };
  for (const [ad, g] of [
    ['açık', lightGradients.gold],
    ['koyu', darkGradients.gold],
  ] as const) {
    for (const uc of g) {
      assert.ok(erikMi(uc), `${ad} tema: birincil düğme ucu ${uc} erik değil`);
    }
  }
});

test('ACİL gradyanı gül KALIYOR', () => {
  // Bu temizlik semantik rengi süpürmemeli: `rose` acil/sayaç kartının rengi
  // ve orada gül olması ANLAMLI.
  const h = darkGradients.rose[1].replace('#', '');
  const [r, , b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
  assert.ok(r > b, 'acil gradyanı gül olmaktan çıkmış');
});
