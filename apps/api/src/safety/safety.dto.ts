import { z } from 'zod';

// EK Z.2 — güvenilen kişi (acil durum kişisi) ekle
export const addContactSchema = z.object({
  name: z.string().min(1).max(80),
  phone: z.string().min(4).max(32),
  relation: z.string().max(40).optional(),
});
export type AddContactInput = z.infer<typeof addContactSchema>;

// Güvenli mod oturumu başlat (opsiyonel randevu bağlamı)
export const startSessionSchema = z.object({
  bookingId: z.string().max(80).optional(),
});
export type StartSessionInput = z.infer<typeof startSessionSchema>;

// Konum güncelle (yalnızca aktif oturum; ham konum log'a yazılmaz)
export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type LocationInput = z.infer<typeof locationSchema>;
