import { z } from 'zod';

export const createBookingSchema = z.object({
  id: z.string().min(1),
  source: z.enum(['direct', 'photo_quote', 'demand']),
  service: z.string().min(1),
  proId: z.string().optional(),
  proName: z.string().min(1),
  proImage: z.string(),
  uzmanName: z.string().optional(),
  customerName: z.string().max(80).optional(),
  customerPhone: z.string().max(40).optional(), // salon offline koordinasyonu
  bySalon: z.boolean().optional(), // §10 — salonun aldığı kayıt (para görünürlüğü kuralı)
  bookingKind: z.enum(['normal', 'group', 'express']).optional(),
  groupSize: z.number().int().min(2).max(20).optional(),
  dateLabel: z.string().min(1),
  inDays: z.number().int(),
  // §keşif Modül 2 — kampanyadan gelen randevu (sunucu doğrular: aktif+gün/saat+kota+fiyat)
  offerId: z.string().uuid().optional(),
  // §4.2 — kesin zaman (atomik slot lock); mobil epoch ms + süre
  startMs: z.number().int().optional(),
  durationMin: z.number().int().positive().max(1440).optional(),
  price: z.number().nonnegative(),
  status: z
    .enum([
      'confirmed',
      'pending',
      'completed',
      'cancelled',
      'awaiting_provider',
      'alternative_proposed',
      'no_show',
      'waitlist',
      'deposit_pending',
      'deposit_submitted',
      'refund_pending',
      'refund_submitted',
      'disputed',
      'reassigned_pending',
    ])
    .optional(),
});

export const dateLabelSchema = z.object({ dateLabel: z.string().min(1) });

// §4.1 — alternatif saat önerisi/karşı öneri: mobil epoch ms gönderir
export const proposeSchema = z.object({ proposedStartMs: z.number().int() });
export type ProposeInput = z.infer<typeof proposeSchema>;

// §6.C — iptal sebebi (opsiyonel)
export const cancelSchema = z.object({ reason: z.string().max(300).optional() });

// §4.2/§4.4 — dekont yükleme (kapora veya iade)
// Dekont data URL olarak taşınır (cihazlar arası görünürlük) — 15MB gövde limiti main.ts'te
export const bookingReceiptSchema = z.object({ receiptUri: z.string().min(1).max(12_000_000) });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type DateLabelInput = z.infer<typeof dateLabelSchema>;
export type CancelInput = z.infer<typeof cancelSchema>;
export type BookingReceiptInput = z.infer<typeof bookingReceiptSchema>;
