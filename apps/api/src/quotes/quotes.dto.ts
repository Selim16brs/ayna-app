import { z } from 'zod';

// §5.2 Faz A — talep aç (Mod 1 foto / Mod 2 anlat). Foto V1'de data URL olarak taşınır
// (nesne depolama sonraki faz); 15MB gövde limiti main.ts'te ayarlı.
export const createQuoteRequestSchema = z.object({
  category: z.string().min(2).max(40), // ServiceCategory.code (hair, nails…)
  mode: z.enum(['photo', 'describe']),
  note: z.string().max(600).optional(),
  photoDataUrl: z.string().max(12_000_000).optional(),
  budget: z.number().int().positive().max(10_000_000).optional(),
  collectMin: z.number().int().min(60).max(1440).default(180),
  serviceId: z.string().max(60).optional(),
});

// Uzman teklifi: fiyat + süre + not + önerilen 1-3 müsait başlangıç (UTC ms)
export const submitQuoteSchema = z.object({
  price: z.number().int().positive().max(10_000_000),
  etaMin: z.number().int().min(5).max(600),
  note: z.string().max(300).optional(),
  slots: z.array(z.number().int().positive()).min(1).max(3),
});

// Kullanıcı seçimi: kazanan teklif + kesin başlangıç (teklifin slots'undan biri)
export const selectQuoteSchema = z.object({
  quoteId: z.string().uuid(),
  slotMs: z.number().int().positive(),
});

export type CreateQuoteRequestInput = z.infer<typeof createQuoteRequestSchema>;
export type SubmitQuoteInput = z.infer<typeof submitQuoteSchema>;
export type SelectQuoteInput = z.infer<typeof selectQuoteSchema>;
