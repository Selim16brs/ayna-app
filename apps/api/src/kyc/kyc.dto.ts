import { z } from 'zod';

// EK Z.3 — uzman/salon KYC belge gönderimi
export const submitKycSchema = z.object({
  docType: z.enum(['id_card', 'passport', 'certificate']),
  documents: z.array(z.string().min(1).max(600)).min(1).max(5),
});
export type SubmitKycInput = z.infer<typeof submitKycSchema>;

// Admin ret notu
export const rejectKycSchema = z.object({
  note: z.string().max(400).optional(),
});
export type RejectKycInput = z.infer<typeof rejectKycSchema>;
