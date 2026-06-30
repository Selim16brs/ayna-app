import { z } from 'zod';

export const setMarketSchema = z.object({
  category: z.string().min(1),
  city: z.string().optional(),
  basePrice: z.number().positive(),
});

export type SetMarketInput = z.infer<typeof setMarketSchema>;
