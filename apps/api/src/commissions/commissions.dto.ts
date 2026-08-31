import { z } from 'zod';

// Pro'nun ödeme dekontu yüklemesi
export const receiptSchema = z.object({
  receiptUri: z.string().min(1).max(600),
});
export type ReceiptInput = z.infer<typeof receiptSchema>;
