import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { kk, ru, tr } from '@ayna/i18n';
import { emGenisligiFabrikasi } from './font-olcu';

/**
 * CANLI ÖZET ETİKETLERİ KELİMENİN ORTASINDAN BÖLÜNMÜYOR.
 *
 * Kurucunun ekran görüntüsünde ortadaki kutuda "Tamamlana / n" yazıyordu:
 * sözcük kutuya sığmayınca React Native onu HARFİNDEN bölüyor.
 *
 * Ölçü tahmin değil — glif genişlikleri fonttan okunuyor; çeviri uzarsa ya
 * da dolgu değişirse test kendisi yeniden ölçer.
 */

const emGenisligi = emGenisligiFabrikasi(
  join(__dirname, '..', 'assets', 'fonts', 'Onest-Regular.ttf'),
);
const ekran = readFileSync(join(__dirname, '..', 'app', 'seller', 'reports.tsx'), 'utf8');

/** Ölçüler KAYNAKTAN: elle yazsaydım stil değişince test eskiyi ölçerdi. */
const say = (kalip: RegExp): number => Number(kalip.exec(ekran)?.[1]);
const KART_KENAR = say(/ozetKart: \{ marginHorizontal: (\d+)/);
const KART_DOLGU = say(/ozetKart: \{[^}]*padding: (\d+)/);
const KUTU_ARA = say(/ozetKutular: \{[^}]*gap: (\d+)/);
const KUTU_DOLGU = say(/ozetKutu: \{[^}]*paddingHorizontal: (\d+)/);
const AYRAC = say(/ozetAyrac: \{ width: (\d+)/);
const PUNTO = say(/ozetEtiket: \{[^}]*fontSize: (\d+)/);

/** En dar yaygın iPhone (SE/mini). Daha genişte zaten sığar. */
const EKRAN = 375;

test('ÖLÇÜLER kaynaktan okunabildi', () => {
  // Okunamayan ölçü NaN yapar; karşılaştırma sessizce false döner ve test
  // hiçbir şey sınamadan geçerdi.
  for (const [ad, v] of [
    ['kart kenarı', KART_KENAR],
    ['kart dolgusu', KART_DOLGU],
    ['kutu arası', KUTU_ARA],
    ['kutu dolgusu', KUTU_DOLGU],
    ['ayraç', AYRAC],
    ['punto', PUNTO],
  ] as const) {
    assert.ok(Number.isFinite(v), `${ad} kaynaktan okunamadı`);
  }
});

test('ÜÇ DİLDE de etiket kutuya SIĞIYOR', () => {
  const kartIc = EKRAN - KART_KENAR * 2 - KART_DOLGU * 2;
  // Üç kutu + aralarında iki ayraç ve dört boşluk (gap her komşu arasında).
  const kutu = (kartIc - AYRAC * 2 - KUTU_ARA * 4) / 3;
  const yaziAlani = kutu - KUTU_DOLGU * 2;
  const tasan: string[] = [];
  for (const [dil, sozluk] of [
    ['tr', tr],
    ['kk', kk],
    ['ru', ru],
  ] as const) {
    for (const anahtar of [
      'reports.live.upcoming',
      'reports.live.completed',
      'reports.live.noshow',
    ] as const) {
      const metin = sozluk[anahtar];
      // Anahtar sözlükte YOKSA test sessizce geçmesin: eksik çeviri de bir
      // hatadır ve dil bütünlüğü testi ayrıca yakalar, burada da susmayalım.
      assert.ok(metin, `${dil}: ${anahtar} çevirisi yok`);
      const genislik = emGenisligi(metin) * PUNTO;
      if (genislik > yaziAlani)
        tasan.push(`${dil} "${metin}" ${genislik.toFixed(1)}pt > ${yaziAlani.toFixed(1)}pt`);
    }
  }
  assert.deepEqual(tasan, [], 'bu etiketler kelimenin ortasından bölünür');
});
