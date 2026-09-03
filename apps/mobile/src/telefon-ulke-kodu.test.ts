import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ULKELER, parcala, tamNumara, yerelKismiTemizle } from './telefon-bicim';

/**
 * TELEFON: ÜLKE KODU AYRI, NUMARA AYRI.
 *
 * Kurucu: "telefon numarası kaydedilirken ülke kodu ayrı numara ayrı
 * şekilde giriş yapılabilir."
 *
 * ── NEDEN ───────────────────────────────────────────────────────────────
 *
 * Tek kutu sessizce bozuluyordu. Kurucu kayıtta numarayı ülke kodsuz yazdı;
 * sağlayıcı "uluslararası biçime uymuyor" diye reddetti ve ekranda yalnız
 * "kod gönderilemedi" göründü. Ne yanlış yaptığını anlamasının yolu yoktu.
 *
 * Ülke kodu ayrı seçilince UNUTULAMIYOR: her zaman bir değeri var.
 */

test('ülke kodu ve numara birleşince uluslararası biçim çıkıyor', () => {
  assert.equal(tamNumara('+7', '7771234567'), '+77771234567');
  assert.equal(tamNumara('+90', '5551234567'), '+905551234567');
});

test('yerel önek ATILIYOR — numara bir hane kaymıyor', () => {
  /*
   * Kazakistan'da numara alışkanlıkla "8 777…" yazılıyor; baştaki 8 ulusal
   * önek ve ülke kodunun yerine geçiyor. Ülke kodu AYRICA seçildiğinde o 8
   * fazlalık olur — bırakılırsa numara bir hane kayar ve BAŞKASINA gider.
   */
  assert.equal(tamNumara('+7', '87771234567'), '+77771234567', 'KZ "8" öneki kalmış');
  assert.equal(tamNumara('+7', '77771234567'), '+77771234567', 'ülke kodu iki kez yazılmış');
  assert.equal(tamNumara('+90', '05551234567'), '+905551234567', 'TR "0" öneki kalmış');
});

test('boşluklu yazım da doğru okunuyor', () => {
  // Kullanıcı "777 123 45 67" yazıyor; ekranda böyle görmek istiyor.
  assert.equal(tamNumara('+7', '777 123 45 67'), '+77771234567');
});

test('numara boşken tam numara da BOŞ — yalnız ülke kodu gönderilmiyor', () => {
  // "+7" tek başına gönderilseydi sağlayıcı anlamsız bir istek alırdı.
  assert.equal(tamNumara('+7', ''), '');
  assert.equal(tamNumara('+7', '   '), '');
});

test('kayıtlı numara doğru ülkeye ayrışıyor', () => {
  // Düzenleme ekranları mevcut numarayı parçalayıp gösteriyor.
  assert.deepEqual(parcala('+77771234567'), { ulke: ULKELER[0]!, yerel: '7771234567' });
  const tr = parcala('+905551234567');
  assert.equal(tr.ulke.kod, '+90');
  assert.equal(tr.yerel, '5551234567');
});

test('uzun ülke kodu kısa olanla KARIŞMIYOR', () => {
  const kg = parcala('+996555123456');
  assert.equal(kg.ulke.kod, '+996');
  assert.equal(kg.yerel, '555123456');
});

test('kısa kod, onun UZANTISI olan kodu gölgelemiyor', () => {
  /*
   * Şu anki listede çakışma yok; koruma İLERİSİ için. Listeye kısa bir
   * kodun uzantısı eklenirse (aşağıdaki +1 / +12) sırasız arama numarayı
   * yanlış ülkeye yazardı — sessiz bir hata.
   *
   * `parcala` listeyi parametre aldığı için kural burada GERÇEKTEN
   * ölçülüyor; yoksa "ileride önemli" diye yazılmış bir kural hiç
   * doğrulanamazdı.
   */
  const liste = [
    { kod: '+1', ad: 'A', bayrak: '🇦' },
    { kod: '+12', ad: 'B', bayrak: '🇧' },
  ];
  assert.equal(parcala('+12555000', liste).ulke.kod, '+12', 'kısa kod uzun olanı gölgeledi');
  assert.equal(parcala('+13555000', liste).ulke.kod, '+1');
});

test('temizleme diğer ülkelerde numarayı BOZMUYOR', () => {
  // Aşırı hevesli bir temizlik, baştaki rakamı geçerli olan numaraları kırardı.
  assert.equal(yerelKismiTemizle('7712345678', '+996'), '7712345678');
});

test('telefon girilen ekranların HEPSİ ortak bileşeni kullanıyor', () => {
  /*
   * Tek bir ekran eski tek-kutuyu kullanmaya devam ederse, ülke kodu orada
   * yine unutulur ve aynı sessiz hata geri gelir.
   */
  const kok = join(import.meta.dirname, '..');
  for (const ad of [
    'app/auth/customer.tsx',
    'app/auth/expert.tsx',
    'app/auth/forgot.tsx',
    'app/profile/phone.tsx',
  ]) {
    const kod = readFileSync(join(kok, ad), 'utf8');
    assert.match(kod, /<TelefonGirdisi/, `${ad}: ülke kodu ayrı girilmiyor`);
  }
});
