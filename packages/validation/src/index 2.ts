import { z } from 'zod';

// @ayna/validation — API ve client arasında paylaşılan Zod şemaları
// Bkz. docs/planning/07-api-conventions.md §9

export const localeSchema = z.enum(['kk', 'ru']);

export const phoneE164Schema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'E.164 formatında telefon numarası bekleniyor');

/** OTP iste — POST /auth/request-otp */
export const requestOtpSchema = z.object({
  phone: phoneE164Schema,
});
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

/** OTP doğrula — POST /auth/verify-otp */
export const verifyOtpSchema = z.object({
  phone: phoneE164Schema,
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

/** Cursor sayfalama query — docs/planning/07 §3 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type PaginationInput = z.infer<typeof paginationSchema>;
