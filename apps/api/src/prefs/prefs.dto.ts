import { z } from 'zod';

/**
 * Tercih yaması — hepsi isteğe bağlı, gönderilen alanlar yazılır.
 *
 * `notif` ve `demand` serbest JSON: yeni bildirim türü eklemek sunucu
 * değişikliği ve migration gerektirmemeli. Yine de BOYUT sınırlı — sınırsız
 * JSON kabul etmek, tercih alanını depolama olarak kullanmaya açık kapı olurdu.
 */
export const prefsSchema = z.object({
  notif: z.record(z.string().max(64), z.boolean()).optional(),
  // `demand` yapısı istemcide tanımlı ve DÜZ DEĞER değil: kategori listesi
  // (dizi) ve saat aralığı (sayı) taşıyor. Değer tipini daraltmak, ayarın
  // sunucuda sessizce reddedilmesine yol açardı — boyut sınırı yeterli koruma.
  demand: z
    .record(z.string().max(64), z.unknown())
    .refine((v) => JSON.stringify(v).length <= 4000, { message: 'demand çok büyük' })
    .optional(),
  reviewAnonymous: z.boolean().optional(),
  autoReengage: z.boolean().optional(),
});
export type PrefsPatch = z.infer<typeof prefsSchema>;
