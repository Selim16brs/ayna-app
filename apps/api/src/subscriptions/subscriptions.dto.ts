import { z } from 'zod';

// §11 — üyelik aboneliği (Premium/Platinum). Ödeme app-dışı; dekont sonra yüklenir.
export const createSubSchema = z.object({ tier: z.enum(['premium', 'platinum']) });
export type CreateSubInput = z.infer<typeof createSubSchema>;

// Dekont data URL taşır (admin panelde görüntülenir); 15MB gövde limiti main.ts'te
export const subReceiptSchema = z.object({ receiptUri: z.string().min(1).max(12_000_000) });
export type SubReceiptInput = z.infer<typeof subReceiptSchema>;

// admin onayı — kaç ay aktive edilecek (varsayılan 1)
export const approveSubSchema = z.object({ months: z.number().int().min(1).max(24).optional() });
export type ApproveSubInput = z.infer<typeof approveSubSchema>;
