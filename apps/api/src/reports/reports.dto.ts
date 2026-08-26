import { z } from 'zod';

// §21 — Şikâyet sebepleri. Serbest metin ZORUNLU DEĞİL: şikâyet etmeyi
// zorlaştıran her adım, şikâyetin hiç gelmemesi demektir.
export const REPORT_REASONS = [
  'off_platform_payment', // uygulama dışına para isteme
  'harassment', // taciz / rahatsız edici davranış
  'no_show', // gelmedi / sözünde durmadı
  'fake_profile', // sahte profil
  'other',
] as const;

export const createReportSchema = z.object({
  targetId: z.string().uuid(),
  reason: z.enum(REPORT_REASONS).default('other'),
  note: z.string().max(1000).default(''),
  threadId: z.string().max(120).optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;
