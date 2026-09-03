import { z } from 'zod';

/**
 * ÖNCESİ/SONRASI PAYLAŞIMI.
 *
 * `consent` LİTERAL `true`: `z.boolean()` olsaydı `false` da geçerli bir
 * gövde olurdu ve reddi servise bırakırdık. İzin beyanı gönderinin ön
 * koşulu — şemada durması, kuralın nerede olduğunu belli ediyor.
 */
export const proPostCreateSchema = z.object({
  beforeDataUrl: z.string().min(16).max(12_000_000),
  afterDataUrl: z.string().min(16).max(12_000_000),
  note: z.string().max(300).optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Müşteriden izin alındığı beyan edilmeli' }),
  }),
});

export type ProPostCreateInput = z.infer<typeof proPostCreateSchema>;
