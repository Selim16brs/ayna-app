import { z } from 'zod';

// §profil-onay — salon/uzman profil değişiklik talebi (önerilen alanların JSON'u)
export const submitProfileChangeSchema = z.object({
  changes: z.record(z.string(), z.unknown()),
});
export type SubmitProfileChangeInput = z.infer<typeof submitProfileChangeSchema>;
