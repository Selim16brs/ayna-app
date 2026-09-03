/**
 * TERCİH EDİLEN TARİH — gerçek takvim.
 *
 * Kurucu: "fiyat belirterek teklif alırken bir takvim çıkmalı. tarih
 * seçenekleri kısıtlanmamalı."
 *
 * Eskiden ekranda SABİT DOKUZ ÇİP vardı: üç gün (yarın/öbür gün/üç gün
 * sonra) × üç saat (11:00, 15:00, 18:00). Cumartesi 10:00 isteyen
 * kullanıcının ekranda karşılığı yoktu.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const kok = join(import.meta.dirname, '..');
const ekran = readFileSync(join(kok, 'app/demand/new.tsx'), 'utf8');
const bilesen = readFileSync(join(kok, 'src/ui/TarihSecici.tsx'), 'utf8');

test('sabit gün/saat çipleri KALDIRILDI', () => {
  // Üç günü ve üç saati kodlayan kalıp geri gelmemeli.
  assert.ok(!/\[11, 15, 18\]\.map/.test(ekran), 'sabit saat listesi (11/15/18) geri gelmiş');
  assert.ok(
    !/Array\.from\(\{ length: 3 \}, \(_, d\) =>[\s\S]{0,120}almatySlotMs/.test(ekran),
    'sabit üç günlük liste geri gelmiş',
  );
  assert.match(ekran, /<TarihSecici\b/, 'ekran takvimi kullanmıyor');
});

test('takvim GERÇEK tarih seçici — elle çizilmiş liste değil', () => {
  /*
   * ── BU TEST DEĞİŞTİ ──────────────────────────────────────────────────
   *
   * Eskiden YERLİ (native) seçicinin kullanılmasını şart koşuyordu. Ama o
   * modül tam da sorunun kaynağı çıktı: telefondaki yapı onu içermediğinde
   * tarih 1 Oca 1970'te donuyor ve dokunuşa yanıt vermiyordu — ve
   * `runtimeVersion: sdkVersion` yüzünden OTA bunu çözemiyordu.
   *
   * Şart artık "yerli olsun" değil: GERÇEK BİR TAKVİM olsun ve saat
   * seçilebilsin. Ortak `TakvimSecici` ikisini de saf JS ile veriyor.
   */
  assert.match(bilesen, /<TakvimSecici/, 'gerçek takvim yok');
  assert.match(bilesen, /saatli/, 'saat seçilemiyor');
  assert.equal(
    /@react-native-community\/datetimepicker/.test(bilesen.replace(/\/\*[\s\S]*?\*\//g, '')),
    false,
    'native seçici geri gelmiş',
  );
});

test('İLERİYE doğru sınır YOK', () => {
  /*
   * Kurucunun şartı: "tarih seçenekleri kısıtlanmamalı." Üst sınır koymak
   * (ör. maximumDate) o şartı bozar.
   */
  // Yeni takvimde üst sınırın adı `enCok`; ikisini de arıyoruz ki
  // yeniden adlandırma kuralı sessizce delmesin.
  assert.ok(!/maximumDate|enCok=/.test(bilesen), 'ileriye tarih sınırı konmuş');
});

test('GEÇMİŞ dışarıda — kısıtlama değil geçerlilik', () => {
  // Dün için randevu tercihi göndermek anlamsız; uzman yanıtlayamaz.
  assert.match(bilesen, /enAz=\{new Date\(\)\}/, 'geçmiş tarih seçilebiliyor');
  assert.match(bilesen, /if \(ms <= Date\.now\(\)\) return;/, 'geçmiş an listeye girebiliyor');
});

test('en fazla İKİ tercih — mevcut kural korunuyor', () => {
  // §4.1: uzman ikisinden birini onaylar ya da alternatif önerir.
  assert.match(bilesen, /const EN_FAZLA = 2;/, 'tercih sınırı kaybolmuş');
  assert.match(bilesen, /secilenler\.length >= EN_FAZLA/, 'sınır uygulanmıyor');
});

test('seçilen tarih GERİ ALINABİLİR', () => {
  // Yanlış seçim yapan kullanıcı ekrandan çıkmak zorunda kalmamalı.
  assert.match(bilesen, /const sil = \(ms: number\)/, 'seçim kaldırılamıyor');
});

test('aynı an İKİ KEZ eklenemiyor', () => {
  assert.match(bilesen, /secilenler\.includes\(ms\)/, 'aynı an tekrar eklenebiliyor');
});
