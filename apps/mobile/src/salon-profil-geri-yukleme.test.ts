import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * KAYITTA GİRİLENLER PROFİLE GERİ YÜKLENİYOR MU?
 *
 * Kurucu: "yeni salon ve uzman kayıt olduğunda adres ve diğer bilgileri
 * belirttiği halde kayıt sonrasında profilinde görünmüyor. her şeyi bir
 * daha doldurması gerekiyor. büyük bir hata."
 *
 * ── SEBEP ───────────────────────────────────────────────────────────────
 *
 * Salon düzenleme ekranı `myBusinesses` isteğini ZATEN atıyordu ve yanıt
 * adresi, ilçeyi, alanları ve telefonu TAŞIYORDU — ama ekran yalnız
 * Instagram alanlarını okuyup gerisini ATIYORDU.
 *
 * Formun kaynağı yerel `salonProfile` dilimiydi: boş başlıyor ve yalnız
 * ONAYLANMIŞ bir profil değişikliğinden doluyor. Yani kayıt verisi
 * hiçbir zaman forma ulaşmıyordu.
 */

const yorumsuz = (x: string) =>
  x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const ekran = yorumsuz(readFileSync(join(__dirname, '..', 'app', 'salon', 'edit.tsx'), 'utf8'));
const yukleme = ekran.slice(ekran.indexOf('.myBusinesses('), ekran.indexOf('const genSocialCode'));

test('ADRES kayıttan geri yükleniyor', () => {
  assert.match(yukleme, /setAddress\(/, 'adres geri yüklenmiyor');
  // İlçe + açık adres birlikte anlamlı; yalnız biri yarım bir adres olurdu.
  assert.match(yukleme, /b\.district/, 'ilçe kullanılmıyor');
  assert.match(yukleme, /b\.address/, 'açık adres kullanılmıyor');
});

test('İLETİŞİM ve HİZMET ALANLARI geri yükleniyor', () => {
  assert.match(yukleme, /setContact\([\s\S]{0,120}b\.phone/, 'iletişim geri yüklenmiyor');
  assert.match(yukleme, /setAreas\([\s\S]{0,120}b\.categories/, 'hizmet alanları geri yüklenmiyor');
});

test('KULLANICININ YAZDIĞI EZİLMİYOR', () => {
  /*
   * Ekran her açıldığında sunucudan gelen değer forma yazılsaydı,
   * kullanıcının az önce düzenlediği metin kaybolurdu. Yalnız alan BOŞSA
   * dolduruluyor.
   */
  assert.match(
    yukleme,
    /setAddress\(\(mevcut\) =>\s*mevcut\.trim\(\)\s*\?\s*mevcut/,
    'adres koşulsuz eziliyor',
  );
  assert.match(
    yukleme,
    /setContact\(\(mevcut\) => mevcut\.trim\(\) \|\|/,
    'iletişim koşulsuz eziliyor',
  );
  assert.match(
    yukleme,
    /setAreas\(\(mevcut\) => \(mevcut\.length \? mevcut/,
    'alanlar koşulsuz eziliyor',
  );
});

test('ÇALIŞMA SAATLERİ metinden ÇÖZÜLMÜYOR', () => {
  /*
   * Sunucuda biçimli metin olarak duruyor ("Pzt 09:00-18:00, …"). Onu
   * yapıya geri çevirmek tahmine dayanır ve yanlış çözülen bir saat,
   * salonun KAPALI olduğu bir güne randevu almasına yol açar. Saatlerin
   * yapılı kaynağı `myHours` ucu.
   */
  assert.doesNotMatch(yukleme, /parseHours|b\.workingHours\s*\)/, 'saat metinden çözülüyor');
});
