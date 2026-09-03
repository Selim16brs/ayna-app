import { z } from 'zod';

export const reklamSiparisSchema = z.object({
  /*
   * `proId` ARTIK ALINMIYOR. İstemci kullanıcı kimliğini gönderiyordu ve
   * sunucu doğrulamadan kaydediyordu; kart olmayan bir uzmana gidiyordu.
   * Kimlik sunucuda oturumdan türetiliyor (`uzmanKimligi`).
   */
  proName: z.string().min(1).max(120),
  placement: z.enum(['firsatlar', 'one_cikanlar']),
  title: z.string().min(2).max(80),
  subtitle: z.string().max(120).optional(),
  /** Kurucu isteği — reklamın neyi anlattığı. Kendi sayfasında gösterilir. */
  description: z.string().max(600).optional(),
  image: z.string().min(1),
  months: z.number().int().min(1).max(12).optional(),
});
export type ReklamSiparisInput = z.infer<typeof reklamSiparisSchema>;

export const reklamDekontSchema = z.object({ receiptUri: z.string().min(1) });
export type ReklamDekontInput = z.infer<typeof reklamDekontSchema>;
