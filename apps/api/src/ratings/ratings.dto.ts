import { z } from 'zod';

export const submitRatingSchema = z.object({
  bookingId: z.string().min(1),
  raterRole: z.enum(['user', 'specialist']),
  // subjectId sunucuda randevudan türetilir; istemci göndermese de olur (güvenlik)
  subjectId: z.string().min(1).optional(),
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
  serviceTag: z.string().max(80).optional(),
  // Gizlilik: kullanıcının seçtiği görünen ad (anonim ise "Doğrulanmış üye")
  authorLabel: z.string().max(60).optional(),
  // EK Z.10 — öncesi/sonrası foto galerisi (URI listesi, en fazla 4)
  photos: z.array(z.string().min(1).max(600)).max(4).optional(),
});

export const thresholdSchema = z.object({ value: z.number().int().min(1).max(50) });

// §6.D — uzman/işletme yanıtı
export const replySchema = z.object({ reply: z.string().min(1).max(500) });

// §7.2 — negatif yoruma itiraz (kısa gerekçe; opsiyonel)
export const disputeSchema = z.object({ reason: z.string().max(500).optional().default('') });

export type SubmitRatingInput = z.infer<typeof submitRatingSchema>;
export type ThresholdInput = z.infer<typeof thresholdSchema>;
export type ReplyInput = z.infer<typeof replySchema>;
export type DisputeInput = z.infer<typeof disputeSchema>;
