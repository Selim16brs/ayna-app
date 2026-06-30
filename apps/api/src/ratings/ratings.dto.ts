import { z } from 'zod';

export const submitRatingSchema = z.object({
  bookingId: z.string().min(1),
  raterRole: z.enum(['user', 'specialist']),
  subjectId: z.string().min(1),
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const thresholdSchema = z.object({ value: z.number().int().min(1).max(50) });

export type SubmitRatingInput = z.infer<typeof submitRatingSchema>;
export type ThresholdInput = z.infer<typeof thresholdSchema>;
