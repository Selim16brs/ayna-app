import { z } from 'zod';
import { BOOKING_STATUSES } from '@ayna/domain';

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
  // Mobil istemci bu iki alanı GÖNDERMİYOR (Appointment tipinde yok) — zorunlu
  // tutulunca her mobil randevu yazımı sessizce VALIDATION_ERROR ile düşüyordu.
  // Opsiyonel: eksikse sunucu startMs'ten türetir (bookings.service.create).
  dateLabel: z.string().min(1).optional(),
  inDays: z.number().int().optional(),
  // §keşif Modül 2 — kampanyadan gelen randevu (sunucu doğrular: aktif+gün/saat+kota+fiyat)
  offerId: z.string().uuid().optional(),
  // §4.2 — kesin zaman (atomik slot lock); mobil epoch ms + süre
  startMs: z.number().int().optional(),
  durationMin: z.number().int().positive().max(1440).optional(),
  price: z.number().nonnegative(),
  /**
   * §4.1.1 — "Uzmanın hizmet listesinden 1 VEYA BİRDEN FAZLA hizmet. Toplam
   * süre = seçilen hizmetlerin süre toplamı."
   *
   * Yalnızca AD listesi taşınıyor: fiyat ve süre uzmanın kayıtlı hizmet
   * listesinden SUNUCUDA okunuyor. İstemcinin gönderdiği tutara güvenmek,
   * müşterinin kendi depozitosunu belirlemesi demekti.
   */
  serviceNames: z.array(z.string().min(1).max(120)).min(1).max(10).optional(),
  status: z
    // Liste `@ayna/domain`den TÜRETİLİYOR (brief §3). Elle yazılsaydı şema ile
    // durum makinesi ayrışır ve API, makinenin tanımadığı bir durumu kabul
    // ederdi — tam da bugün "iki kural" diye ayıkladığımız sorunun aynısı.
    .enum(BOOKING_STATUSES)
    .optional(),
});

export const dateLabelSchema = z.object({ dateLabel: z.string().min(1) });

// §4.1 — alternatif saat önerisi/karşı öneri: mobil epoch ms gönderir
export const proposeSchema = z.object({ proposedStartMs: z.number().int() });
export type ProposeInput = z.infer<typeof proposeSchema>;

// §7.8 — müşterinin bir kez ücretsiz erteleme hakkı
export const rescheduleSchema = z.object({ startMs: z.number().int().positive() });
export type RescheduleInput = z.infer<typeof rescheduleSchema>;

// §6.C — iptal sebebi (opsiyonel)
export const cancelSchema = z.object({ reason: z.string().max(300).optional() });

// §4.2/§4.4 — dekont yükleme (kapora veya iade)
// Dekont data URL olarak taşınır (cihazlar arası görünürlük) — 15MB gövde limiti main.ts'te
export const bookingReceiptSchema = z.object({ receiptUri: z.string().min(1).max(12_000_000) });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type DateLabelInput = z.infer<typeof dateLabelSchema>;
export type CancelInput = z.infer<typeof cancelSchema>;
export type BookingReceiptInput = z.infer<typeof bookingReceiptSchema>;

// §4.10 — iade yapılacak Kaspi/banka bilgisi. PII: log'a ve analitiğe ASLA
// yazılmaz; yalnız iadeyi ödeyen admin görür.
export const iadeTalepSchema = z.object({ payoutInfo: z.string().min(3).max(200) });
