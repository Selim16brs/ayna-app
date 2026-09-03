import { z } from 'zod';

// §profil-onay — salon/uzman profil değişiklik talebi (önerilen alanların JSON'u)
export const submitProfileChangeSchema = z.object({
  changes: z.record(z.string(), z.unknown()),
});
export type SubmitProfileChangeInput = z.infer<typeof submitProfileChangeSchema>;

/**
 * Telefon değişikliği — yalnız YENİ numara.
 *
 * SMS kodu YOK: kurucu kararı. Bu akışın hakemi admin; numara doğrulaması
 * kayıt/doğrulama ekranında yapılıyor, burada tekrarlanmıyor.
 */
export const phoneChangeSchema = z.object({
  phone: z.string().min(7),
});
export type PhoneChangeInput = z.infer<typeof phoneChangeSchema>;
