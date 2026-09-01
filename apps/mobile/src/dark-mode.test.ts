import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lightColors } from './theme.palette';

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

test('P1 — acil kart yüzeyi TEMADAN BAĞIMSIZ ve yazı okunuyor', () => {
  const h = kodu('src/ui/HomeUrgent.tsx');
  // Zemin tema token'ı OLMAMALI: `rose`/`accent` koyu temada açık renge
  // dönüyor ve beyaz yazı 2,27:1'e düşüyordu.
  assert.doesNotMatch(h, /cardCritical: \{ backgroundColor: colors\./, 'zemin hâlâ temaya bağlı');
  assert.doesNotMatch(h, /cardCalm: \{ backgroundColor: colors\./, 'zemin hâlâ temaya bağlı');

  // Değer literal ya da SABİT PALET başvurusu olabilir. `lightColors` aktif
  // temaya bağlı değildir (dönmez) ama marka değişince onunla değişir —
  // aranan bağımsızlığı bozmadan sızıntıyı kapatır. Desen ikisini de tanımalı,
  // yoksa test sessizce hiçbir şey ölçmez.
  const coz = (v: string): string => {
    const m = /^lightColors\.(\w+)$/.exec(v.trim());
    return m ? (lightColors as Record<string, string>)[m[1]!]! : v.replace(/'/g, '').trim();
  };
  const oku = (ad: string): string => {
    const m = new RegExp(`const ${ad} = ([^;]+);`).exec(h);
    assert.ok(m, `${ad} tanımlı değil`);
    return coz(m![1]!);
  };
  const kritik = [null, oku('ACIL_KRITIK')];
  const sakin = [null, oku('ACIL_SAKIN')];

  // Beyaz yazı: 20pt başlık (eşik 3,0) VE 15pt sayaç (eşik 4,5) → 4,5 alınır.
  for (const [ad, renk] of [
    ['kritik', kritik[1]!],
    ['sakin', sakin[1]!],
  ] as const) {
    const r = kon('#FFFFFF', renk);
    assert.ok(r >= 4.5, `${ad} zeminde beyaz yazı ${r.toFixed(2)}:1 — 4,5 altı`);
  }
});

test('P1b — CTA yazısı beyaz düğme üstünde okunuyor', () => {
  // Raporumda KAÇIRDIĞIM bulgu: yalnız kart zeminini ölçmüş, CTA yazısını
  // ölçmemiştim. Dört kombinasyondan ÜÇÜ eşiğin altındaydı.
  const h = kodu('src/ui/HomeUrgent.tsx');
  assert.doesNotMatch(h, /color: urgent\.critical \? colors\./, "CTA hâlâ tema token'ı kullanıyor");
  for (const m of h.matchAll(/const ACIL_\w+ = '(#[0-9A-Fa-f]{6})'/g)) {
    const r = kon(m[1]!, '#FFFFFF');
    assert.ok(r >= 4.5, `CTA rengi ${m[1]} beyaz üstünde ${r.toFixed(2)}:1`);
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
