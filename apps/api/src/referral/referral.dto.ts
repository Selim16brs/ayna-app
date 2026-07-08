import { z } from 'zod';

// EK Z.6 — davet kodu kullan
export const redeemReferralSchema = z.object({
  code: z.string().min(4).max(12),
});
export type RedeemReferralInput = z.infer<typeof redeemReferralSchema>;
