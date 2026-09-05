import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { birincilAksiyon } from './booking-flow';

/**
 * ÖDEME BEYANI — kurucu, 05.09.2026.
 *
 *   "Müşteri salona gittiğinde hizmet saati başladığında otomatik olarak
 *    müşteri ekranında ilgili randevuda Ödeme Yap butonu aktif olmalı. şu anda
 *    yok ve randevu açık kalıyor ve tamamlanmıyor."
 *
 * Bu dosya kuralı EKRAN TARAFINDA kilitliyor: düğmenin hangi durumda, kimde
 * ve hangi şartla çıktığı.
 */

/** Yorumları eleyerek koda bakar — test kendi açıklamasıyla eşleşmesin. */
function yorumsuz(yol: string): string {
  return readFileSync(yol, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

test('HİZMET GÜNÜNDE müşterinin ödeme düğmesi VAR', () => {
  const a = birincilAksiyon('hizmet_gunu', 'musteri', {});
  assert.ok(a, 'müşteri hizmet gününde hiçbir şey yapamıyor — randevu açık kalır');
  assert.equal(a.eylem, 'odeme_yaptim');
});

test('hizmet gününde UZMANIN düğmesi ÖDEMEYİ ALDIM', () => {
  /*
   * Kurucu (05.09.2026): "uzman tarafında ödemeyi yaptım değil ödemeyi aldım
   * yazmalı." Uzmanın düğmesi "İşlemi bitirdim"di ve müşterinin ödeme adımını
   * açmak için vardı; ödeme adımı artık hizmet saatiyle kendiliğinden
   * açılıyor, dolayısıyla uzmanın tek işi kendi onayını vermek.
   */
  const a = birincilAksiyon('hizmet_gunu', 'uzman', {});
  assert.ok(a);
  assert.equal(a.eylem, 'odeme_aldim');
});

test('uzman ONAYLADIYSA düğme kalkıyor — çift teyit yok', () => {
  assert.equal(birincilAksiyon('hizmet_gunu', 'uzman', { odemeTeyitEdildi: true }), null);
  assert.equal(birincilAksiyon('odeme_bekliyor', 'uzman', { odemeTeyitEdildi: true }), null);
});

test('uzmanın düğmesi MÜŞTERİYİ BEKLEMİYOR', () => {
  /*
   * Eskiden uzmanın düğmesi ancak müşteri beyan ettikten sonra çıkıyordu:
   * uzman kendi ekranında yapacak bir şey bulamıyor, randevu ikisinin
   * arasında asılı kalıyordu. Sıra önemsiz.
   */
  const a = birincilAksiyon('odeme_bekliyor', 'uzman', { odemeBildirildi: false });
  assert.ok(a, 'müşteri beyan etmeden uzmanda düğme yok');
  assert.equal(a.eylem, 'odeme_aldim');
});

test('beyan edilmişse müşteride düğme KALMIYOR — çift beyan yok', () => {
  assert.equal(birincilAksiyon('hizmet_gunu', 'musteri', { odemeBildirildi: true }), null);
  assert.equal(birincilAksiyon('odeme_bekliyor', 'musteri', { odemeBildirildi: true }), null);
});

test('hizmet BAŞLAMADAN ödeme düğmesi çıkmıyor', () => {
  // Kesinleşmiş ama günü gelmemiş randevuda ödeme beyanı, yaşanmamış bir
  // hizmet için para ve puan doğurmak demekti.
  assert.equal(birincilAksiyon('kesinlesti', 'musteri', {}), null);
  assert.equal(birincilAksiyon('depozito_bekliyor', 'musteri', {})?.eylem, 'depozito_ode');
});

test('ödeme düğmesi TUTAR EKRANINA gidiyor, doğrudan göndermiyor', () => {
  // Kasada fiyat değişmiş olabilir; doğrudan `cagir('odeme_yaptim')` demek
  // rezervasyon fiyatını kesinleştirmek olurdu.
  const ekran = yorumsuz('app/booking/[id].tsx');
  const i = ekran.indexOf("case 'odeme_yaptim':");
  assert.ok(i > 0, 'ödeme eylemi ekranda karşılıksız');
  const govde = ekran.slice(i, i + 200);
  assert.match(govde, /\/booking\/payment\?id=/, 'tutar ekranı açılmıyor');
});

test('tutar ekranı REZERVASYON FİYATIYLA dolu açılıyor', () => {
  // "Fiyat değişmemişse direkt ödeme yaptım basabilir" — alan boş açılırsa
  // değişmeyen fiyatta da kullanıcıya yazdırmış oluruz.
  const ekran = yorumsuz('app/booking/payment.tsx');
  assert.match(ekran, /useState\(\(\) => String\(booking\?\.price/);
});

test('tutar ekranı puan vaadini ÖDENEN tutardan hesaplıyor', () => {
  const ekran = yorumsuz('app/booking/payment.tsx');
  // Sunucu da aynı formülü (`earnPoints`) kullanıyor: ekranda yazan puan ile
  // hesaba yatan puan ayrışamaz.
  assert.match(ekran, /earnPoints\(tutar, rates\.pointsEarnPct\)/);
});

test('geçersiz tutarla gönderilemiyor', () => {
  const ekran = yorumsuz('app/booking/payment.tsx');
  assert.match(ekran, /const gecerli = Number\.isFinite\(tutar\) && tutar > 0/);
  assert.match(ekran, /disabled=\{!gecerli \|\| busy\}/);
});
