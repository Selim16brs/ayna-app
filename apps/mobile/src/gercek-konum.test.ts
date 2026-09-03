/**
 * GERÇEK KONUM — iğneden gelen koordinat, uydurma dağılım değil.
 *
 * Kurucu: "elle manuel yazılmak yerine harita üzerinden iğne attırmalı ve
 * bunu hafızasına kaydettirmeliyiz... bir müşteri yakınındakileri
 * seçtiğinde ona alakasız uzaklıktaki yerler çıkarsa bu sorun olur."
 *
 * ESKİ HÂL: koordinat hiçbir yerde toplanmıyordu.
 *   · Müşteri adresi yalnız SERBEST METİNDİ.
 *   · Uzman kaydında konum alanı hiç yoktu (canlıda 25/25 boş).
 *   · `proCoords` koordinat yoksa şehir merkezi etrafına DAĞITIYORDU.
 *   · "Yakınımdakiler" iki UYDURMA nokta arasındaki mesafeyle sıralanıyordu.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gercekMesafeKm, konumuVar, kullaniciKonumu, type UserAddress } from './data';

const kok = join(import.meta.dirname, '..');
const oku = (y: string) => readFileSync(join(kok, y), 'utf8');

// ── Mantık ──────────────────────────────────────────────────────────────

test('kullanıcı konumu İĞNELİ adresten geliyor', () => {
  const metinAdresi: UserAddress = { id: '1', label: 'home', detail: 'Abay 10' };
  const igneli: UserAddress = { id: '2', label: 'work', detail: 'Ofis', lat: 43.24, lng: 76.9 };
  assert.equal(kullaniciKonumu([metinAdresi]), null, 'metin adresi konum sayılıyor');
  assert.deepEqual(kullaniciKonumu([metinAdresi, igneli]), { latitude: 43.24, longitude: 76.9 });
  assert.equal(kullaniciKonumu([]), null);
});

test('şehir merkezine DÜŞMÜYOR', () => {
  /*
   * Merkez gerçek konum değil; ona düşmek "senden X km" iddiasını
   * taşıyamayan bir sayı üretirdi. Konum yoksa cevap YOK olmalı.
   */
  assert.equal(kullaniciKonumu([{ id: '1', label: 'home', detail: 'Almatı' }]), null);
});

test('mesafe İKİ UÇ da gerçekse hesaplanıyor', () => {
  const a = { latitude: 43.238, longitude: 76.889 };
  const b = { latitude: 43.256, longitude: 76.928 };
  const km = gercekMesafeKm(a, b);
  assert.ok(km !== null && km > 0 && km < 10, `beklenmeyen mesafe: ${km}`);
  // Bir uç eksikse uydurma sayı yok.
  assert.equal(gercekMesafeKm(null, b), null, 'kullanıcı konumsuzken sayı üretiliyor');
  assert.equal(gercekMesafeKm(a, null), null, 'sağlayıcı konumsuzken sayı üretiliyor');
});

test('konumu olmayan sağlayıcı ayırt ediliyor', () => {
  assert.equal(konumuVar({ lat: 43.2, lng: 76.9 }), true);
  assert.equal(konumuVar({}), false);
  assert.equal(konumuVar({ lat: 43.2 }), false, 'yarım koordinat geçerli sayılıyor');
  assert.equal(konumuVar({ lat: null, lng: null }), false);
});

// ── Ekran bağı ──────────────────────────────────────────────────────────

test('müşteri adresi HARİTADAN işaretleniyor', () => {
  const ekran = oku('app/profile/addresses.tsx');
  assert.match(ekran, /<AddressPicker/, 'adres ekranında harita yok');
  // İğne ZORUNLU: metin tek başına yetmemeli.
  assert.match(ekran, /disabled=\{!koord \|\| !detail\.trim\(\)\}/, 'iğnesiz adres eklenebiliyor');
  assert.match(ekran, /addAddress\(label, detail, koord\)/, 'koordinat kaydedilmiyor');
});

test('uzman kaydında konum İĞNEYLE ve ZORUNLU', () => {
  const ekran = oku('app/auth/expert.tsx');
  assert.match(ekran, /<AddressPicker/, 'uzman kaydında harita yok');
  assert.match(ekran, /coord !== null,/, 'iğne olmadan adım geçiliyor');
  assert.match(
    ekran,
    /\.\.\.\(coord \? \{ lat: coord\.lat, lng: coord\.lng \} : \{\}\)/,
    'konum gönderilmiyor',
  );
});

test('"yakınımdakiler" UYDURMA konumla sıralamıyor', () => {
  const ekran = oku('app/nearby.tsx');
  assert.match(
    ekran,
    /const benimKonum = kullaniciKonumu\(addresses\)/,
    'kullanıcı konumu okunmuyor',
  );
  assert.match(ekran, /konumuVar\(p\)/, 'konumsuz sağlayıcı ayıklanmıyor');
  // Sıralanamıyorsa kullanıcı BİLGİLENDİRİLİYOR.
  assert.match(ekran, /'nearby\.no_location'/, 'sıralanamama sessizce geçiliyor');
  // Eski uydurma zincir geri gelmemeli.
  assert.ok(
    !/distanceKm\(cityCenter\(city\), proCoords\(/.test(ekran),
    'şehir merkezi + uydurma konum sıralaması geri gelmiş',
  );
});
