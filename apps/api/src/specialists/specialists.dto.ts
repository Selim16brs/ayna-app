import { z } from 'zod';

export const registerSpecialistSchema = z
  .object({
    name: z.string().min(2),
    phone: z.string().min(7),
    password: z.string().min(6),
    email: z.string().email().optional(),
    city: z.string().optional(),
    kind: z.enum(['salon_bound', 'independent']),
    sector: z.string().max(40).optional(), // uzmanın ana kategorisi (harita/kategori filtresi)
    // §9.5 — kayıtta seçilen GERÇEK hizmet listesi. Eskiden gönderilmiyordu:
    // servicesJson boş kalıyor, profil de sektörün VARSAYILAN menüsünü uyduruyordu
    // (uzmanın hiç seçmediği hizmetler fiyatlarıyla listeleniyordu).
    services: z
      .array(
        z.object({
          id: z.string().min(1).max(60),
          name: z.string().min(1).max(120),
          price: z.number().int().nonnegative().max(100_000_000),
          durationMin: z.number().int().positive().max(1440),
        }),
      )
      .max(60)
      .optional(),
    bio: z.string().optional(),
    photoDataUrl: z.string().max(12_000_000).optional(),
    birthDateMs: z.number().int().positive().optional(),
    businessId: z.string().optional(),
    code: z.string().optional(),
    certificates: z.array(z.string()).default([]),
    // §uzman onboarding — resmî/kimlik (salon epic paralel)
    // freelance (serbest, kayıtsız) | ip (kayıtlı bireysel girişimci ИП, IIN zorunlu)
    entityType: z.enum(['freelance', 'ip']).default('freelance'),
    iin: z.string().optional(),
    // §4.4 — cihaz parmak izi (platform-izinli tanımlayıcı); kalıcı engel kontrolü için
    deviceFp: z.string().max(200).optional(),
  })
  .superRefine((v, ctx) => {
    // Kayıtlı ИП uzman → 12 haneli IIN zorunlu (Seviye-1 format doğrulama)
    if (v.entityType === 'ip') {
      if (!v.iin || !/^\d{12}$/.test(v.iin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['iin'],
          message: 'IIN 12 haneli olmalı',
        });
      }
    }
  });

export type RegisterSpecialistInput = z.infer<typeof registerSpecialistSchema>;
