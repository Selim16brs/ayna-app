import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  password: z.string().min(6),
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
  phone: z.string().min(7),
  /**
   * SMS'in dili. İstemciden geliyor çünkü kullanıcının HENÜZ HESABI YOK —
   * kayıt akışında sunucunun tercihi bilebileceği bir yer de yok. Boşsa
   * 'tr' (kaynak dil). Geçersiz değer reddediliyor: uydurma bir dil kodu
   * mesajı sessizce yanlış dile düşürürdü.
   */
  locale: z.enum(['tr', 'kk', 'ru']).optional(),
});
export const otpVerifySchema = z.object({
  phone: z.string().min(7),
  code: z.string().regex(/^\d{6}$/, '6 haneli kod'),
});

// §3.3 — Şifre sıfırlama: OTP doğrulanmış telefona yeni parola
export const resetPasswordSchema = z.object({
  phone: z.string().min(7),
  code: z.string().regex(/^\d{6}$/, '6 haneli kod'),
  newPassword: z.string().min(6),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
