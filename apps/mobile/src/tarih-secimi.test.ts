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
  assert.match(bilesen, /from '@react-native-community\/datetimepicker'/, 'yerli seçici yok');
  assert.match(bilesen, /mode="datetime"/, 'saat seçilemiyor');
});

test('İLERİYE doğru sınır YOK', () => {
  /*
   * Kurucunun şartı: "tarih seçenekleri kısıtlanmamalı." Üst sınır koymak
   * (ör. maximumDate) o şartı bozar.
   */
  assert.ok(!/maximumDate/.test(bilesen), 'ileriye tarih sınırı konmuş');
});

test('GEÇMİŞ dışarıda — kısıtlama değil geçerlilik', () => {
  // Dün için randevu tercihi göndermek anlamsız; uzman yanıtlayamaz.
  assert.match(bilesen, /minimumDate=\{new Date\(\)\}/, 'geçmiş tarih seçilebiliyor');
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
