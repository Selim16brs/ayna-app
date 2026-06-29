import { z } from 'zod';

export const createQuoteRequestSchema = z.object({
  categoryId: z.string().min(1), // kategori CODE'u (örn. 'hair')
  note: z.string().max(500).optional(),
  photoUrl: z.string().optional(),
});

export type CreateQuoteRequestInput = z.infer<typeof createQuoteRequestSchema>;
