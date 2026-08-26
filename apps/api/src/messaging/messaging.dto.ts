import { z } from 'zod';

// EK Z.1 — sohbet başlat / getir (karşı taraf + opsiyonel randevu/talep bağlamı)
export const startConversationSchema = z.object({
  targetUserId: z.string().uuid(),
  bookingId: z.string().max(80).optional(),
  requestId: z.string().uuid().optional(),
});
export type StartConversationInput = z.infer<typeof startConversationSchema>;

// Mesaj gönder
//
// Metin ya da FOTOĞRAF (ya da ikisi). Yalnız fotoğraf gönderilebilsin diye
// `body` boş olabilir; ikisinin de boş olması reddedilir (aşağıdaki refine).
// Sınır ~4 MB base64 ≈ 3 MB görsel: daha büyüğü hem yavaş hem gereksiz.
export const sendMessageSchema = z
  .object({
    body: z.string().max(2000).optional(),
    imageDataUrl: z.string().max(4_000_000).optional(),
  })
  .refine((v) => (v.body ?? '').trim().length > 0 || !!v.imageDataUrl, {
    message: 'Mesaj boş olamaz',
  });
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// Kullanıcı engelle
export const blockUserSchema = z.object({
  targetUserId: z.string().uuid(),
});
export type BlockUserInput = z.infer<typeof blockUserSchema>;
