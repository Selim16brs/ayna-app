import { z } from 'zod';

export const requestSchema = z.object({
  /** Uzmanın/salonun katalog kaydı. Karşı tarafın kullanıcı kimliği SUNUCUDA bulunur. */
  proId: z.string().min(1).max(64),
  lastServiceId: z.string().max(64).optional(),
});
export type RequestInput = z.infer<typeof requestSchema>;

// Toplu bildirim — uzunluklar bildirim gövdesine sığacak şekilde.
export const broadcastSchema = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(500),
});
export type BroadcastInput = z.infer<typeof broadcastSchema>;
