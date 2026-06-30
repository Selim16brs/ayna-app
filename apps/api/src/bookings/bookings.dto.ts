import { z } from 'zod';

export const createBookingSchema = z.object({
  id: z.string().min(1),
  source: z.enum(['direct', 'photo_quote', 'demand']),
  service: z.string().min(1),
  proId: z.string().optional(),
  proName: z.string().min(1),
  proImage: z.string(),
  uzmanName: z.string().optional(),
  dateLabel: z.string().min(1),
  inDays: z.number().int(),
  price: z.number().nonnegative(),
  status: z.enum(['confirmed', 'pending', 'completed', 'cancelled']).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
