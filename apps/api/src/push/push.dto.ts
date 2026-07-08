import { z } from 'zod';

// EK Z.5 — cihaz push token kaydı
export const registerTokenSchema = z.object({
  token: z.string().min(1).max(200),
  platform: z.string().max(20).optional(),
});
export type RegisterTokenInput = z.infer<typeof registerTokenSchema>;
