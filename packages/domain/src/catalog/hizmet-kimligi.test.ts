import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hizmetSatirininKimligi, katalogHizmetKimlikleri } from './hizmet-kimligi.js';

/**
 * HİZMET KİMLİĞİ OKUMA — tek kaynak.
 *
 * Bu modül gerçek bir hatadan doğdu: uygulama `servicesJson`a `{ id, ... }`
 * yazıyordu, "Yakında" hesabı `serviceId` okuyordu. Hiçbir şey hata
 * vermiyordu; yalnız gerçek uzmanlar varken bütün katalog "Yakında"
 * görünecekti. Kimliğin nereden okunacağı artık TEK YERDE.
 */

test('uygulamanın YAZDIĞI biçim okunuyor', () => {
  // `apps/mobile/src/store.ts` bu şekli gönderiyor.
  assert.equal(
    hizmetSatirininKimligi({ id: 'hair.haircut', name: 'Kesim', price: 9000, durationMin: 60 }),
    'hair.haircut',
  );
});

test('brief §4.1 biçimi de okunuyor — uzman kendi adını yazıyor', () => {
  assert.equal(
    hizmetSatirininKimligi({ serviceId: 'skin.facial', name: 'Roza özel bakım', price: 12000 }),
    'skin.facial',
  );
});

test('KATALOGDA OLMAYAN kimlik reddediliyor', () => {
  /*
   * Uzmanın serbest yazdığı ad ya da eski taksonomi kimliği arz
   * sayılsaydı, katalogda karşılığı olmayan bir alt hizmetten rozet
   * kalkardı — daha kötüsü bu kimlik "alan" olarak da kaydedilip
   * hiçbir aramayla eşleşmeyen hayalet kategori üretirdi.
   */
  assert.equal(hizmetSatirininKimligi({ id: 'Roza paketi' }), undefined);
  assert.equal(hizmetSatirininKimligi({ id: 'hair-cut' }), undefined, 'eski kimlik kabul edildi');
  assert.equal(hizmetSatirininKimligi({ id: 'hair' }), undefined, 'kategori alt hizmet sayıldı');
  assert.equal(hizmetSatirininKimligi({ serviceId: 'hair.olmayan' }), undefined);
});

test('serviceId ÖNCELİKLİ — ikisi birdeyse bağ kazanır', () => {
  /*
   * Brief §4.1'de `name` uzmanın kendi adı, `serviceId` bağlı olduğu alt
   * hizmet. Bir satırda ikisi de varsa doğru olan `serviceId`: `id` o
   * satırın kendi kaydı olabilir, katalog bağı değil.
   */
  assert.equal(
    hizmetSatirininKimligi({ id: 'nails.manicure', serviceId: 'skin.facial' }),
    'skin.facial',
  );
});

test('bozuk girdi ÇÖKERTMİYOR', () => {
  for (const x of [null, undefined, 42, 'metin', [], {}, { id: 42 }, { id: '' }, { id: '   ' }]) {
    assert.equal(hizmetSatirininKimligi(x), undefined, `çöktü ya da kabul etti: ${String(x)}`);
  }
  assert.deepEqual(katalogHizmetKimlikleri(null), []);
  assert.deepEqual(katalogHizmetKimlikleri('dizi değil'), []);
});

test('liste tekilleştiriliyor ve süzülüyor', () => {
  assert.deepEqual(
    katalogHizmetKimlikleri([
      { id: 'hair.haircut' },
      { id: 'hair.haircut' },
      { id: 'Roza paketi' },
      { serviceId: 'nails.manicure' },
      null,
    ]),
    ['hair.haircut', 'nails.manicure'],
  );
});
