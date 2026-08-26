import { z } from 'zod';

export const savePassportSchema = z.object({
  allergies: z.array(z.string().min(1).max(80)).max(20).optional(),
  quietVisit: z.boolean().optional(),
  noPhotos: z.boolean().optional(),
  notifyLate: z.boolean().optional(),
  womenOnly: z.boolean().optional(),
  traits: z.record(z.string(), z.string().max(80)).optional(),
});
export type SavePassportInput = z.infer<typeof savePassportSchema>;

export const grantSchema = z.object({
  proId: z.string().min(1).max(64),
  bookingId: z.string().max(64).optional(),
});
export type GrantInput = z.infer<typeof grantSchema>;
