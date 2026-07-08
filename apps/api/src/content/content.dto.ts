import { z } from 'zod';

// §14.5 — GENEL kk/ru dil override'ları: her alan string ya da string[] (blog body paragrafları).
// Boş bırakılan alan tr'ye (base) düşer. Duyuru/kampanya/reklam/blog/tema ortak kullanır.
const localeOverride = z.record(z.string(), z.union([z.string(), z.array(z.string())]));
export const i18nSchema = z
  .object({ kk: localeOverride.optional(), ru: localeOverride.optional() })
  .optional();

// §12.6 Blog editörü — admin yazar/yayınlar
export const articleSchema = z.object({
  title: z.string().min(3),
  i18n: i18nSchema,
  tag: z.string().min(1),
  categoryCode: z.string().optional(), // ServiceCategory.code → app "Teklif al" CTA
  readMin: z.number().int().min(1).max(60).optional(),
  image: z.string().optional(),
  excerpt: z.string().min(1),
  body: z.array(z.string().min(1)).min(1),
  published: z.boolean().optional(),
});
export type ArticleInput = z.infer<typeof articleSchema>;

export const articlePatchSchema = articleSchema.partial();
export type ArticlePatchInput = z.infer<typeof articlePatchSchema>;

// Kullanıcı blog başvurusu
export const applicationSchema = z.object({
  authorName: z.string().min(2),
  title: z.string().min(3),
  excerpt: z.string().optional(),
  body: z.array(z.string().min(1)).min(1),
  tag: z.string().optional(),
});
export type ApplicationInput = z.infer<typeof applicationSchema>;

// Başvuru kararı — onayla (puan + yayın) / reddet (gerekçe)
export const reviewApplicationSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().optional(),
  categoryCode: z.string().optional(),
  image: z.string().optional(),
  points: z.number().int().min(0).max(100000).optional(),
});
export type ReviewApplicationInput = z.infer<typeof reviewApplicationSchema>;

// Haftalık W2W teması
export const themeSchema = z.object({
  title: z.string().min(2),
  prompt: z.string().min(2),
  i18n: i18nSchema,
  weekStart: z.string(), // ISO tarih
});
export type ThemeInput = z.infer<typeof themeSchema>;

// §12.10 Toplu duyuru — segment bazlı (i18nSchema yukarıda tanımlı)
export const announcementSchema = z
  .object({
    title: z.string().min(2),
    body: z.string().min(2),
    i18n: i18nSchema, // { kk?: {title,body}, ru?: {title,body} }
    segment: z.enum(['all', 'premium', 'platinum', 'professionals', 'salons', 'city']),
    city: z.string().optional(),
  })
  .refine((v) => v.segment !== 'city' || (v.city && v.city.length > 0), {
    message: 'Şehir segmenti için şehir gerekli',
    path: ['city'],
  });
export type AnnouncementInput = z.infer<typeof announcementSchema>;
