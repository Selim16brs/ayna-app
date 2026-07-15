import { z } from 'zod';

// §keşif Modül 2 — kampanya oluşturma. Sahip (uzman/salon) hesaptan türetilir;
// istemci ownerType/proId GÖNDEREMEZ (yetki sunucuda).
export const createOfferSchema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().max(400).default(''),
  // kk/ru override'lar (opsiyonel; mevcut kampanya i18n deseni)
  i18n: z
    .object({
      kk: z.object({ title: z.string().max(80), description: z.string().max(400) }).partial(),
      ru: z.object({ title: z.string().max(80), description: z.string().max(400) }).partial(),
    })
    .partial()
    .optional(),
  sector: z.string().max(40).default('hair'),
  discountType: z.enum(['percent', 'fixed_price']).default('percent'),
  discountValue: z.number().positive(),
  basePrice: z.number().positive(),
  validDays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  timeFrom: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .or(z.literal(''))
    .default(''),
  timeTo: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .or(z.literal(''))
    .default(''),
  startsAtMs: z.number().int().positive(),
  endsAtMs: z.number().int().positive(),
  slotQuota: z.number().int().min(1).max(500).optional(),
  imageDataUrl: z.string().max(12_000_000).optional(),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
