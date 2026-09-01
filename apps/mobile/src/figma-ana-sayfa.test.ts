import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ANA SAYFA — Figma tasarımının BÖLÜM SIRASI ve ölçüleri.
 *
 * Kurucu "birebir" dedi. Bir bölüm kayarsa ya da düşerse ekran sessizce
 * eski düzene döner — testin yakaladığı şey bu.
 */
const d = readFileSync(join(import.meta.dirname, '..', 'app', '(tabs)', 'discover.tsx'), 'utf8');

test('bölümler Figma SIRASIYLA duruyor', () => {
  const sira = [
    "t('home.greeting')", // welcome-vip-area
    "t('home.search')", // search-container
    'HIZLI_EYLEMLER.map', // quick-action-strip
    "t('home.services')", // service-icons-strip
    "t('home.refund.title')", // deposit-refund-banner
    "t('home.pending')", // appointment-card-container
    "t('home.featured')", // curated-section
    "t('home.campaigns')", // firsatlar-section
    "t('home.trend')", // trends-section
    "t('home.nearby')", // salons-section
  ];
  let onceki = -1;
  for (const p of sira) {
    const i = d.indexOf(p);
    assert.ok(i > 0, `bölüm yok: ${p}`);
    assert.ok(i > onceki, `bölüm sırası bozuk: ${p}`);
    onceki = i;
  }
});

test('Figma ölçüleri YUVARLANMAMIŞ', () => {
  // Bu sayılar tasarımdan okundu; 4/8'e yuvarlamak tasarımı bozar.
  // Biçimden bağımsız: Prettier değerleri satırlara bölebiliyor.
  const stil = (ad: string): string => {
    const i = d.indexOf(`    ${ad}: {`);
    assert.ok(i > 0, `${ad} stili yok`);
    return d.slice(i, d.indexOf('\n    },', i));
  };
  for (const [ad, degerler] of [
    ['hizliKart', ['height: 140', 'borderRadius: 16']],
    ['vitrinKart', ['width: 260', 'height: 200', 'borderRadius: 20']],
    ['ikonKart', ['width: 64', 'height: 64', 'borderRadius: 18']],
    ['salonFoto', ['width: 64', 'height: 64', 'borderRadius: 12']],
    ['randevuKart', ['borderRadius: 24']],
    ['arama', ['borderRadius: 12', 'paddingHorizontal: 14']],
    ['iadeKart', ['borderRadius: 20', 'padding: 16']],
  ] as const) {
    const govde = stil(ad);
    for (const d2 of degerler) {
      assert.ok(govde.includes(d2), `${ad}: "${d2}" — ölçü tasarımdan sapmış`);
    }
  }
});

test('"Senin İçin Seçtiklerimiz" ÜCRETLİ vitrinden besleniyor', () => {
  // Kurucu: bu bölüm bizim "Öne çıkanlar" ücretli alanımız.
  const i = d.indexOf("t('home.featured')");
  const blok = d.slice(i, i + 700);
  assert.match(blok, /featured\.map/, 'vitrin kaynağı bağlı değil');
  assert.match(blok, /sponsored/, 'ücretli yerleşim sponsorlu etiketsiz');
});

test('ALT MENÜ bizimki kalıyor — Figma’nın sekme çubuğu kopyalanmadı', () => {
  // Kurucu: "sadece alt menü bizim şu anki hâliyle kalsın."
  assert.ok(!/bottom-tab-bar|tabs-row/.test(d), 'Figma sekme çubuğu ekrana girmiş');
  assert.match(d, /TAB_BAR_CLEARANCE/, 'yüzen alt menü için boşluk bırakılmamış');
});

test('YAZI TİPİ uygulamanın kendi ailesi', () => {
  // Figma Inter + DM Sans kullanıyor; kurucu Onest kalsın dedi.
  assert.ok(!/Inter|DM_?Sans/.test(d), 'Figma yazı tipi ekrana sızmış');
  assert.match(d, /font\.(semibold|regular|medium)/, 'tipografi token kullanmıyor');
});
