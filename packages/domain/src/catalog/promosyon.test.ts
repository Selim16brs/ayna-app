import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type PromosyonKarti, promosyonlariSirala } from './promosyon.js';

const p = (id: string, ek: Partial<PromosyonKarti> = {}): PromosyonKarti => ({
  id,
  proId: 'pro-' + id,
  proAd: 'Uzman ' + id,
  proGorsel: '',
  puan: null,
  sehir: 'Almatı',
  mesafeKm: null,
  baslik: 'Kampanya',
  aciklama: '',
  indirimYuzde: null,
  gorsel: null,
  basEtiket: '',
  sonEtiket: '',
  ...ek,
});

test('YAKINLIK: küçük mesafe önce', () => {
  const s = promosyonlariSirala([p('a', { mesafeKm: 8 }), p('b', { mesafeKm: 2 })], 'yakinlik');
  assert.deepEqual(
    s.map((x) => x.id),
    ['b', 'a'],
  );
});

test('PUAN ve İNDİRİM: büyük önce', () => {
  const puan = promosyonlariSirala([p('a', { puan: 3.9 }), p('b', { puan: 4.8 })], 'puan');
  assert.deepEqual(
    puan.map((x) => x.id),
    ['b', 'a'],
  );
  const ind = promosyonlariSirala(
    [p('a', { indirimYuzde: 10 }), p('b', { indirimYuzde: 40 })],
    'indirim',
  );
  assert.deepEqual(
    ind.map((x) => x.id),
    ['b', 'a'],
  );
});

test('BİLİNMEYEN değer her zaman SONA', () => {
  /*
   * Mesafesi bilinmeyeni "0 km" sayıp başa koymak, kullanıcıya en yakın
   * sanıp yola çıkacağı bir şey göstermek olurdu. Puanı olmayanı da
   * "0 puan" sayıp sona atmak haksızlık — ikisi de BİLİNMİYOR.
   */
  const mesafe = promosyonlariSirala(
    [p('bilinmiyor'), p('yakin', { mesafeKm: 3 }), p('uzak', { mesafeKm: 30 })],
    'yakinlik',
  );
  assert.deepEqual(
    mesafe.map((x) => x.id),
    ['yakin', 'uzak', 'bilinmiyor'],
  );

  const puan = promosyonlariSirala(
    [p('puansiz'), p('iyi', { puan: 4.9 }), p('orta', { puan: 3.2 })],
    'puan',
  );
  assert.deepEqual(
    puan.map((x) => x.id),
    ['iyi', 'orta', 'puansiz'],
  );
});

test('SIRALAMA girdiyi DEĞİŞTİRMİYOR', () => {
  // Aynı listeyi iki farklı sırayla göstermek isteyen ekran, ilk çağrıda
  // bozulmuş bir diziyle kalmamalı.
  const liste = [p('a', { mesafeKm: 9 }), p('b', { mesafeKm: 1 })];
  promosyonlariSirala(liste, 'yakinlik');
  assert.deepEqual(
    liste.map((x) => x.id),
    ['a', 'b'],
  );
});

test('HEPSİ BİLİNMEYENSE sıra korunuyor', () => {
  const s = promosyonlariSirala([p('a'), p('b'), p('c')], 'yakinlik');
  assert.deepEqual(
    s.map((x) => x.id),
    ['a', 'b', 'c'],
  );
});
