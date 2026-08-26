import { z } from 'zod';

// §5.5 — W2W gönderi oluştur
export const createPostSchema = z.object({
  category: z.string().min(1).max(40),
  text: z.string().min(2).max(2000),
  anonymous: z.boolean().optional(),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const createCommentSchema = z.object({
  text: z.string().min(1).max(1000),
  anonymous: z.boolean().optional(),
  /// §14 — cevapta bir uzman öneriliyorsa kimi. Doğrulamayı SUNUCU yapar.
  proId: z.string().max(64).optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const reportSchema = z.object({
  reason: z.string().max(300).optional(),
});
export type ReportInput = z.infer<typeof reportSchema>;

// Admin kararı
export const moderatePostSchema = z.object({
  decision: z.enum(['approve', 'hide']),
});
export type ModeratePostInput = z.infer<typeof moderatePostSchema>;
