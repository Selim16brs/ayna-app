import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { darkColors, lightColors } from './theme.palette';

/**
 * KOYU MODDA OKUNURLUK.
 *
 * Kurucu bildirdi: koyu temada alt menü bembeyaz, ikonlar görünmüyordu.
 *
 * Sebep tek bir hata SINIFIYDI: METİN token'ının ZEMİN olarak kullanılması.
 * `colors.ink` açık temada koyu (#261F25), koyu temada AÇIK (#F3ECF0). Zemin
 * olarak kullanılınca yüzey koyu modda bembeyaza dönüyor, üstündeki açık
 * yazı/ikon kayboluyordu. Toast koyu modda tamamen okunmuyordu.
 *
 * Çözüm: ters yüzeyler için kendi token seti (inverse / onInverse /
 * onInverseMuted), iki temada da doğru kontrastla tanımlı.
 */

// ── WCAG bağıl parlaklık ve kontrast oranı ──────────────────────────────────

function kanal(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function parlaklik(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * kanal(r!) + 0.7152 * kanal(g!) + 0.0722 * kanal(b!);
}

/** İki rengin kontrast oranı (1 = aynı, 21 = siyah/beyaz). */
export function kontrast(a: string, b: string): number {
  const [x, y] = [parlaklik(a), parlaklik(b)].sort((m, n) => n - m);
  return (x! + 0.05) / (y! + 0.05);
}

test('kontrast hesabı doğru — siyah/beyaz 21:1', () => {
  assert.ok(Math.abs(kontrast('#000000', '#FFFFFF') - 21) < 0.1);
  assert.equal(Math.round(kontrast('#888888', '#888888')), 1);
});

// ── Ters yüzey: iki temada da okunur olmalı ─────────────────────────────────

// Küçük metin için WCAG AA = 4.5; ikon/büyük metin için AA = 3.0.
const METIN_MIN = 4.5;
const IKON_MIN = 3;

for (const [ad, c] of [
  ['açık', lightColors],
  ['koyu', darkColors],
] as const) {
  test(`${ad} tema: ters yüzey üstündeki metin okunur`, () => {
    const o = kontrast(c.inverse, c.onInverse);
    assert.ok(o >= METIN_MIN, `inverse↔onInverse = ${o.toFixed(2)}:1 (min ${METIN_MIN})`);
  });

  test(`${ad} tema: ters yüzey zeminden ayrışıyor`, () => {
    // Yüzen bar sayfadan ayırt edilebilmeli; aksi hâlde "kayıp" görünür.
    const o = kontrast(c.inverse, c.bg);
    assert.ok(o >= 1.45, `inverse↔bg = ${o.toFixed(2)}:1 — bar zeminde kayboluyor`);
  });

  test(`${ad} tema: gövde metni zeminde okunur`, () => {
    const o = kontrast(c.bg, c.ink);
    assert.ok(o >= METIN_MIN, `bg↔ink = ${o.toFixed(2)}:1`);
  });

  test(`${ad} tema: ikincil metin zeminde okunur`, () => {
    const o = kontrast(c.bg, c.muted);
    assert.ok(o >= IKON_MIN, `bg↔muted = ${o.toFixed(2)}:1`);
  });

  test(`${ad} tema: kart üstündeki metin okunur`, () => {
    assert.ok(kontrast(c.surface, c.ink) >= METIN_MIN);
    assert.ok(kontrast(c.surfaceMuted, c.ink) >= METIN_MIN);
  });

  test(`${ad} tema: accent üstündeki yazı okunur`, () => {
    const o = kontrast(c.accent, c.onAccent);
    assert.ok(o >= IKON_MIN, `accent↔onAccent = ${o.toFixed(2)}:1`);
  });

  test(`${ad} tema: durum renkleri zeminde okunur`, () => {
    for (const k of ['danger', 'success', 'gold'] as const) {
      const o = kontrast(c.bg, c[k]);
      assert.ok(o >= IKON_MIN, `bg↔${k} = ${o.toFixed(2)}:1`);
    }
  });
}

// ── Hata SINIFININ geri gelmesini engelle ───────────────────────────────────

test('METİN token’ı ZEMİN olarak kullanılmıyor', () => {
  // ink/inkSoft temaya göre TERS yönde döner; zemin olarak kullanılırsa
  // yüzey koyu modda beyaza döner ve üstündeki her şey kaybolur.
  const kok = join(import.meta.dirname, '..');
  const ihlal: string[] = [];
  const gez = (dir: string) => {
    for (const ad of readdirSync(dir)) {
      if (ad === 'node_modules' || ad === '.expo') continue;
      const tam = join(dir, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else if (ad.endsWith('.tsx')) {
        const src = readFileSync(tam, 'utf8');
        if (/backgroundColor:\s*colors\.(ink|inkSoft)\b/.test(src)) {
          ihlal.push(tam.slice(kok.length + 1));
        }
      }
    }
  };
  gez(join(kok, 'src'));
  gez(join(kok, 'app'));
  assert.deepEqual(
    ihlal,
    [],
    `METİN rengini zemin yapan dosya(lar): ${ihlal.join(', ')}\n` +
      'Ters yüzey için colors.inverse + colors.onInverse kullan.',
  );
});

/** Yarı saydam beyazı bir zemine bindirir (rgba metinlerin GERÇEK rengi). */
function uzerine(alpha: number, zemin: string): string {
  const h = zemin.replace('#', '');
  const kanallar = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (
    '#' +
    kanallar
      .map((z) => Math.round(alpha * 255 + (1 - alpha) * z))
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

test('plum DOLU YÜZEY: beyaz yazı iki temada da okunuyor', () => {
  // Plum 7 ekranda dolu yüzey olarak kullanılıyor ve üstüne HER ZAMAN beyaz
  // yazı geliyor. Koyu temada accent'i açmak metin/ikon için doğru ama dolu
  // yüzey için değildi: eski '#AA9AC4' üstünde beyaz 2.58:1 ölçülüyordu —
  // yani yedi ekranda okunmayan başlık.
  // `theme.ts` doğrudan import EDİLEMİYOR: react-native'i çekiyor ve test
  // koşucusu onu çeviremiyor. Değerler kaynaktan okunuyor — mevcut testlerin
  // kullandığı yöntemin aynısı.
  const kaynak = readFileSync(join(import.meta.dirname, 'theme.ts'), 'utf8');
  const cift = (blok: string): [string, string] => {
    const b = kaynak.slice(kaynak.indexOf(blok));
    const m = /plum: \['(#[0-9A-Fa-f]{6})', '(#[0-9A-Fa-f]{6})'\]/.exec(b);
    assert.ok(m, `${blok} içinde plum bulunamadı`);
    return [m![1]!, m![2]!];
  };
  for (const [tema, g] of [
    ['açık', cift('export const lightGradients')],
    ['koyu', cift('export const darkGradients')],
  ] as const) {
    for (const zemin of g) {
      assert.ok(
        kontrast('#FFFFFF', zemin) >= 4.5,
        `${tema} tema plum ${zemin}: beyaz başlık ${kontrast('#FFFFFF', zemin).toFixed(2)}:1`,
      );
      // Kartın gövde (.78) ve üst (.70) yazıları da okunmalı.
      for (const a of [0.78, 0.7]) {
        const o = kontrast(uzerine(a, zemin), zemin);
        assert.ok(o >= 4.5, `${tema} tema plum ${zemin}: %${a * 100} beyaz ${o.toFixed(2)}:1`);
      }
    }
  }
});
