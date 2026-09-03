import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safeParseServices } from './catalog.service';

/**
 * PROFİL HİZMET LİSTESİ — brief §4.7.
 *
 * "Profilde uzmanın hizmetleri kategori → alt hizmet hiyerarşisiyle gruplu
 * gösterilir."
 *
 * Brief §4.1 ile satırlar `{ serviceId, name, price, durationMin }` oldu.
 * Bu ayrıştırıcı yalnız `x.id` okuyordu ve KATALOG BAĞI DÜŞÜYORDU: profil
 * `svc-0`, `svc-1` gibi uydurma kimliklerle geliyordu ve hiyerarşi
 * kurulamıyordu — bütün hizmetler "Diğer" grubuna düşerdi.
 */

const yaz = (rows: unknown[]) => safeParseServices(JSON.stringify(rows));

test('KATALOG BAĞI taşınıyor', () => {
  const [r] = yaz([
    { serviceId: 'hair.coloring', name: 'Kök boyası', price: 15000, durationMin: 60 },
  ]);
  assert.equal(r!.serviceId, 'hair.coloring');
  assert.equal(r!.name, 'Kök boyası');
});

test('ESKİ biçim (`id`) de okunuyor', () => {
  const [r] = yaz([{ id: 'nails.manicure', name: 'Manikür', price: 6000, durationMin: 45 }]);
  assert.equal(r!.serviceId, 'nails.manicure');
});

test('SATIR KİMLİKLERİ benzersiz — aynı alt hizmetin iki satırı ayrılıyor', () => {
  /*
   * Brief §4.1: uzman aynı alt hizmetin altına birden çok satır
   * ekleyebiliyor. Kimlikler çakışsaydı profilde biri seçilince öteki de
   * seçili görünürdü.
   */
  const rows = yaz([
    { serviceId: 'hair.coloring', name: 'Kök boyası', price: 15000, durationMin: 60 },
    { serviceId: 'hair.coloring', name: 'Tam boya', price: 25000, durationMin: 120 },
  ]);
  assert.equal(rows.length, 2);
  assert.notEqual(rows[0]!.id, rows[1]!.id, 'iki satır aynı kimliği taşıyor');
});

test('BAĞSIZ satır listede kalıyor — bağı boş', () => {
  /*
   * Uzmanın serbest yazdığı hizmet. Atmak, gerçekten sunduğu bir hizmeti
   * profilden silmek olurdu; ekran onu kategorisiz gruba koyuyor.
   */
  const [r] = yaz([{ name: 'Roza özel paketi', price: 20000, durationMin: 90 }]);
  assert.equal(r!.serviceId, null);
  assert.equal(r!.name, 'Roza özel paketi');
});

test('KATALOG DIŞI kimlik bağ SAYILMIYOR', () => {
  // Aksi hâlde ekran onu var olmayan bir kategoriye bağlamaya çalışırdı.
  const [r] = yaz([{ serviceId: 'hair-cut', name: 'Eski kayıt', price: 100, durationMin: 30 }]);
  assert.equal(r!.serviceId, null);
});

test('adsız satır listeye girmiyor ve bozuk JSON çökertmiyor', () => {
  assert.deepEqual(yaz([{ serviceId: 'hair.haircut', name: '', price: 1 }]), []);
  assert.deepEqual(safeParseServices('{bozuk'), []);
  assert.deepEqual(safeParseServices('null'), []);
});
