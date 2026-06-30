import { z } from 'zod';

export const earnSchema = z.object({
  points: z.number().int().positive().max(10000),
  reason: z.string().min(1),
  detail: z.string().max(200).optional(),
});

export const redeemSchema = z.object({
  rewardId: z.string().min(1),
});

export type EarnInput = z.infer<typeof earnSchema>;
export type RedeemInput = z.infer<typeof redeemSchema>;
