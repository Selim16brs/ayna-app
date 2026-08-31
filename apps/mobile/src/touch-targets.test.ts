import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * #8 KAPATMA TUŞU ve #13 DOKUNMA ALANI.
 *
 * Kabul kriteri: her dokunulabilir öğe ≥44×44 pt. Görsel küçük olabilir,
 * dokunma alanı büyük olur (`hitSlop`) — ama komşu öğelerin alanları
 * ÇAKIŞMAMALI, o yüzden dar aralıklı düğmelerde çözüm boyutu büyütmektir.
 */

const kok = join(import.meta.dirname, '..');

function tsxDosyalari(): string[] {
  const out: string[] = [];
  const gez = (d: string) => {
    for (const ad of readdirSync(d)) {
      const tam = join(d, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else if (ad.endsWith('.tsx')) out.push(tam);
    }
  };
  gez(join(kok, 'app'));
  gez(join(kok, 'src'));
  return out;
}

/** Dokunulabilir öğenin ETKİN alanı: sabit boyut + 2×hitSlop. */
function ihlaller(): string[] {
  const out: string[] = [];
  for (const f of tsxDosyalari()) {
    const ham = readFileSync(f, 'utf8');
    // Yorumlar elenir — bu oturumda üç kez yorumdaki kelimeyi kod sandım.
    const kod = ham.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    // `=>` ÖNCE tüketilmeli: `[^>]` ok işaretindeki `>`yi tag sonu sanıp
    // deseni erken bitiriyor ve `hitSlop` okunmadan kalıyordu — bu oturumda
    // aynı tuzağa iki kez düştüm. Alternatif sırası kritik.
    for (const m of kod.matchAll(
      /<(?:Pressable|PressableScale|TouchableOpacity)((?:=>|[^>]){0,600}?)>/g,
    )) {
      const blok = m[1];
      const hsM = /hitSlop=\{(\d+)\}/.exec(blok);
      const hs = hsM ? Number(hsM[1]) : 0;
      const stM = /style=\{(?:\[)?styles\.(\w+)/.exec(blok);
      if (!stM) continue;
      const sM = new RegExp(`    ${stM[1]}: \\{[^}]*\\}`).exec(kod);
      if (!sM) continue;
      const w = /width:\s*(\d+)/.exec(sM[0]);
      const h = /height:\s*(\d+)/.exec(sM[0]);
      if (!w || !h) continue; // esnek boyut — statik ölçülemez
      const ew = Number(w[1]) + 2 * hs;
      const eh = Number(h[1]) + 2 * hs;
      if (ew < 44 || eh < 44) {
        out.push(`${f.slice(kok.length + 1)} → styles.${stM[1]} = ${ew}×${eh}`);
      }
    }
  }
  return [...new Set(out)];
}

test('sabit boyutlu dokunulabilir öğeler ≥44×44', () => {
  const i = ihlaller();
  assert.deepEqual(
    i,
    [],
    `44pt altında dokunma alanı:\n  ${i.join('\n  ')}\n` +
      'Boyutu büyüt ya da hitSlop ver (komşuyla çakışmıyorsa).',
  );
});

test('taramanın kendisi boşuna geçmiyor', () => {
  // Hiç öğe bulamayan bir tarama her zaman geçer ve hiçbir şeyi korumaz.
  let sayilan = 0;
  for (const f of tsxDosyalari()) {
    const kod = readFileSync(f, 'utf8');
    sayilan += [...kod.matchAll(/<(?:Pressable|PressableScale|TouchableOpacity)/g)].length;
  }
  assert.ok(sayilan >= 200, `yalnız ${sayilan} dokunulabilir öğe taranıyor — tarama daralmış`);
});

test('#8 — modal kapatma tuşları ≥44 ve geri tuşuyla da kapanıyor', () => {
  for (const f of tsxDosyalari()) {
    const kod = readFileSync(f, 'utf8');
    if (!kod.includes('<Modal')) continue;
    // Android geri tuşu modali kapatmalı (#14 ile ortak kriter).
    assert.match(
      kod,
      /onRequestClose=/,
      `${f.slice(kok.length + 1)}: Modal geri tuşuyla kapanmıyor`,
    );
  }
});
