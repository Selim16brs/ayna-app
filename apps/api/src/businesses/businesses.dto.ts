import { z } from 'zod';

export const registerBusinessSchema = z
  .object({
    name: z.string().min(2), // marka / görünen ad
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
    // §3.1/§3.2 — resmî işletme kimliği (KZ)
    entityType: z.enum(['llp', 'ip', 'freelance', 'branch']),
    bin: z.string().optional(),
    legalName: z.string().max(200).optional(),
    managerName: z.string().max(120).optional(),
    oked: z.string().max(20).optional(),
    vatPayer: z.boolean().optional(),
    foundedYear: z.number().int().min(1900).max(2100).optional(),
    womenOnly: z.boolean().optional(),
    docType: z.string().max(60).optional(),
    socialInstagram: z.string().max(60).optional(),
    socialTiktok: z.string().max(60).optional(),
  })
  .superRefine((v, ctx) => {
    // Tüzel kişi (LLP) veya bireysel girişimci (ИП): BİN/IIN 12 hane + resmî ad zorunlu.
    if (v.entityType === 'llp' || v.entityType === 'ip') {
      if (!/^\d{12}$/.test(v.bin ?? '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bin'],
          message: 'BİN/IIN 12 haneli sayı olmalı',
        });
      }
      if (!v.legalName || v.legalName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['legalName'],
          message: 'Resmî işletme adı zorunlu',
        });
      }
    }
  });

export const rejectSchema = z.object({ reason: z.string().min(1) });

export type RegisterBusinessInput = z.infer<typeof registerBusinessSchema>;
export type RejectInput = z.infer<typeof rejectSchema>;
