import { z } from 'zod';

/**
 * Panelden gelen mesaj girdisi — brief §7.2.
 *
 * "Üç dil alanı ZORUNLU": eksik dil kabul edilmiyor. Boş bırakılan bir
 * dil, o dildeki kullanıcıya boş bir açılış ekranı demek olurdu.
 */
const ucDil = z.object({
  tr: z.string().trim().min(1),
  kk: z.string().trim().min(1),
  ru: z.string().trim().min(1),
});

export const splashMesajSemasi = z
  .object({
    grup: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']),
    etiket: z.enum(['female', 'neutral']).optional(),
    metin: ucDil,
    active: z.boolean().optional(),
    sira: z.number().int().min(0).max(100000).optional(),
    saat: z.tuple([z.number().int().min(0).max(23), z.number().int().min(1).max(24)]).optional(),
    haftaSonu: z.literal(true).optional(),
    gunler: z.array(z.number().int().min(0).max(6)).min(1).optional(),
    pencere: z
      .object({
        bas: z.tuple([z.number().int().min(1).max(12), z.number().int().min(1).max(31)]),
        son: z.tuple([z.number().int().min(1).max(12), z.number().int().min(1).max(31)]),
      })
      .optional(),
    oncelikliOzelGun: z.literal(true).optional(),
    adGerekli: z.literal(true).optional(),
    dogumGunu: z.literal(true).optional(),
    adsizMetin: ucDil.optional(),
    davranis: z
      .enum([
        'ilk_acilis',
        'uzun_yokluk',
        'yarin_randevu',
        'bugun_randevu',
        'randevu_sonrasi',
        'puan_hazir',
      ])
      .optional(),
  })
  .refine((m) => !m.saat || m.saat[1] > m.saat[0], {
    message: 'Saat aralığının sonu başından büyük olmalı',
    path: ['saat'],
  })
  .refine((m) => !m.oncelikliOzelGun || !!m.pencere, {
    // Penceresi olmayan "öncelikli özel gün" HER GÜN tetiklenir ve havuzu
    // kilitler: kullanıcı aynı mesajı sonsuza kadar görür.
    message: 'Öncelikli özel gün için tarih penceresi zorunlu',
    path: ['pencere'],
  })
  .refine(
    (m) => !m.metin.tr.includes('{name}') || m.adGerekli === true || m.adsizMetin !== undefined,
    {
      // `{name}` taşıyan bir mesaj adı olmayan kullanıcıda ham `{name}`
      // yazısı gösterirdi.
      message: '{name} kullanan mesaj ya adGerekli olmalı ya da adsız karşılığı bulunmalı',
      path: ['metin'],
    },
  );

export type SplashMesajGirdisi = z.infer<typeof splashMesajSemasi>;

/** Cihazdan gelen ölçüm — kişi kimliği YOK (brief §7.3 + gizlilik kuralı). */
export const splashOlcumSemasi = z.object({
  code: z.string().trim().min(1).max(64),
  locale: z.enum(['tr', 'kk', 'ru']),
  atlandi: z.boolean(),
});

export interface SplashOlcumGirdisi {
  code: string;
  locale: string;
  atlandi: boolean;
  gun: Date;
}
