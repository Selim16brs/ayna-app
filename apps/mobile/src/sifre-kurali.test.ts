import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const yorumsuz = (k: string) =>
  k.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const oku = (...p: string[]) => yorumsuz(readFileSync(join(__dirname, '..', ...p), 'utf8'));

/** ŞİFRE KURALI ÜÇ KAYIT EKRANINDA DA — ve kullanıcıya YAZILI. */

test('ÜÇ kayıt ekranı da kuralı uyguluyor ve GÖSTERİYOR', () => {
  for (const [yol, ad] of [
    [['app', 'auth', 'customer.tsx'], 'müşteri'],
    [['app', 'auth', 'expert.tsx'], 'uzman'],
    [['app', 'auth', 'business', 'new.tsx'], 'salon'],
  ] as const) {
    const k = oku(...(yol as unknown as string[]));
    assert.match(k, /sifreGecerli\(password\)/, `${ad}: kural uygulanmıyor`);
    assert.match(k, /<SifreKurali sifre=\{password\} \/>/, `${ad}: kural kullanıcıya yazılmıyor`);
    // Eski "en az 6 karakter" ipucu KALDIRILDI: iki farklı kural yazan
    // iki satır kullanıcıyı yanıltırdı.
    assert.doesNotMatch(k, /auth\.f\.password_hint/, `${ad}: eski ipucu duruyor`);
  }
});

test('KURAL karşılandıkça İŞARETLENİYOR', () => {
  // "Şifre geçersiz" demek kullanıcıya NEYİ eklemesi gerektiğini
  // söylemiyor.
  const k = oku('src', 'ui', 'SifreKurali.tsx');
  assert.match(k, /d\.uzunlukTamam/, 'uzunluk maddesi yok');
  assert.match(k, /d\.buyukHarfVar/, 'büyük harf maddesi yok');
  assert.match(k, /d\.rakamVar/, 'rakam maddesi yok');
  // Boş formda kırmızı yok: henüz hata yapmamış birini azarlamak olurdu.
  assert.match(k, /const bos = sifre\.length === 0;/, 'boş form da kırmızı');
});

test('GİRİŞTE kural DAYATILMIYOR — eski şifreler kilitlenmiyor', () => {
  /*
   * Kurucu: "şu andaki kayıtlı olanlar kalsın ama bundan sonrakilerde
   * dikkat edelim." Girişte de dayatsaydık, kuralı karşılamayan eski
   * şifreyle kayıtlı herkes bir gecede uygulamadan kilitlenirdi.
   */
  const dto = yorumsuz(
    readFileSync(join(__dirname, '..', '..', 'api', 'src', 'auth', 'auth.dto.ts'), 'utf8'),
  );
  const giris = dto.slice(
    dto.indexOf('export const loginSchema'),
    dto.indexOf('export const otpRequestSchema'),
  );
  assert.doesNotMatch(
    giris,
    /yeniSifre/,
    'giriş kuralı da dayatıyor — eski kullanıcılar kilitlenir',
  );
  const kayit = dto.slice(
    dto.indexOf('export const registerSchema'),
    dto.indexOf('export const loginSchema'),
  );
  assert.match(kayit, /password: yeniSifre/, 'kayıt kuralı uygulamıyor');
  assert.match(dto, /newPassword: yeniSifre/, 'şifre sıfırlama kuralı uygulamıyor');
});
