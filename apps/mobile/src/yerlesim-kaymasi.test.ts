import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * YERLEŞİM KAYMASI.
 *
 * Kurucu ekran görüntüsü gönderdi: "kayma var". W2W ekranında AYNA Life
 * kartı soldan taşıyor, gizlilik kartı sağdan kesiliyordu.
 *
 * Sebep: gizlilik kartı YATAY kaydırma şeridinin İÇİNDEYDİ. Tam genişlik
 * bir blok, 220px'lik Life kartlarının yanına diziliyor; şerit alabildiğine
 * uzuyor, kart ekrana sığmıyor, iki kenardan da taşıyor.
 */

const ekranlar = (): string[] => {
  const out: string[] = [];
  const gez = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const t = join(d, e.name);
      if (e.isDirectory()) gez(t);
      else if (e.name.endsWith('.tsx')) out.push(t);
    }
  };
  gez(join(__dirname, '..', 'app'));
  return out;
};

test('YATAY şeritte listeden başka blok kart yok', () => {
  /*
   * Yatay bir şerit yalnız listesini taşımalı. Listenin kapanışından
   * SONRA gelen bir `<View>`/`<Pressable>`, tam genişlik bir kartsa
   * ekranı kaydırır.
   */
  const suclular: string[] = [];
  for (const yol of ekranlar()) {
    const s = readFileSync(yol, 'utf8');
    for (const m of s.matchAll(/<ScrollView\s+horizontal[\s\S]*?<\/ScrollView>/g)) {
      const govde = m[0];
      const sonMap = govde.lastIndexOf('))}');
      if (sonMap < 0) continue;
      const kalan = govde.slice(sonMap + 3, govde.lastIndexOf('</ScrollView>'));
      if (/<(View|Pressable)\b/.test(kalan)) suclular.push(yol.split('/app/')[1]!);
    }
  }
  assert.deepEqual(suclular, [], `yatay şeritte blok kart: ${suclular.join(', ')}`);
});

test('gizlilik kartı ŞERİDİN DIŞINDA ve kendi boşluğu var', () => {
  const s = readFileSync(join(__dirname, '..', 'app', '(tabs)', 'circle.tsx'), 'utf8');
  const serit = /<ScrollView\s+horizontal[\s\S]*?<\/ScrollView>/.exec(s);
  assert.ok(serit, 'yatay şerit bulunamadı');
  assert.doesNotMatch(serit![0], /styles\.gizlilik/, 'gizlilik kartı hâlâ şeridin içinde');
  // Sayfanın dış kabı yatay dolgu taşımıyor; blok kendi vermeli.
  const stil = /gizlilik: \{[\s\S]*?\},/.exec(s);
  assert.ok(stil, 'gizlilik stili yok');
  assert.match(stil![0], /marginHorizontal/, 'kart kenara yapışır — kendi boşluğu yok');
});

test('hizmet ikonları HER YERDE aynı kaynaktan', () => {
  /*
   * Kurucu: "hızmetler ıconları ana sayfadakı gıbı dıger alanlarda da
   * aynı olmalı." Kategori ikonu çizen her ekran ortak eşlemeyi okumalı;
   * Ionicons vektörü kurucunun çizdiği ikon değil.
   */
  for (const ad of [
    '(tabs)/discover.tsx',
    'search.tsx',
    'quote/new.tsx',
    'demand/new.tsx',
    'circle/new.tsx',
    'seller/offline.tsx',
  ]) {
    const s = readFileSync(join(__dirname, '..', 'app', ad), 'utf8');
    // Çizim `ui/HizmetIkonu`'na taşındı; ortak kaynak şartı aynen duruyor.
    assert.match(s, /<HizmetIkonu\b/, `${ad}: ortak ikon bileşenini kullanmıyor`);
  }
});
