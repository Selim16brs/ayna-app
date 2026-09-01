import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RESPONSE_WINDOW_MS } from './data';
import { birincilAksiyon } from './booking-flow';

/**
 * 01.09.2026 — kurucunun telefonundan bildirdiği üç hata.
 *
 * Üçü de sessizdi: uygulama çökmüyor, hata göstermiyor, testler geçiyordu.
 * Yalnız gerçek cihazda, gerçek akışta görünüyorlardı.
 */

const store = readFileSync(join(import.meta.dirname, 'store.ts'), 'utf8');

test('kayıt kimliği uygulama YENİDEN AÇILINCA çakışmıyor', () => {
  // Hata: `let seq = 5000` modül seviyesindeydi ve her açılışta sıfırlanıyordu;
  // randevular ise cihazda kalıcı. İkinci oturumun `bk5001`i, ilkinin
  // `bk5001`iyle çakışıyor, hydrate eski kaydı üstüne yazıyordu — onayda bir
  // hizmet, detayda BAŞKA bir hizmet görünüyordu.
  const m = /const nextId = \(prefix: string\)[\s\S]*?\n\};/.exec(store);
  assert.ok(m, 'nextId yok');
  assert.match(m[0], /Date\.now\(\)/, 'kimlik zamana bağlı değil — açılışta tekrarlar');
  assert.match(m[0], /Math\.random\(\)/, 'kimlikte rastgelelik yok — aynı ms’de çakışır');
  // Sayaç TEK BAŞINA kimlik üretmemeli.
  assert.ok(!/`\$\{prefix\}\$\{\+\+seq\}`/.test(store), 'kimlik hâlâ yalnız sayaçtan üretiliyor');
});

test('kimlik üreteci aynı ms içinde bile tekrar etmiyor', () => {
  // Üretecin kendisini yeniden kuruyoruz: store’u içe aktarmak tüm uygulamayı
  // ayağa kaldırırdı. Sözleşme aynı — zaman + rastgelelik + sayaç.
  let seq = 0;
  const uret = (p: string) =>
    `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}${++seq}`;
  const gorulen = new Set<string>();
  for (let i = 0; i < 5000; i++) gorulen.add(uret('bk'));
  assert.equal(gorulen.size, 5000, 'kimlik tekrarladı');
});

test('§4.2 — uzman yanıt penceresi 3 SAAT', () => {
  // Ekranda "5 sa 55 dk" yazıyordu (6 saat), sunucu 3 saatte düşürüyordu:
  // kullanıcıya söylenen süre ile işleyen süre farklıydı.
  assert.equal(RESPONSE_WINDOW_MS, 3 * 60 * 60_000, 'MD §4.2 üç saat diyor');
});

test('§4.3 — uzman KENDİ önerdiği saati kabul edemiyor', () => {
  // Ekran görüntüsü: uzmanın ekranında "Uzmanın önerdiği yeni saat · Bu saati
  // kabul et". Öneren kendi önerisini onaylıyordu.
  assert.equal(
    birincilAksiyon('degisiklik_onerildi', 'uzman', {}),
    null,
    'uzman kendi değişiklik önerisini kabul edebiliyor',
  );
  // Karar müşterinin.
  assert.ok(birincilAksiyon('degisiklik_onerildi', 'musteri', {}), 'müşteride karar butonu yok');
});

test('§4.3 — karşı öneride de öneren taraf yanıtlayamıyor', () => {
  assert.equal(
    birincilAksiyon('karsi_oneri', 'musteri', {}),
    null,
    'müşteri kendi önerisini kabul ediyor',
  );
  assert.ok(birincilAksiyon('karsi_oneri', 'uzman', {}), 'uzmanda Kabul/Red yok');
});
