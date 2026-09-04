import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sifreDurumu, sifreGecerli } from './sifre.js';

/** ŞİFRE KURALI — en az 6 karakter + 1 büyük harf + 1 rakam. */

test('KURALI KARŞILAYAN şifre kabul ediliyor', () => {
  assert.equal(sifreGecerli('Ayna2026'), true);
  assert.equal(sifreGecerli('aB3xyz'), true);
});

test('EKSİK olan koşul TEK TEK bildiriliyor', () => {
  // Ekranda "şifre geçersiz" demek yetmiyor: kullanıcı NEYİ eklemesi
  // gerektiğini görmeli.
  const kisa = sifreDurumu('Ab1');
  assert.deepEqual(
    { u: kisa.uzunlukTamam, b: kisa.buyukHarfVar, r: kisa.rakamVar },
    { u: false, b: true, r: true },
  );
  const buyuksuz = sifreDurumu('ayna2026');
  assert.equal(buyuksuz.buyukHarfVar, false);
  assert.equal(buyuksuz.gecerli, false);
  const rakamsiz = sifreDurumu('AynaGuzel');
  assert.equal(rakamsiz.rakamVar, false);
  assert.equal(rakamsiz.gecerli, false);
});

test('KİRİL ve TÜRKÇE büyük harfler de sayılıyor', () => {
  /*
   * `/[A-Z]/` yazsaydım "Пароль2026" ve "Şifre2026" reddedilirdi:
   * kullanıcı kuralı karşıladığı hâlde geçemezdi. Uygulamanın birincil
   * dilleri kk ve ru — bu bir ayrıntı değil.
   */
  assert.equal(sifreGecerli('Пароль2026'), true, 'Kiril büyük harf sayılmıyor');
  assert.equal(sifreGecerli('Şifre2026'), true, 'Türkçe büyük harf sayılmıyor');
  assert.equal(sifreGecerli('Құпия2026'), true, 'Kazakça büyük harf sayılmıyor');
  // Küçük Kiril büyük harf SAYILMAMALI.
  assert.equal(sifreDurumu('пароль2026').buyukHarfVar, false);
});

test('RAKAM OLMAYAN karakterler rakam sayılmıyor', () => {
  // Kiril/Türkçe harfler rakam değildir; "٣" gibi Arap rakamları da
  // ASCII rakam yerine geçmiyor — parola kontrolü öngörülebilir kalsın.
  assert.equal(sifreDurumu('Ayna٣٣٣٣').rakamVar, false);
});

test('BOŞ şifre reddediliyor', () => {
  const d = sifreDurumu('');
  assert.deepEqual(
    { u: d.uzunlukTamam, b: d.buyukHarfVar, r: d.rakamVar, g: d.gecerli },
    { u: false, b: false, r: false, g: false },
  );
});
