import { z } from 'zod';

// EK Z.1 — sohbet başlat / getir (karşı taraf + opsiyonel randevu/talep bağlamı)
export const startConversationSchema = z.object({
  targetUserId: z.string().uuid(),
  bookingId: z.string().max(80).optional(),
  requestId: z.string().uuid().optional(),
});
export type StartConversationInput = z.infer<typeof startConversationSchema>;

// Mesaj gönder
export const sendMessageSchema = z.object({
  body: z.string().min(1).max(2000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// Kullanıcı engelle
export const blockUserSchema = z.object({
  targetUserId: z.string().uuid(),
});
export type BlockUserInput = z.infer<typeof blockUserSchema>;
