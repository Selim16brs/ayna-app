import { z } from 'zod';

export const registerBusinessSchema = z.object({
  name: z.string().min(2),
  ownerName: z.string().min(2),
  phone: z.string().min(7),
  password: z.string().min(6),
  email: z.string().email().optional(),
  sector: z.string().min(1),
  categories: z.array(z.string()).default([]),
  city: z.string().min(1),
  district: z.string().min(1),
  address: z.string().min(3),
  // §5.1.4 — haritadan iğneyle seçilen konum (opsiyonel)
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  workingHours: z.string().optional(),
  taxId: z.string().optional(),
  docUrl: z.string().optional(),
});

export const rejectSchema = z.object({ reason: z.string().min(1) });

export type RegisterBusinessInput = z.infer<typeof registerBusinessSchema>;
export type RejectInput = z.infer<typeof rejectSchema>;
