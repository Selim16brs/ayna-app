import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { darkColors, lightColors } from './theme.palette';

/**
 * TEKLİF AL — iki yol.
 *
 * Kurucu: "dılegını anlat butonuna basınca sadece fotogrf ıle teklıf ekranı
 * acılıyor. bızım daha once fotograf ıle ve fıyat teklıfı ıle dıye 2 yolumuz
 * vardı."
 *
 * İki ayrı hata vardı ve ikisi de burada kilitli:
 *   1) Keşfet doğrudan `/quote/new`'e gidiyordu → fiyat yolu ERİŞİLEMEZDİ.
 *   2) Seçim ekranı eski pastel paletteydi (lime #D6EE94), temaya bağlı
 *      değildi ve yeni tasarım diline ait değildi.
 */

const oku = (p: string) => readFileSync(join(__dirname, '..', 'app', p), 'utf8');
const hub = oku('quote/index.tsx');
/** Yorumsuz kaynak: ölü renkleri ARANIRKEN tarihçe anlatan yorum eşleşmesin. */
const hubKod = hub.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/** WCAG bağıl parlaklık. */
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

test('İKİ YOL da ekranda ve ayrı hedeflere gidiyor', () => {
  assert.match(hub, /router\.push\('\/quote\/new'\)/, 'fotoğraf yolu yok');
  assert.match(hub, /router\.push\('\/demand\/new'\)/, 'fiyat/talep yolu yok');
});

test('eski pastel palet GİTTİ', () => {
  // Lime yeşili ve lavanta pastelleri bu tasarım dilinde yok; üstelik
  // temaya bağlı değillerdi (koyu modda da aynı açık zemin).
  for (const olu of ['#EFE7FA', '#FBE3EE', '#EEF7C8', '#D6EE94']) {
    assert.doesNotMatch(hubKod, new RegExp(olu, 'i'), `${olu} hâlâ duruyor`);
  }
});

test('dolu kartın yazısı erik gradyanda OKUNUYOR', () => {
  // Gradyanın açık ucu en kötü durum: orada bile 4.5:1 geçmeli.
  const o = oran(darkColors.ink, lightColors.accent);
  assert.ok(o >= 4.5, `dolu kart yazısı ${o.toFixed(2)}:1 — 4.5 altında`);
});

test('dolu karttaki düğme yazısı OKUNUYOR', () => {
  // Açık zeminli hap + erik yazı.
  const o = oran(lightColors.accent, darkColors.ink);
  assert.ok(o >= 4.5, `düğme yazısı ${o.toFixed(2)}:1 — 4.5 altında`);
});

test('boş kartın yazısı İKİ TEMADA da okunuyor', () => {
  for (const [ad, c] of [
    ['açık', lightColors],
    ['koyu', darkColors],
  ] as const) {
    const baslik = oran(c.ink, c.surface);
    assert.ok(baslik >= 4.5, `${ad}: başlık ${baslik.toFixed(2)}:1`);
    const aciklama = oran(c.muted, c.surface);
    assert.ok(aciklama >= 4.5, `${ad}: açıklama ${aciklama.toFixed(2)}:1`);
    const dugme = oran(c.onAccent, c.accent);
    assert.ok(dugme >= 4.5, `${ad}: düğme ${dugme.toFixed(2)}:1`);
  }
});

test('dolu kartın üstündeki yazı SABİT — temadan gelmiyor', () => {
  // Erik gradyan iki temada da aynı; yazıyı temadan alsaydık koyu modda
  // açık zemine açık yazı gelirdi.
  assert.match(hub, /YOL_YAZI = darkColors\.ink/, 'dolu kart yazısı sabitlenmemiş');
  assert.match(hub, /const yazi = dolu \? YOL_YAZI : colors\.ink/, 'yazı seçimi rol ayırmıyor');
});
