import { z } from 'zod';

export const reklamSiparisSchema = z.object({
  proId: z.string().min(1).max(64),
  proName: z.string().min(1).max(120),
  placement: z.enum(['firsatlar', 'one_cikanlar']),
  title: z.string().min(2).max(80),
  subtitle: z.string().max(120).optional(),
  image: z.string().min(1),
  months: z.number().int().min(1).max(12).optional(),
});
export type ReklamSiparisInput = z.infer<typeof reklamSiparisSchema>;

export const reklamDekontSchema = z.object({ receiptUri: z.string().min(1) });
export type ReklamDekontInput = z.infer<typeof reklamDekontSchema>;
