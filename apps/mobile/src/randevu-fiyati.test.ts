import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { randevuFiyatiYazisi } from './data';

/**
 * BELİRLENMEMİŞ RANDEVU FİYATI "₸0" DEĞİL.
 *
 * Hizmet listesi olmayan uzmandan randevu istendiğinde tutar
 * hesaplanamıyor. İki ayrı hata vardı: ekranda "₸0" yazıyordu (bu iş
 * bedava demek) ve KAYDA ekranda gösterilenden BAŞKA bir sayı
 * yazılıyordu (`toplamTutar || pro.priceFrom`).
 */

const oku = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');

test('SIFIR fiyat "bedava" diye gösterilmiyor', () => {
  assert.equal(randevuFiyatiYazisi(0, 'Fiyatı uzman belirleyecek'), 'Fiyatı uzman belirleyecek');
  assert.equal(randevuFiyatiYazisi(-1, 'X'), 'X', 'negatif de fiyat sayılıyor');
});

test('GERÇEK fiyat olduğu gibi yazılıyor', () => {
  const yazi = randevuFiyatiYazisi(9000, 'X');
  // Binlik ayracı çalışma ortamına göre boşluk ya da kırılmaz boşluk olabilir.
  assert.match(yazi.replace(/\s/gu, ''), /₸9000/);
});

test('KAYDEDİLEN fiyat EKRANDA GÖSTERİLENLE aynı', () => {
  /*
   * `toplamTutar || Number(pro.priceFrom)` yazıyordu: ekran seçili
   * hizmetlerin toplamını gösterirken kayda uzmanın en ucuz hizmetinin
   * fiyatı geçiyordu. Kimsenin görmediği bir tutarla randevu açılıyordu.
   */
  for (const yol of [
    ['app', 'booking', 'schedule.tsx'],
    ['app', 'professional', '[id].tsx'],
  ]) {
    const k = oku(...yol);
    assert.doesNotMatch(
      k,
      /\|\| Number\(pro\.priceFrom\)/,
      `${yol.join('/')}: yedek fiyat duruyor`,
    );
  }
});

test('MÜŞTERİ ve UZMAN aynı yazıyı görüyor', () => {
  /*
   * Müşterinin listesinde "Fiyatı uzman belirleyecek" yazarken uzmanın
   * taleplerinde "₸0" yazsaydı, ikisi aynı randevu için başka şey okurdu.
   */
  for (const yol of [
    ['app', '(tabs)', 'bookings.tsx'],
    ['app', 'booking', 'confirmed.tsx'],
    ['app', 'seller', 'requests.tsx'],
  ]) {
    const k = oku(...yol);
    assert.match(k, /randevuFiyatiYazisi\(/, `${yol.join('/')}: ortak kural kullanılmıyor`);
  }
});
