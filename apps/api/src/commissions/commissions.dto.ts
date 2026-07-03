import { z } from 'zod';

// §12.8 — dönem kapanışı (aylık tahakkuk faturaları üretir)
export const closePeriodSchema = z.object({
  periodStart: z.string(), // ISO tarih (dönem başı, dahil)
  periodEnd: z.string(), // ISO tarih (dönem sonu, hariç)
  dueDate: z.string().optional(), // son ödeme; verilmezse periodEnd + 7 gün
});
export type ClosePeriodInput = z.infer<typeof closePeriodSchema>;

// Pro'nun ödeme dekontu yüklemesi
export const receiptSchema = z.object({
  receiptUri: z.string().min(1).max(600),
});
export type ReceiptInput = z.infer<typeof receiptSchema>;
