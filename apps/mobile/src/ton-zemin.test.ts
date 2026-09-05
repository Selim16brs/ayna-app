import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * YAZI TONU ile ZEMİN BİRBİRİNİ TUTMALI.
 *
 * Kurucu bildirdi: "telefon doğrulama ekranında yazılar gözükmüyor."
 * Sebep şuydu: `auth/verify` ve `auth/forgot` ekranlarındaki bilgi kartı bir
 * ara "dolu koyu durmasının bir sebebi yok" diye `heroSoft` zeminine
 * çevrilmiş, ama İÇİNDEKİ yazıların tonu `onAccent` kalmıştı.
 *
 * `onAccent` KOYU zemin için üretilmiş bir ton — açık temada bembeyaz
 * (#FFFFFF). Beyaz yazı #F6ECF4 üstünde 1.06:1 veriyor, yani hiç okunmuyor.
 * Koyu temada da ters yönden aynı hata: orada `onAccent` koyu (#1A0810) ve
 * zemin de koyu.
 *
 * Bu bir SINIF hatası: zemin rengi değiştirilirken üstündeki yazının tonunu
 * güncellemeyi unutmak. Tarama, `onAccent` yazının AÇIK bir zemin üstünde
 * durduğu her yeri yakalıyor.
 */

const appKok = join(import.meta.dirname, '..', 'app');
const uiKok = join(import.meta.dirname, 'ui');

/** Paletin AÇIK yüzeyleri — `onAccent` bunların üstünde okunmaz. */
const ACIK_ZEMINLER = new Set([
  'heroSoft',
  'surface',
  'surfaceMuted',
  'bg',
  'bgSunken',
  'roseSoft',
  'sageSoft',
  'lavenderSoft',
  'blueSoft',
  'goldSoft',
  'accentSoft',
  'fadeFrom',
  'fadeMid',
]);

function tsxDosyalari(kok: string): string[] {
  const out: string[] = [];
  const gez = (dir: string) => {
    for (const ad of readdirSync(dir)) {
      const tam = join(dir, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else if (ad.endsWith('.tsx')) out.push(tam);
    }
  };
  gez(kok);
  return out;
}

test('AÇIK zeminde `onAccent` yazı yok', () => {
  const ihlal: string[] = [];
  for (const yol of [...tsxDosyalari(appKok), ...tsxDosyalari(uiKok)]) {
    const src = readFileSync(yol, 'utf8');
    if (!src.includes('tone="onAccent"')) continue;
    const satirlar = src.split('\n');
    satirlar.forEach((l, i) => {
      if (!l.includes('tone="onAccent"')) return;
      /*
       * Yazıyı SARAN en yakın `styles.X` yukarı doğru aranıyor. Kusursuz bir
       * JSX ağacı çözümlemesi değil — ama bu kod tabanında yazı, kabının
       * birkaç satır altında duruyor ve hatayı yakalamaya yetiyor.
       */
      let kap: string | null = null;
      for (let j = i; j > Math.max(0, i - 12); j -= 1) {
        const m = /style=\{(?:\[)?styles\.(\w+)/.exec(satirlar[j] as string);
        if (m) {
          kap = m[1] as string;
          break;
        }
      }
      if (!kap) return;
      const sm = new RegExp(`\\b${kap}: \\{[^}]*backgroundColor: colors\\.(\\w+)`, 's').exec(src);
      if (sm && ACIK_ZEMINLER.has(sm[1] as string)) {
        ihlal.push(
          `${yol.split('/apps/mobile/')[1]}:${i + 1} — styles.${kap} zemini colors.${sm[1]}`,
        );
      }
    });
  }
  assert.deepEqual(
    ihlal,
    [],
    `AÇIK zemin üstünde \`onAccent\` yazı (okunmaz):\n  ${ihlal.join('\n  ')}\n` +
      'Açık zeminde `ink` / `inkSoft` kullanılmalı.',
  );
});

test('TARAMA gerçekten bir şeye bakıyor', () => {
  // `onAccent` hiç kullanılmıyorsa yukarıdaki test boşuna geçer.
  const kullanan = [...tsxDosyalari(appKok), ...tsxDosyalari(uiKok)].filter((y) =>
    readFileSync(y, 'utf8').includes('tone="onAccent"'),
  );
  assert.ok(
    kullanan.length >= 5,
    `yalnız ${kullanan.length} dosya taranıyor — desen değişmiş olabilir`,
  );
});
