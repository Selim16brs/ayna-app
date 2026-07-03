import { z } from 'zod';

// §12.4 — kullanıcı/pro depozito itirazı veya iade dekontu açar
export const fileDisputeSchema = z.object({
  bookingRef: z.string().min(1).max(80),
  proName: z.string().min(1).max(200),
  service: z.string().max(200).optional(),
  kind: z.enum(['deposit', 'refund']),
  amount: z.number().min(0).max(10_000_000).optional(),
  receiptUri: z.string().max(600).optional(),
  note: z.string().max(600).optional(),
});
export type FileDisputeInput = z.infer<typeof fileDisputeSchema>;

// Admin karar verir (itiraz çözümü)
export const resolveDisputeSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  resolution: z.string().max(600).optional(),
});
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;
