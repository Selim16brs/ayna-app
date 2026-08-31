import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * AÇILIŞ MALİYETİ.
 *
 * Kurucu bildirdi: _"uygulamanın açılışı ve işlem yapma hızı inanılmaz yavaş.
 * uygulama açıldığında ya da bir işlem yapıldığında yaklaşık 10 saniye
 * bekliyor."_
 *
 * Ölçtüm: sunucu Amsterdam'da (`x-railway-edge: ams1`), kullanıcılar
 * Kazakistan'da. Hiç iş yapmayan bir 401 bile benim konumumdan ~0,5 sn;
 * Almatı'dan bunun katı. Yani her AĞ TURU pahalı ve tur SAYISI belirleyici.
 *
 * `loadContent` DÖRT tur yapıyordu: makale/tema/config grubu, sonra sırayla
 * W2W gönderileri, `/me` ve duyurular. Üstelik `/me` `refreshMembership`
 * tarafından da çağrılıyordu — açılışta iki özdeş istek.
 *
 * Bu test tur sayısını ve yinelenmeyi koruyor. Sunucu bölgesi ürün/altyapı
 * kararı; kod tarafında yapılabilecek olan tur sayısını düşük tutmaktır.
 */

const store = readFileSync(join(import.meta.dirname, 'store.ts'), 'utf8');
const layout = readFileSync(join(import.meta.dirname, '..', 'app', '_layout.tsx'), 'utf8');

/** `ad: async () => { ... }` gövdesini süslü parantez eşleyerek çıkarır. */
function govde(ad: string): string {
  const m = new RegExp(`\\n      ${ad}: async \\(\\) => \\{`).exec(store);
  if (!m) return '';
  let d = 0;
  for (let i = m.index + m[0].length - 1; i < store.length; i++) {
    if (store[i] === '{') d++;
    else if (store[i] === '}') {
      d--;
      if (d === 0) return store.slice(m.index + m[0].length - 1, i + 1);
    }
  }
  return '';
}

/** Açılışta `void x()` ile tetiklenen mağaza eylemleri. */
const acilis = [...layout.matchAll(/void (\w+)\(\)/g)].map((m) => m[1]);

test('açılışta çağrılan eylemler gerçekten var', () => {
  assert.ok(acilis.length >= 8, `yalnız ${acilis.length} eylem — tarama daralmış`);
});

test('açılış yolunda SIRALI istek zinciri yok', () => {
  // Her `await api.x()` ayrı bir gidiş-dönüş. Aynı fonksiyonda ikiden fazlası
  // üst üste binen turlar demek: Almatı'dan tur başına ~1,5 sn.
  const ihlal: string[] = [];
  for (const ad of new Set(acilis)) {
    const g = govde(ad);
    if (!g) continue;
    const sirali = [...g.matchAll(/await api\s*\.\s*\w+/g)].length;
    if (sirali > 1) ihlal.push(`${ad} (${sirali} sıralı istek)`);
  }
  assert.deepEqual(
    ihlal,
    [],
    `Açılışta sıralı istek zinciri:\n  ${ihlal.join('\n  ')}\n` +
      'Promise.allSettled ile tek tura indir.',
  );
});

test('açılışta AYNI uç iki kez çağrılmıyor', () => {
  // `/me` hem loadContent hem refreshMembership tarafından çağrılıyordu.
  const sayac = new Map<string, string[]>();
  for (const ad of new Set(acilis)) {
    for (const m of govde(ad).matchAll(/\bapi\s*\.\s*(\w+)/g)) {
      const l = sayac.get(m[1]) ?? [];
      if (!l.includes(ad)) l.push(ad);
      sayac.set(m[1], l);
    }
  }
  const yinelenen = [...sayac.entries()].filter(([, yer]) => yer.length > 1);
  assert.deepEqual(
    yinelenen.map(([uc, yer]) => `${uc} → ${yer.join(', ')}`),
    [],
    'Açılışta yinelenen istek var — biri diğerinin sonucunu kullanmalı.',
  );
});

test('loadContent tek turda çekiyor', () => {
  const g = govde('loadContent');
  assert.ok(g, 'loadContent bulunamadı');
  // Tek `allSettled` grubu: makale + tema + config + W2W + duyuru.
  const gruplar = [...g.matchAll(/await Promise\.allSettled\(\[/g)].length;
  assert.equal(gruplar, 1, `${gruplar} paralel grup — dördü tek turda olmalı`);
  // Grubun içinde beş uç olmalı; azalırsa biri sıralıya kaçmış demektir.
  const grup = /await Promise\.allSettled\(\[([\s\S]*?)\]\)/.exec(g);
  assert.ok(grup, 'paralel grup okunamadı');
  const uc = [...grup[1].matchAll(/api\s*\.\s*\w+/g)].length;
  assert.ok(uc >= 5, `grupta ${uc} uç var, en az 5 bekleniyordu`);
});

test('font yüklemesi açılışı BLOKLAMIYOR', () => {
  // Bloklarsa asset asılı kaldığında uygulama sonsuza kadar beyaz kalır.
  assert.doesNotMatch(layout, /const \[\w+\] = useFonts\(/, 'font sonucu bekleniyor');
  assert.doesNotMatch(layout, /if \(!fontsLoaded\)/, 'font yüklenene kadar çizim durduruluyor');
});
