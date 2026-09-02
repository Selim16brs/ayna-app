import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * ZAMANLAYICI UCUNUN GÜVENLİĞİ.
 *
 * Korumasız bir posta tetikleyicisi, kendi gönderim itibarımıza doğrultulmuş
 * bir spam topu: herkes çağırıp bütün listeye posta attırabilir.
 */

const kaynak = (ad: string) => readFileSync(join(__dirname, ad), 'utf8');
const kod = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

test('cron ucu SIRSIZ çalışmıyor', () => {
  const c = kod(kaynak('mail.controller.ts'));
  assert.match(c, /MAIL_CRON_SECRET/, 'sır okunmuyor');
  // Sır tanımlı değilse VARSAYILAN KAPALI olmalı; "yoksa serbest" değil.
  assert.match(c, /if \(!sir\) return false;/, 'sır yokken uç açık kalıyor');
});

test('sır SABİT ZAMANDA karşılaştırılıyor', () => {
  /*
   * `===` ile karşılaştırmak sızdırır: yanıt süresi ilk farklı karaktere
   * kadar uzuyor, saldırgan sırrı karakter karakter tahmin edebiliyor.
   */
  const c = kod(kaynak('mail.controller.ts'));
  assert.match(c, /timingSafeEqual/, 'sabit zamanlı karşılaştırma yok');
  // Uzunluk farkı `timingSafeEqual`i FIRLATIR; önce eşitlenmeli.
  assert.match(c, /a\.length !== b\.length/, 'uzunluk kontrolü yok — uç 500 döndürür');
});

test('GET de POST da kabul ediliyor', () => {
  // Çoğu zamanlayıcı düz GET atıyor. Yalnız POST açsaydık uç sessizce
  // yetkisiz döner, dağıtımı temiz görünen ama hiç koşmayan bir cron olurdu.
  const c = kod(kaynak('mail.controller.ts'));
  assert.match(c, /@Get\(\)/, 'GET yok');
  assert.match(c, /@Post\(\)/, 'POST yok');
});

test('bir adım düşerse koşu DEVAM ediyor', () => {
  // İade postası, geri kazanım sorgusu patladı diye gitmemezlik edemez.
  const s = kod(kaynak('mail.scheduler.ts'));
  assert.match(s, /try \{[\s\S]*?catch \(hata\)/, 'adımlar tek tek korunmuyor');
});

test('gönderim HATASI kaydediliyor, sessizce yutulmuyor', () => {
  const m = kod(kaynak('mailer.service.ts'));
  assert.match(m, /status: 'FAILED'/, 'başarısız gönderim kaydı yok');
  assert.match(m, /status: 'QUEUED'/, 'gönderim öncesi kayıt yok');
});

test('SİLİNMİŞ hesaba ve adressize gönderilmiyor', () => {
  const m = kod(kaynak('mailer.service.ts'));
  assert.match(m, /user\.status === 'deleted'/, 'silinmiş hesap kontrolü yok');
  assert.match(m, /!user\?\.email/, 'adres kontrolü yok');
});
