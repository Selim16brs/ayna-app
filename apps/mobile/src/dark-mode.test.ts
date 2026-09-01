import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { darkColors, lightColors } from './theme.palette';

/**
 * #15 KARANLIK MOD — rapordaki dört bulgunun düzeltmesi.
 *
 * Kontrastlar YORUMDAN okunmuyor, burada HESAPLANIYOR: yoruma yazılan sayı
 * renk değişince eskiyebilir, hesap eskiyemez.
 */

const kok = join(import.meta.dirname, '..');
const kodu = (...y: string[]) =>
  readFileSync(join(kok, ...y), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

function lum(h: string): number {
  const v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(v[0]!) + 0.7152 * f(v[1]!) + 0.0722 * f(v[2]!);
}
function kon(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

/**
 * İADE BANDI — iki temada da okunuyor.
 *
 * Eski `HomeUrgent` kartı zeminini SABİT tutarak çözüyordu: `rose`/`accent`
 * koyu temada açık renge dönüyor, beyaz yazı 2,27:1'e düşüyordu. Figma
 * tasarımındaki bant zemini `accent`, yazısı `onAccent` — yani ikisi BİRLİKTE
 * dönüyor. Aranan güvence aynı, mekanizma daha iyi: sabitlemek yerine yazıyı
 * zemine bağlamak. Ölçüm bunu doğruluyor.
 */
test('P1 — iade bandı yazısı iki temada da okunuyor', () => {
  const d = kodu('app/(tabs)/discover.tsx');
  assert.match(
    d,
    /iadeKart:[\s\S]{0,200}backgroundColor: colors\.accent/,
    'bant zemini accent değil',
  );
  assert.match(d, /iadeBaslik:[\s\S]{0,120}color: colors\.onAccent/, 'başlık onAccent değil');
  for (const [ad, palet] of [
    ['açık', lightColors],
    ['koyu', darkColors],
  ] as const) {
    const r = kon(palet.onAccent, palet.accent);
    assert.ok(r >= 4.5, `${ad} tema: onAccent/accent ${r.toFixed(2)}:1 — 4,5 altı`);
  }
});

test('P2 — durum renkleri AÇIK temada eşiği geçiyor', () => {
  const palet = readFileSync(join(kok, 'src/theme.palette.ts'), 'utf8');
  const acik = palet.slice(0, palet.indexOf('darkColors'));
  const tok = (ad: string) => new RegExp(`^  ${ad}: '(#[0-9A-Fa-f]{6})'`, 'm').exec(acik)?.[1];
  for (const [yazi, zemin] of [
    ['gold', 'goldSoft'],
    ['success', 'successSoft'],
    ['danger', 'dangerSoft'],
  ]) {
    const y = tok(yazi);
    const z = tok(zemin);
    assert.ok(y && z, `${yazi}/${zemin} okunamadı`);
    const r = kon(y, z);
    assert.ok(r >= 4.5, `${yazi} / ${zemin} = ${r.toFixed(2)}:1 — 4,5 altı`);
  }
});

test('P2b — tema tercihi KALICI', () => {
  const tc = kodu('src/theme-context.tsx');
  assert.match(tc, /AsyncStorage\.setItem\(TEMA_ANAHTARI/, 'seçim kaydedilmiyor');
  assert.match(tc, /AsyncStorage\.getItem\(TEMA_ANAHTARI/, 'seçim okunmuyor');
  // "Sisteme dön" de bir tercih: kaydı silmeli, sessizce yok saymamalı.
  assert.match(tc, /AsyncStorage\.removeItem\(TEMA_ANAHTARI\)/, 'sisteme dönüş kalıcı değil');
});

test('P3 — sistem yazı ölçeği sınırlı', () => {
  const tx = kodu('src/ui/Text.tsx');
  assert.match(tx, /maxFontSizeMultiplier=\{OLCEK_SINIRI\}/, 'ölçek sınırı yok');
  const m = /const OLCEK_SINIRI = ([\d.]+);/.exec(tx);
  assert.ok(m, 'sınır sabiti yok');
  const v = Number(m[1]);
  // Ölçeklemeyi TAMAMEN kapatmak da yanlış: büyük yazıya ihtiyacı olan
  // kullanıcı onu kaybeder.
  assert.ok(v > 1, `ölçekleme kapatılmış (${v})`);
  assert.ok(v <= 1.6, `sınır çok yüksek (${v}) — sabit yükseklikli kaplar taşar`);
  // Çağıran ekran kendi değerini geçebilmeli.
  assert.match(
    tx,
    /maxFontSizeMultiplier=\{OLCEK_SINIRI\}\s*\n\s*\{\.\.\.rest\}/,
    'geçersiz kılınamıyor',
  );
});
