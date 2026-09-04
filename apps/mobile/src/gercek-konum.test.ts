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

test('haritada UYDURMA pin yok', () => {
  /*
   * Kurucu: "sistem hiçbir şekilde... hiçbir şeyi kendiliğinden
   * uydurmamalı."
   *
   * `proCoords` koordinat yoksa şehir merkezi etrafına dağıtıyor. O pinler
   * gerçek adres değil; kullanıcı haritaya bakıp "şurada bir salon var"
   * diye yola çıkabilirdi.
   */
  const ekran = oku('app/map.tsx');
  assert.match(ekran, /pros\.filter\(\(p\) => konumuVar\(p\)\)/, 'konumsuzlar süzülmüyor');
  /*
   * Pinler artık KÜMEDEN geliyor (aynı adrestekiler tek iğne). Küme
   * koordinatı temsilcinin GERÇEK koordinatı; kümeleme null koordinatlıyı
   * zaten hiç almıyor. İki iddia birden: ekran kümeden çiziyor ve
   * kümeleme koordinatsızı dışarıda bırakıyor.
   */
  assert.match(
    ekran,
    /coordinate=\{\{ latitude: k\.lat, longitude: k\.lng \}\}/,
    'pin hâlâ üretilmiş koordinattan çiziliyor',
  );
  assert.match(
    oku('src/harita-kumeleme.ts'),
    /if \(p\.lat == null \|\| p\.lng == null\) continue;/,
    'kümeleme koordinatsız sağlayıcıyı alıyor',
  );
  assert.ok(!/<Marker[\s\S]{0,160}proCoords\(/.test(ekran), 'proCoords ile pin çizimi geri gelmiş');
  // Kaybolmuyorlar: sayıları yazılıyor.
  assert.match(ekran, /'map\.no_pin'/, 'gizlenen sağlayıcı sayısı söylenmiyor');
});

test('mevcut uzman konumunu SONRADAN düzeltebiliyor', () => {
  /*
   * Konum kayıtta zorunlu oldu ama mevcut kayıtlarda yok (canlıda 25/25).
   * Düzeltme yolu olmasaydı eski uzmanlar mesafe sıralamasında sonsuza
   * kadar dışarıda kalırdı.
   */
  const ekran = oku('app/seller/location.tsx');
  assert.match(ekran, /<AddressPicker/, 'düzeltme ekranında harita yok');
  assert.match(ekran, /api\.setMyLocation/, 'konum sunucuya yazılmıyor');
  // Kurucu "kontrol etmelidir" dedi: koordinat açıkça gösteriliyor.
  assert.match(ekran, /koord\.lat\.toFixed\(5\)/, 'seçilen nokta doğrulanamıyor');
  const menu = oku('app/seller/menu.tsx');
  assert.match(menu, /route: '\/seller\/location'/, 'menüde konum girişi yok');
});

/*
 * SIRALAMA CADDE ADINA DEĞİL KOORDİNATA BAKIYOR.
 *
 * Kurucu: "cadde çok uzun bir cadde ve eğer doğru iğnelenen yeri
 * belirlemeyip cadde bazında bir değerlendirme yaparsa sistem kullanıcıdan
 * çok uzakta yerleri de gösterebilir."
 *
 * Endişe yerinde ama sistem metne HİÇ bakmıyor. Asıl eksik DOĞRULAMAYDI:
 * kullanıcı iğnenin nereye düştüğünü göremiyor, göremediği için
 * düzeltemiyordu.
 */

test('mesafe adres METNİNE değil koordinata bakıyor', () => {
  // Aynı cadde adı, iki farklı iğne → iki farklı sonuç.
  const caddeBasi: UserAddress = {
    id: '1',
    label: 'home',
    detail: 'Kabanbay Batyr Street',
    lat: 43.2405,
    lng: 76.8512,
  };
  const caddeSonu: UserAddress = {
    id: '2',
    label: 'work',
    detail: 'Kabanbay Batyr Street',
    lat: 43.2489,
    lng: 76.9503,
  };
  const hedef = { latitude: 43.2405, longitude: 76.8512 };
  const yakin = gercekMesafeKm(kullaniciKonumu([caddeBasi]), hedef);
  const uzak = gercekMesafeKm(kullaniciKonumu([caddeSonu]), hedef);
  assert.ok(yakin !== null && uzak !== null);
  assert.ok(yakin! < 0.5, `cadde başı yakın olmalı: ${yakin}`);
  assert.ok(uzak! > 5, `cadde sonu uzak olmalı: ${uzak}`);
  assert.ok(uzak! > yakin!, 'aynı cadde adı iki adresi eşitliyor — metne bakılıyor');
});

test('kayıtlı adresin İĞNESİ görünüyor ve düzeltilebiliyor', () => {
  const ekran = oku('app/profile/addresses.tsx');
  // Koordinat açıkça yazılı: kullanıcı iğnenin yerini doğrulayabilmeli.
  assert.match(ekran, /a\.lat\.toFixed\(5\)/, 'kayıtlı adresin koordinatı gizli');
  assert.match(ekran, /'addresses\.verify'/, 'haritada görme yolu yok');
  assert.match(ekran, /updateAddressCoord\(duzeltilen\.id/, 'iğne düzeltilemiyor');
  // İğnesiz eski kayıt UYARILIYOR: sessizce mesafe dışında kalmamalı.
  assert.match(ekran, /'addresses\.no_pin'/, 'iğnesiz adres uyarılmıyor');
});
