import { z } from 'zod';

// EK Z.3 — uzman/salon KYC belge gönderimi
export const submitKycSchema = z.object({
  docType: z.enum(['id_card', 'passport', 'certificate']),
  /*
   * ── BELGE = FOTOĞRAF, ADRES DEĞİL ──────────────────────────────────
   *
   * Sınır `max(600)` idi: bir ADRES uzunluğu. Uygulama ise kimlik
   * fotoğrafını `data:image/jpeg;base64,...` olarak gönderiyor — on
   * binlerce karakter. Yani DOĞRULAMA GÖNDER her seferinde "Geçersiz
   * veri" ile reddediliyordu; uzman fotoğrafı yüklüyor, gönderemiyordu.
   *
   * Sınır gerçek yüke göre: 8 MB'lık bir data URL yaklaşık 11M karakter.
   * Beş belge için üst sınır cömert ama sonsuz değil.
   */
  documents: z.array(z.string().min(1).max(12_000_000)).min(1).max(5),
});
export type SubmitKycInput = z.infer<typeof submitKycSchema>;

// Admin ret notu
export const rejectKycSchema = z.object({
  note: z.string().max(400).optional(),
});
export type RejectKycInput = z.infer<typeof rejectKycSchema>;
