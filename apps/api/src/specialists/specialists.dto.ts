import { z } from 'zod';

export const registerSpecialistSchema = z
  .object({
    name: z.string().min(2),
    phone: z.string().min(7),
    password: z.string().min(6),
    email: z.string().email().optional(),
    city: z.string().optional(),
    /*
     * GERÇEK KONUM — haritadan iğneyle. Kayıtta hiç toplanmıyordu; canlıda
     * 25 uzmanın hiçbirinde koordinat yoktu ve haritadaki pinler şehir
     * merkezi etrafına uydurularak dağıtılıyordu.
     */
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    kind: z.enum(['salon_bound', 'independent']),
    sector: z.string().max(40).optional(), // uzmanın ana kategorisi (harita/kategori filtresi)
    /*
     * §9.5 — kayıtta seçilen GERÇEK hizmet listesi.
     *
     * ARTIK ZORUNLU (kurucu kararı). Opsiyoneldi ve 25 kayıttan 24'ü boş
     * geçmişti: haritadan ya da aramadan gelen kullanıcı seçecek hiçbir şey
     * bulamıyor, uzmanın kartı bomboş açılıyordu.
     *
     * SONRADAN DEĞİŞTİRİLEBİLİR: `setMyServices` uçları admin onayı
     * beklemeden anında yazıyor (§profil-anında). Zorunluluk kaydı
     * kilitlemiyor, yalnız boş başlamayı engelliyor.
     */
    services: z
      .array(
        z.object({
          id: z.string().min(1).max(60),
          name: z.string().min(1).max(120),
          price: z.number().int().nonnegative().max(100_000_000),
          durationMin: z.number().int().positive().max(1440),
        }),
      )
      .min(1, 'En az bir hizmet seçilmeli')
      .max(60),
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

/** Haritadan iğneyle gelen konum (mevcut uzman/salonun düzeltmesi). */
export const konumSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().max(200).optional(),
  district: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
});
export type KonumInput = z.infer<typeof konumSchema>;
