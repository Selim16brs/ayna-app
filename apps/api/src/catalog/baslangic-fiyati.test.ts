import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Professional } from '@prisma/client';
import { baslangicFiyati } from './catalog.service';

/**
 * "…₸'DEN BAŞLAYAN" FİYAT GERÇEK HİZMETLERDEN.
 *
 * Canlıda görülen durum: hizmetleri 7.000–60.000 ₸ olan uzmanın kartında
 * `priceFrom: 0` yazıyordu. Sebep `Professional.priceFrom` sütununun
 * kayıtta bir kez yazılıp sonradan eklenen hizmetlerde güncellenmemesi.
 * Üst sınır zaten hizmetlerden hesaplanıyordu; alt sınır sütunda kalmıştı.
 */

const pro = (servicesJson: string, priceFrom = 0) =>
  ({ servicesJson, priceFrom }) as unknown as Professional;

test('EN UCUZ HİZMET başlangıç fiyatı', () => {
  const p = pro(
    JSON.stringify([
      { serviceId: 'hair.haircut', name: 'Kesim', price: 9000, durationMin: 60 },
      { serviceId: 'hair.blowdry', name: 'Fön', price: 7000, durationMin: 45 },
    ]),
  );
  assert.equal(baslangicFiyati(p), 7000, 'sütundaki 0 hâlâ okunuyor');
});

test('HİZMETİ OLMAYAN uzmanda sütun yedek kalıyor', () => {
  /*
   * Hizmet listesi boşsa söylenecek gerçek bir alt sınır yok; kayıtta
   * girilen değer tek bilgi. Sıfırsa mobil zaten fiyatı hiç yazmıyor.
   */
  assert.equal(baslangicFiyati(pro('[]', 12000)), 12000);
  assert.equal(baslangicFiyati(pro('bozuk json', 0)), 0);
});

test('BEDELSİZ satır alt sınırı sıfıra ÇEKMİYOR', () => {
  /*
   * Fiyatı 0 olan bir satır (eski kayıt) listeye girerse "0 ₸'den
   * başlayan" yazardı — uzmanın hiç söylemediği bir fiyat.
   */
  const p = pro(
    JSON.stringify([
      { serviceId: 'hair.haircut', name: 'Kesim', price: 0, durationMin: 60 },
      { serviceId: 'hair.blowdry', name: 'Fön', price: 7000, durationMin: 45 },
    ]),
  );
  assert.equal(baslangicFiyati(p), 7000);
});
