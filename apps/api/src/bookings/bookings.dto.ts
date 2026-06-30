import { z } from 'zod';

export const createBookingSchema = z.object({
  id: z.string().min(1),
  source: z.enum(['direct', 'photo_quote', 'demand']),
  service: z.string().min(1),
  proId: z.string().optional(),
  proName: z.string().min(1),
  proImage: z.string(),
  uzmanName: z.string().optional(),
  customerName: z.string().max(80).optional(),
  bookingKind: z.enum(['normal', 'group', 'express']).optional(),
  groupSize: z.number().int().min(2).max(20).optional(),
  dateLabel: z.string().min(1),
  inDays: z.number().int(),
  price: z.number().nonnegative(),
  status: z
    .enum([
      'confirmed',
      'pending',
      'completed',
      'cancelled',
      'awaiting_provider',
      'alternative_proposed',
      'no_show',
      'waitlist',
    ])
    .optional(),
});

export const dateLabelSchema = z.object({ dateLabel: z.string().min(1) });

// §6.C — iptal sebebi (opsiyonel)
export const cancelSchema = z.object({ reason: z.string().max(300).optional() });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type DateLabelInput = z.infer<typeof dateLabelSchema>;
export type CancelInput = z.infer<typeof cancelSchema>;
