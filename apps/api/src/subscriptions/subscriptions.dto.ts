import { z } from 'zod';

// §11 — üyelik aboneliği (Premium/Platinum). Ödeme app-dışı; dekont sonra yüklenir.
export const createSubSchema = z.object({ tier: z.enum(['premium', 'platinum']) });
export type CreateSubInput = z.infer<typeof createSubSchema>;

export const subReceiptSchema = z.object({ receiptUri: z.string().min(1).max(600) });
export type SubReceiptInput = z.infer<typeof subReceiptSchema>;

// admin onayı — kaç ay aktive edilecek (varsayılan 1)
export const approveSubSchema = z.object({ months: z.number().int().min(1).max(24).optional() });
export type ApproveSubInput = z.infer<typeof approveSubSchema>;
