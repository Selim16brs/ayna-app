import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * PANELDEN GİRİLEN İÇERİK KULLANICININ DİLİNDE GÖSTERİLİYOR MU.
 *
 * Kurucu: "admin panelinden öne çıkanlar ve fırsatlar eklendiğinde 3
 * dilde giriş izni var ama uygulamada gösterirken yazılan yazılar
 * kullanıcının uygulama kullandığı dile göre değişmiyor."
 *
 * Zincir üç halkalıydı ve hepsi doğruydu: panel üç dili kaydediyor,
 * sunucu `?locale=` ile çözüyor, istemci `?locale=` gönderiyor. Kırık
 * halka DÖRDÜNCÜSÜYDÜ — ÖNBELLEK. Anahtar `['ads']` gibi sabit olduğu
 * için dil değişince TanStack Query aynı satırı bulup eski dildeki
 * cevabı veriyor, yeniden istek de atmıyordu.
 */

const oku = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');
const katalog = oku('src', 'catalog.ts');
const api = oku('src', 'api.ts');

/** Sunucusu dile göre içerik çözen uçlar. */
const DILE_BAGLI = ['campaigns', 'offers', 'ads', 'collections'] as const;

test('DİLE BAĞLI her ucun önbellek anahtarında DİL var', () => {
  for (const uc of DILE_BAGLI) {
    assert.ok(
      katalog.includes(`dilliAnahtar('${uc}', locale)`),
      `'${uc}' önbellek anahtarında dil yok — dil değişince eski metin kalır`,
    );
    assert.ok(
      !new RegExp(`queryKey: \\['${uc}'\\]`).test(katalog),
      `'${uc}' hâlâ dilsiz sabit anahtar kullanıyor`,
    );
  }
});

test('İSTEMCİ bu uçlara dili GÖNDERİYOR', () => {
  // Anahtar değişse bile istek dili taşımazsa sunucu Türkçe döner.
  for (const uc of DILE_BAGLI) {
    assert.ok(
      new RegExp(`/${uc}[^\`]*\\$\\{localeQuery\\(\\)\\}`).test(api),
      `'${uc}' isteği dili taşımıyor`,
    );
  }
});

test('DİLDEN BAĞIMSIZ uçlara dil EKLENMEDİ', () => {
  /*
   * Her anahtara dil koymak, dil değiştiğinde dilden bağımsız uçları da
   * boşuna yeniden çektirirdi. `professionals` sunucuda `?locale=`
   * almıyor: anahtarı sabit kalmalı.
   */
  assert.match(katalog, /queryKey: \['professionals'\]/, 'dilsiz uca dil eklenmiş');
});

test('BLOG ve HAFTALIK TEMA dil değişince yeniden çekiliyor', () => {
  /*
   * Bunlar React Query'de değil, mağazanın `loadContent`inde. Etkinin
   * bağımlılığında dil yoktu: dili değiştiren kullanıcı eski dildeki
   * yazıları görmeye devam ediyordu.
   */
  const layout = oku('app', '_layout.tsx');
  assert.match(
    layout,
    /void loadContent\(\);\s*\n\s*\}, \[loadContent, currentUser, locale\]\);/,
    'dil değişince içerik yenilenmiyor',
  );
});

// ── KART ORANLARI — kurucunun isteği ────────────────────────────────────

test('ÖNE ÇIKANLAR yatay, FIRSATLAR dikey', () => {
  const kesfet = oku('app', '(tabs)', 'discover.tsx');
  const oneCikan = kesfet.slice(kesfet.indexOf('{featured.map('), kesfet.indexOf('FIRSATLAR'));
  assert.match(oneCikan, /oran="yatay"/, 'öne çıkanlar dikey kalmış');

  const firsatlar = kesfet.slice(
    kesfet.indexOf('{firsatReklamlari.map('),
    kesfet.indexOf('BU HAFTA TREND'),
  );
  assert.doesNotMatch(firsatlar, /oran="yatay"/, 'fırsatlar da yataya çevrilmiş');

  // Yatay kart GERÇEKTEN yatay: genişlik > yükseklik.
  const y = /vitrinKartYatay: \{\s*width: (\d+),\s*height: (\d+),/.exec(kesfet);
  assert.ok(y, 'yatay kart ölçüsü bulunamadı');
  assert.ok(Number(y![1]) > Number(y![2]), 'yatay kart aslında dikey');

  const d = /vitrinKart: \{[\s\S]*?width: (\d+),\s*height: (\d+),/.exec(kesfet);
  assert.ok(d, 'dikey kart ölçüsü bulunamadı');
  assert.ok(Number(d![2]) > Number(d![1]), 'fırsat kartı dikey değil');
});
