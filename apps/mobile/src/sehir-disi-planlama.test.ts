/**
 * BAŞKA ŞEHRE ÖNCEDEN PLANLAMA.
 *
 * Kurucunun senaryosu: "Almatı'da yaşayan biriyim, bugün 3 Eylül ve 5
 * Eylül'de Astana'ya gideceğim. Daha Astana'ya gitmeden Almatı'da
 * uygulamayı açıyorum ve oradan Astana'daki istediğim lokasyondaki
 * uzmanları görüp rezervasyon yapmak istiyorum."
 *
 * Bu akışın çalışması için dört şey gerekiyor:
 *   1. Haritada BAŞKA şehir seçilebilmeli (kullanıcının kaydına kilitli
 *      olmamalı).
 *   2. O şehir içinde BÖLGE daraltılabilmeli.
 *   3. Listeye geçince seçim KAYBOLMAMALI.
 *   4. Mesafe YALAN SÖYLEMEMELİ — bin kilometre uzaktaki birine
 *      "senden 2,5 km" denemez.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bolgeAdi } from './bolge-adi';

const kok = join(import.meta.dirname, '..');
const harita = readFileSync(join(kok, 'app/map.tsx'), 'utf8');
const arama = readFileSync(join(kok, 'app/search.tsx'), 'utf8');
const tr = readFileSync(join(kok, '../../packages/i18n/src/messages/tr.ts'), 'utf8');
const ru = readFileSync(join(kok, '../../packages/i18n/src/messages/ru.ts'), 'utf8');

test('1 · harita başka şehre geçebiliyor', () => {
  assert.match(harita, /const \[city, setCity\] = useState\(varsayilanSehir\)/, 'şehir sabit');
});

test('2 · seçilen şehirde bölge daraltılabiliyor', () => {
  assert.match(harita, /bolgeAdiOf\(p\) === bolge/, 'haritada bölge süzgeci yok');
  assert.match(
    arama,
    /bolgeAdi\(p\.district, p\.city\) !== filtre\.bolge/,
    'aramada bölge süzgeci yok',
  );
});

test('3 · haritadan listeye geçince SEÇİM KORUNUYOR', () => {
  /*
   * Liste düğmesi parametresiz gidiyordu; arama kullanıcının KENDİ şehrine
   * sıfırlanıyor, Astana bağlamı kayboluyordu.
   */
  assert.match(
    harita,
    /\/search\?sehir=\$\{encodeURIComponent\(city\)\}/,
    'şehir listeye taşınmıyor',
  );
  assert.match(
    harita,
    /bolge \? `&bolge=\$\{encodeURIComponent\(bolge\)\}`/,
    'bölge listeye taşınmıyor',
  );
  assert.match(arama, /typeof sehir === 'string' && sehir/, 'arama gelen şehri devralmıyor');
  assert.match(arama, /typeof bolge === 'string' && bolge/, 'arama gelen bölgeyi devralmıyor');
});

test('3b · iki ekran AYNI bölge adını üretiyor', () => {
  /*
   * Haritadaki seçim listede de eşleşmeli. Ayrı normalizasyon kullanılsaydı
   * haritadan gelen bölge listede boş sonuç verirdi.
   */
  assert.equal(bolgeAdi('Astana · Esil', 'Astana'), 'Esil');
  assert.equal(bolgeAdi('Esil', 'Astana'), 'Esil');
  assert.match(harita, /from '\.\.\/src\/bolge-adi'/, 'harita ortak modülü kullanmıyor');
  assert.match(arama, /from '\.\.\/src\/bolge-adi'/, 'arama ortak modülü kullanmıyor');
});

test('4 · mesafe "senden" demiyor — konum hiç sorulmuyor', () => {
  /*
   * Uygulama konum izni İSTEMİYOR; mesafe her zaman şehir merkezinden
   * ölçülüyor. "senden X km" hiçbir zaman doğru değildi ve bu senaryoda
   * apaçık yanlışa dönüyor.
   */
  assert.ok(!/'map\.distance': '[^']*uzakta'/.test(tr), 'TR etiketi hâlâ "uzakta" diyor');
  assert.ok(!/'map\.distance': '[^']*от вас'/.test(ru), 'RU etiketi hâlâ "от вас" diyor');
  assert.match(tr, /'map\.distance': 'km merkeze'/, 'TR etiketi merkezi söylemiyor');
  assert.match(ru, /'map\.distance': 'км от центра'/, 'RU etiketi merkezi söylemiyor');
});

test('şehir değişince bölge DÜŞÜYOR — iki ekranda da', () => {
  // Almatı'nın Medeu'su Astana'da yok; eski seçim listeyi boşaltırdı.
  assert.match(harita, /setCity\(ad\);\s*\n\s*setBolge\(null\);/, 'haritada bölge kalıyor');
  assert.match(arama, /yama\(\{ sehir: c, bolge: null \}\)/, 'aramada bölge kalıyor');
});
