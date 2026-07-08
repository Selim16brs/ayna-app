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
  identifier: z.string().min(3), // e-posta veya telefon
  password: z.string().min(6),
});

// §4.6 — OTP
export const otpRequestSchema = z.object({ phone: z.string().min(7) });
export const otpVerifySchema = z.object({
  phone: z.string().min(7),
  code: z.string().regex(/^\d{6}$/, '6 haneli kod'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
