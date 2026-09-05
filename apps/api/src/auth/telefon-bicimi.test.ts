import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  otpRequestSchema,
  otpVerifySchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.dto';

/**
 * TELEFON BİÇİMİ VERİTABANI ANAHTARIDIR.
 *
 * `phoneHash` = HMAC(normalizePhone(x)) ve `normalizePhone` yalnız rakam
 * dışını siliyor. Yani biçim serbest bırakılırsa aynı kişi iki ayrı hash
 * üretir:
 *     "+7 777 123 45 67" → 77771234567
 *     "8 777 123 45 67"  → 87771234567
 * Sonuç: ya ikinci bir hesap açılır ya da kullanıcı kendi numarasıyla giriş
 * yapamaz. Kural `min(7)` iken bu tamamen açıktı.
 *
 * Normalizasyonu düzeltmek SEÇİLMEDİ: kayıtlı hash'ler bugünkü kurala göre
 * üretilmiş, değiştirilseydi mevcut kullanıcılar kilitlenirdi. Onun yerine
 * giriş biçimi daraltıldı — bu test o daraltmanın gevşetilmediğini ölçüyor.
 */

const GECERLI = ['+77001234567', '+905321234567', '+996555123456', '+12025550123'];
const GECERSIZ = [
  '87771234567', // ulusal önek — "+" yok, BAŞKA hash üretir
  '05321234567', // TR ulusal öneki
  '77001234567', // "+" unutulmuş
  '+0771234567', // ülke kodu 0 ile başlayamaz
  '+7700', // çok kısa
  '+7 700 123 45 67', // boşluklu — normalize öncesi reddedilmeli
  '+7700123456789012', // 15 haneyi aşıyor
  'telefon', // metin
  '', // boş
];

test('KAYIT şeması yalnız E.164 kabul ediyor', () => {
  for (const p of GECERLI) {
    const r = registerSchema.safeParse({ name: 'Ayşe', phone: p, password: 'Sifre123' });
    assert.equal(r.success, true, `geçerli numara reddedildi: ${p}`);
  }
  for (const p of GECERSIZ) {
    const r = registerSchema.safeParse({ name: 'Ayşe', phone: p, password: 'Sifre123' });
    assert.equal(r.success, false, `geçersiz numara KABUL edildi: ${JSON.stringify(p)}`);
  }
});

test('OTP ve ŞİFRE SIFIRLAMA şemaları da aynı kuralda', () => {
  /*
   * Üçü de aynı `phoneHash`i arıyor. Biri gevşek kalsaydı kullanıcı kayıt
   * olabilir ama kod isteyemez (ya da tersi) duruma düşerdi.
   */
  assert.equal(otpRequestSchema.safeParse({ phone: '+77001234567' }).success, true);
  assert.equal(otpRequestSchema.safeParse({ phone: '87771234567' }).success, false);

  const kod = { code: '123456' };
  assert.equal(otpVerifySchema.safeParse({ phone: '+77001234567', ...kod }).success, true);
  assert.equal(otpVerifySchema.safeParse({ phone: '77001234567', ...kod }).success, false);

  const yeni = { ...kod, newPassword: 'Sifre123' };
  assert.equal(resetPasswordSchema.safeParse({ phone: '+77001234567', ...yeni }).success, true);
  assert.equal(resetPasswordSchema.safeParse({ phone: '05321234567', ...yeni }).success, false);
});
