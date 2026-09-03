import { z } from 'zod';

// §profil-onay — salon/uzman profil değişiklik talebi (önerilen alanların JSON'u)
export const submitProfileChangeSchema = z.object({
  changes: z.record(z.string(), z.unknown()),
});
export type SubmitProfileChangeInput = z.infer<typeof submitProfileChangeSchema>;

/**
 * Telefon değişikliği — YENİ numara + o numaraya gelen SMS kodu.
 *
 * Kod ZORUNLU: admin formdaki numaranın başvurana ait olduğunu göremez.
 * Kodsuz bir talep, başkasının numarasını yazıp onay bekleyerek hesap
 * devralmanın yolu olurdu (telefon giriş kimliği — §4.6).
 */
export const phoneChangeSchema = z.object({
  phone: z.string().min(7),
  code: z.string().min(4).max(8),
});
export type PhoneChangeInput = z.infer<typeof phoneChangeSchema>;
