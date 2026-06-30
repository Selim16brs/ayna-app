import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  password: z.string().min(6),
  email: z.string().email().optional(),
  city: z.string().optional(),
});

export const loginSchema = z.object({
  identifier: z.string().min(3), // e-posta veya telefon
  password: z.string().min(6),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
