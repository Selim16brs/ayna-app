import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACILIS_MESAJLARI } from './mesajlar.js';
import { acilisMesajiSec, BOS_DURUM } from './secim.js';
import { gecerliKatalog, kosulsuz, uzakKatalogAyikla } from './uzak.js';

const gecerliMesaj = {
  id: 'uzak_01',
  grup: 'A',
  etiket: 'neutral',
  metin: { tr: 'Merhaba', kk: 'Сәлем', ru: 'Привет' },
};
const ikinci = { ...gecerliMesaj, id: 'uzak_02' };
const yuk = (...mesajlar: unknown[]) => ({ surum: '2026-09-04T10:00:00Z', mesajlar });

test('GEÇERLİ yük kataloğa dönüşüyor', () => {
  const k = uzakKatalogAyikla(yuk(gecerliMesaj));
  assert.equal(k?.mesajlar.length, 1);
  assert.equal(k?.mesajlar[0]!.metin.kk, 'Сәлем');
});

test('BİR bozuk satır TÜM yükü reddediyor', () => {
  /*
   * Bozuk satırı atlayıp gerisini alsaydık, paneldeki bir yazım hatası
   * bir mesajı sessizce katalogdan düşürürdü. Reddedince cihaz son
   * geçerli kataloğu kullanmaya devam ediyor — kayıp yok, hata görünür.
   */
  const k = uzakKatalogAyikla(yuk(gecerliMesaj, { ...gecerliMesaj, id: 'uzak_02', grup: 'Z' }));
  assert.equal(k, null);
});

test('EKSİK DİL kabul edilmiyor — brief üç dili zorunlu tutuyor', () => {
  for (const eksik of [
    { tr: 'x', kk: 'y' },
    { tr: 'x', kk: 'y', ru: '' },
    { tr: 'x', kk: 'y', ru: '   ' },
  ]) {
    assert.equal(
      uzakKatalogAyikla(yuk({ ...gecerliMesaj, metin: eksik })),
      null,
      JSON.stringify(eksik),
    );
  }
});

test('HEPSİ KOŞULLU olan katalog reddediliyor — ekran boş kalamaz', () => {
  /*
   * Panelde koşulsuz mesajların hepsi pasife alınırsa genel havuz boşalır.
   * Kabul etseydik, koşulların tutmadığı bir anda açılışta BOŞ EKRAN
   * kalırdı. Reddediyoruz: yerel paket devrede kalır.
   */
  const sadeceSabahlik = { ...gecerliMesaj, saat: [5, 11] };
  assert.equal(uzakKatalogAyikla(yuk(sadeceSabahlik)), null);
  assert.ok(uzakKatalogAyikla(yuk(sadeceSabahlik, ikinci)), 'koşulsuz eklenince de reddedildi');
});

test('BOŞ mesaj listesi reddediliyor', () => {
  assert.equal(uzakKatalogAyikla(yuk()), null);
});

test('AYNI KİMLİK iki kez reddediliyor — rotasyon kimliğe bağlı', () => {
  assert.equal(uzakKatalogAyikla(yuk(gecerliMesaj, { ...gecerliMesaj })), null);
});

test('ÇÖP gövde reddediliyor', () => {
  for (const c of [
    null,
    undefined,
    0,
    'katalog',
    [],
    {},
    { mesajlar: [] },
    { surum: '', mesajlar: [gecerliMesaj] },
  ]) {
    assert.equal(uzakKatalogAyikla(c), null, String(c));
  }
});

test('SAAT aralığı ters ya da taşkınsa reddediliyor', () => {
  for (const saat of [[11, 5], [5, 5], [-1, 11], [5, 25], [5], 'sabah']) {
    assert.equal(uzakKatalogAyikla(yuk({ ...gecerliMesaj, saat })), null, JSON.stringify(saat));
  }
  assert.ok(
    uzakKatalogAyikla(yuk({ ...gecerliMesaj, saat: [17, 24] }, ikinci)),
    'akşam 17–24 reddedildi',
  );
});

test('PENCERESİZ öncelikli özel gün reddediliyor', () => {
  /*
   * Öncelikli özel gün "pencere içindeki ilk açılışta kesin gösterilir"
   * demek. Penceresi olmasaydı kural HER GÜN tetiklenir, havuzu kilitler
   * ve kullanıcı aynı mesajı sonsuza kadar görürdü.
   */
  assert.equal(uzakKatalogAyikla(yuk({ ...gecerliMesaj, oncelikliOzelGun: true })), null);
  assert.ok(
    uzakKatalogAyikla(
      yuk(
        { ...gecerliMesaj, oncelikliOzelGun: true, pencere: { bas: [3, 21], son: [3, 22] } },
        ikinci,
      ),
    ),
  );
});

test('GÜN listesi 0–6 dışına çıkamıyor', () => {
  assert.equal(uzakKatalogAyikla(yuk({ ...gecerliMesaj, gunler: [1, 7] })), null);
  assert.equal(uzakKatalogAyikla(yuk({ ...gecerliMesaj, gunler: [] })), null);
  assert.ok(uzakKatalogAyikla(yuk({ ...gecerliMesaj, gunler: [0, 6] }, ikinci)));
});

test('BAYRAK alanları yalnız true kabul ediyor', () => {
  // 'false' göndermek "kapat" sanılabilir; sessizce true'ya dönmesin diye
  // alan ya yok ya true.
  // `ikinci` koşulsuz olduğu için havuz kuralı devrede değil: red YALNIZCA
  // bayrak denetiminden gelebilir. (Tek mesajla sınasaydım test yanlış
  // sebeple geçerdi — mutasyon bunu yakaladı.)
  for (const alan of ['haftaSonu', 'oncelikliOzelGun', 'adGerekli', 'dogumGunu']) {
    assert.equal(uzakKatalogAyikla(yuk({ ...gecerliMesaj, [alan]: false }, ikinci)), null, alan);
  }
  assert.ok(uzakKatalogAyikla(yuk(gecerliMesaj, ikinci)), 'bayraksız yük de reddedildi');
});

test('UZAK katalog yoksa YEREL paket kullanılıyor', () => {
  assert.equal(gecerliKatalog(null), ACILIS_MESAJLARI);
  assert.equal(gecerliKatalog(undefined), ACILIS_MESAJLARI);
  const uzak = uzakKatalogAyikla(yuk(gecerliMesaj))!;
  assert.equal(gecerliKatalog(uzak), uzak.mesajlar);
});

test('YEREL paketin kendisi uzak doğrulamayı geçiyor', () => {
  /*
   * Aynı şekli iki yerde tarif etmiş olsaydım bu test çakardı: cihazdaki
   * paket sunucunun ürettiği kataloğun geçerli bir örneğidir.
   */
  const k = uzakKatalogAyikla({ surum: 'yerel', mesajlar: ACILIS_MESAJLARI });
  assert.equal(k?.mesajlar.length, ACILIS_MESAJLARI.length);
});

test('UZAK katalog seçim motorunda gerçekten kullanılıyor', () => {
  const uzak = uzakKatalogAyikla(yuk(gecerliMesaj))!;
  const sonuc = acilisMesajiSec({
    dil: 'tr',
    simdi: new Date(2026, 5, 10, 14, 0, 0),
    durum: BOS_DURUM,
    katalog: gecerliKatalog(uzak),
  });
  assert.equal(sonuc.id, 'uzak_01');
  assert.equal(sonuc.metin, 'Merhaba');
});

test('KOŞULSUZ ayrımı koşullu mesajı saymıyor', () => {
  assert.ok(kosulsuz(gecerliMesaj as never));
  assert.equal(kosulsuz({ ...gecerliMesaj, davranis: 'ilk_acilis' } as never), false);
});

test('YAPISAL mesajları içermeyen uzak katalogda AÇILIŞ ÇÖKMÜYOR', () => {
  /*
   * Panelden bh_01/pn_02/bh_04 pasife alınabilir. Motor bunları kimlikle
   * arıyor; "kesin vardır" varsaysaydık o kataloğu indiren cihazda
   * randevusu olan HER kullanıcI açılışta çökerdi. Kural atlanıyor,
   * sıradaki devralıyor.
   */
  const uzak = uzakKatalogAyikla(yuk(gecerliMesaj))!;
  const ortak = {
    dil: 'tr',
    simdi: new Date(2026, 5, 10, 14, 0, 0),
    katalog: gecerliKatalog(uzak),
    durum: BOS_DURUM,
  } as const;

  assert.equal(
    acilisMesajiSec({ ...ortak, ilkAcilis: true }).id,
    'uzak_01',
    'bh_01 yokken ilk açılış',
  );
  assert.equal(
    acilisMesajiSec({ ...ortak, dogumGunu: { ay: 6, gun: 10 } }).id,
    'uzak_01',
    'pn_02 yokken doğum günü',
  );
  assert.equal(
    acilisMesajiSec({ ...ortak, bugunRandevuId: 'r1' }).id,
    'uzak_01',
    'bh_04 yokken randevu',
  );
  assert.equal(acilisMesajiSec({ ...ortak, puan: 99999 }).id, 'uzak_01', 'bh_06 yokken puan');
});
