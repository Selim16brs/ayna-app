import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * UZMAN PAYLAŞIMLARI — ekran tarafı.
 *
 * Kurucu: "uzman öncesi/sonrası fotoğrafını müşterilerimle paylaş butonuna
 * basarak paylaştığında daha önce müşterisi olan müşterilere gösterilsin…
 * hem uzman hem de müşteri tarafında bir alan olması lazım. bu fotoğraflar
 * 7 gün kalacak."
 */

const yorumsuz = (x: string) =>
  x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const ekran = (p: string) => yorumsuz(readFileSync(join(__dirname, '..', 'app', p), 'utf8'));
const paylas = ekran('seller/paylas.tsx');
const gelen = ekran('paylasimlar.tsx');

test('İZİN KUTUSU olmadan paylaş düğmesi AÇILMIYOR', () => {
  /*
   * Öncesi/sonrası fotoğrafı kişisel veri. Sunucu da izinsiz gövdeyi
   * reddediyor — iki kapı bilerek: ekran atlanabilir (eski sürüm, başka
   * istemci), sunucu atlanamaz.
   */
  assert.match(paylas, /const hazir = !!once && !!sonra && izin/, 'izin düğmeyi kapatmıyor');
  assert.match(paylas, /disabled=\{!hazir \|\| mesgul\}/, 'düğme koşulsuz açık');
  assert.match(paylas, /consent: true/, 'izin beyanı gönderilmiyor');
});

test('KİME GİDECEĞİ paylaşmadan ÖNCE yazıyor', () => {
  /*
   * "Müşterilerimle paylaş" soyut bir söz; sayı olmadan uzman kaç kişinin
   * fotoğrafı göreceğini bilmeden basardı.
   */
  assert.match(paylas, /propost\.audience/, 'alıcı sayısı gösterilmiyor');
  assert.match(
    paylas,
    /musteriler\.length === 0[\s\S]{0,80}propost\.no_customers/,
    'müşterisi yokken sebep yazmıyor',
  );
});

test('MÜŞTERİSİ OLMAYAN uzman paylaşamıyor', () => {
  // Alıcısı olmayan gönderi kimseye ulaşmaz.
  assert.match(paylas, /\(musteriler\?\.length \?\? 0\) > 0/, 'müşterisiz paylaşım engellenmiyor');
});

test('7 GÜN kuralı EKRANDA yazıyor', () => {
  // Kullanıcı fotoğrafın kaybolacağını paylaşmadan önce bilmeli.
  assert.match(paylas, /propost\.expiry_hint/, 'uzmana süre söylenmiyor');
  assert.match(gelen, /propost\.left/, 'müşteriye kalan gün gösterilmiyor');
});

test('MÜŞTERİ kendi fotoğrafını BİLDİREBİLİYOR', () => {
  /*
   * Kişisel veri. Kendi fotoğrafını izinsiz gören müşteri tek dokunuşla
   * bildirebilmeli; gönderi o anda gizleniyor.
   */
  // Zincir satır sonuna bölünebiliyor (`void api` / `.reportProPost`);
  // desen bitişikliğe değil ÇAĞRIYA bakıyor.
  assert.match(gelen, /reportProPost\(token, id\)/, 'şikâyet yolu yok');
  assert.match(gelen, /propost\.report_t/, 'şikâyet onayı sorulmuyor');
});

test('İKİ TARAFIN da girişi var', () => {
  const menu = ekran('seller/menu.tsx');
  const profil = ekran('(tabs)/profile.tsx');
  assert.match(menu, /route: '\/seller\/paylas'/, 'uzman menüsünde giriş yok');
  assert.match(profil, /router\.push\('\/paylasimlar'\)/, 'müşteri profilinde giriş yok');
});

test('GELEN KUTUSU müşteriye özel — uzmana gösterilmiyor', () => {
  /*
   * Uzmanın kendi paylaşımları kendi menüsünde. Aynı satırı ikisine de
   * göstermek, uzmanı kendi gönderisinin gelen kutusuna sokardı.
   */
  const profil = ekran('(tabs)/profile.tsx');
  assert.match(
    profil,
    /\{ key: 'propost\.inbox',[^}]*customerOnly: true \}/,
    'gelen kutusu uzmana da görünüyor',
  );
});

test('KATEGORİ KARTLARINDA fiyat ve süre YOK', () => {
  /*
   * Kurucu: "fiyat ve süre yazmak doğru olmaz çünkü herkesin fiyatı ve
   * işlem süresi farklı."
   *
   * Gösterilen sayılar KİMSENİN fiyatı değildi: katalog varsayılanları.
   * Müşteri "Kesim 9.000 ₸" görüp uzmanın profilinde 15.000 ₸ ile
   * karşılaşıyordu.
   */
  const kartlar = yorumsuz(readFileSync(join(__dirname, 'ui', 'ServiceCards.tsx'), 'utf8'));
  assert.doesNotMatch(kartlar, /s\.price/, 'kategori kartında fiyat duruyor');
  assert.doesNotMatch(kartlar, /s\.durationMin/, 'kategori kartında süre duruyor');
});
