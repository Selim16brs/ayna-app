import { z } from 'zod';

export const registerSpecialistSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  password: z.string().min(6),
  email: z.string().email().optional(),
  city: z.string().optional(),
  kind: z.enum(['salon_bound', 'independent']),
  bio: z.string().optional(),
  businessId: z.string().optional(),
  code: z.string().optional(),
  certificates: z.array(z.string()).default([]),
});

export type RegisterSpecialistInput = z.infer<typeof registerSpecialistSchema>;
