import { z } from 'zod';

export const boniSchema = z.object({ question: z.string().min(2).max(500) });
export const photoSchema = z.object({
  imageUrl: z.string().optional(),
  note: z.string().max(500).optional(),
});
export const searchSchema = z.object({ query: z.string().min(2).max(200) });
export const premiumSchema = z.object({ value: z.boolean() });

export type BoniInput = z.infer<typeof boniSchema>;
export type PhotoInput = z.infer<typeof photoSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type PremiumInput = z.infer<typeof premiumSchema>;
