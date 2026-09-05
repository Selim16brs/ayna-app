import { z } from 'zod';
import { sifreGecerli } from '@ayna/domain';

/*
 * ŞİFRE KURALI YALNIZ YENİ ŞİFRELERDE.
 *
 * `loginSchema` BİLEREK dokunulmadı: girişte de dayatsaydık kuralı
 * karşılamayan eski şifreyle kayıtlı herkes bir gecede uygulamadan
 * kilitlenirdi. Kurucu: "şu andaki kayıtlı olanlar kalsın ama bundan
 * sonrakilerde dikkat edelim."
 */
/**
 * TELEFON — ULUSLARARASI BİÇİM ZORUNLU.
 *
 * Kural yalnız `min(7)` idi: biçime hiç bakılmıyordu. Bu, veritabanı
 * anahtarını sessizce bozuyor.
 *
 * `phoneHash` = HMAC(normalizePhone(x)) ve `normalizePhone` yalnız rakam
 * dışını siliyor. Yani aynı kişinin numarası:
 *     "+7 777 123 45 67"  →  77771234567
 *     "8 777 123 45 67"   →  87771234567   ← BAŞKA bir hash
 * İkisi FARKLI kullanıcı sayılıyor: ya ikinci bir hesap açılıyor ya da
 * kullanıcı kayıt olduğu numarayla giriş yapamıyor.
 *
 * Normalizasyonu düzeltmek yerine GİRİŞ BİÇİMİ daraltıldı, çünkü kayıtlı
 * hash'ler bugünkü kurala göre üretilmiş: `normalizePhone` değiştirilseydi
 * mevcut kullanıcıların tamamı bir gecede kilitlenirdi. Uygulama zaten
 * `tamNumara()` ile "+" önekli gönderiyor; "+"'sız gelen istek ZATEN yanlış
 * hash üretiyordu, artık sessizce bozuk kayıt yapmak yerine reddediliyor.
 *
 * E.164: "+" + ülke kodu (0 ile başlamaz) + numara, toplam en fazla 15 hane.
 */
const telefon = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, 'Telefon uluslararası biçimde olmalı (örn. +77001234567)');

const yeniSifre = z
  .string()
  .min(6)
  .refine(sifreGecerli, { message: 'Şifre en az bir büyük harf ve bir rakam içermeli' });

/**
 * Telefonun ülkesi — ISO 3166-1 alfa-2.
 *
 * Numaradan TÜRETİLMİYOR: "+7" hem Kazakistan hem Rusya, ikisi ayrılamaz.
 * Kullanıcının seçtiği ülke tek doğru kaynak. Opsiyonel, çünkü eski
 * istemciler göndermiyor ve kayıt onlar için de çalışmalı.
 */
const ulkeIso = z.string().regex(/^[A-Z]{2}$/, 'ISO 3166-1 alfa-2 bekleniyor').optional();

export const registerSchema = z.object({
  name: z.string().min(2),
  phone: telefon,
  phoneCountry: ulkeIso,
  password: yeniSifre,
  email: z.string().email().optional(),
  city: z.string().optional(),
  gender: z.enum(['female', 'unspecified']).optional(),
  photoDataUrl: z.string().max(12_000_000).optional(),
  birthDateMs: z.number().int().positive().optional(),
});

export const loginSchema = z.object({
  identifier: z.string().min(3), // e-posta, telefon ya da 'admin' takma adı
  password: z.string().min(5),
});

// §4.6 — OTP
export const otpRequestSchema = z.object({
  phone: telefon,
  /**
   * SMS'in dili. İstemciden geliyor çünkü kullanıcının HENÜZ HESABI YOK —
   * kayıt akışında sunucunun tercihi bilebileceği bir yer de yok. Boşsa
   * 'tr' (kaynak dil). Geçersiz değer reddediliyor: uydurma bir dil kodu
   * mesajı sessizce yanlış dile düşürürdü.
   */
  locale: z.enum(['tr', 'kk', 'ru']).optional(),
});
export const otpVerifySchema = z.object({
  phone: telefon,
  code: z.string().regex(/^\d{6}$/, '6 haneli kod'),
});

// §3.3 — Şifre sıfırlama: OTP doğrulanmış telefona yeni parola
export const resetPasswordSchema = z.object({
  phone: telefon,
  code: z.string().regex(/^\d{6}$/, '6 haneli kod'),
  // Şifre SIFIRLAMA da yeni bir şifre üretiyor: aynı kural.
  newPassword: yeniSifre,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
