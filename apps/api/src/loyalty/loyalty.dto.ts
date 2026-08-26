import { z } from 'zod';

/**
 * `points` KALDIRILDI — tutarı sunucu belirler (bkz. earn-rules.ts).
 *
 * Eski şema istemcinin 1..10000 arası herhangi bir değer göndermesine izin
 * veriyordu ve servis bunu doğrulamasız yazıyordu. Alanı şemadan çıkarmak,
 * eski istemcilerin gönderdiği değerin sessizce yok sayılmasını sağlar
 * (Zod bilinmeyen alanı düşürür), yeni istemci ise hiç göndermez.
 */
export const earnSchema = z.object({
  reason: z.string().min(1).max(80),
  detail: z.string().max(200).optional(),
});

export const redeemSchema = z.object({
  rewardId: z.string().min(1),
});

export type EarnInput = z.infer<typeof earnSchema>;
export type RedeemInput = z.infer<typeof redeemSchema>;
