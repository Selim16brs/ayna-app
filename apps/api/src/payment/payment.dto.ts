import { z } from 'zod';

// EK Z.8 — ödeme niyeti oluştur
export const createPaymentSchema = z.object({
  bookingId: z.string().min(1).max(80),
  pointsRequested: z.number().int().min(0).max(10_000_000).optional(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
