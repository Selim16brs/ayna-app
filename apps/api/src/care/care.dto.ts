import { z } from 'zod';

// Sınırlar UYDURMA değil: mobil ekranlar zaten bu uzunluklarda giriş alıyor
// (isim/başlık tek satır, not çok satırlı). Sunucu tarafında da bağlanıyor ki
// istemci atlanarak sınırsız veri yazılamasın.
const isim = z.string().trim().min(1).max(80);
const ikon = z.string().trim().max(40).optional();

export const routineSchema = z.object({
  name: isim,
  icon: ikon,
  periodDays: z.number().int().min(1).max(3650),
  categoryCode: z.string().trim().max(40).optional(),
});
export type RoutineInput = z.infer<typeof routineSchema>;

export const momentSchema = z.object({
  title: isim,
  icon: ikon,
  /** Anın tarihi (epoch ms). `daysLeft` sunucuda bundan hesaplanır. */
  happensAtMs: z.number().int().positive(),
});
export type MomentInput = z.infer<typeof momentSchema>;

export const logSchema = z.object({
  title: isim,
  icon: ikon,
  tone: z.string().trim().max(24).optional(),
  note: z.string().trim().max(2000).optional(),
  kind: z.string().trim().max(40).optional(),
  loggedAtMs: z.number().int().positive(),
});
export type LogInput = z.infer<typeof logSchema>;

export const logPatchSchema = logSchema.partial();
export type LogPatch = z.infer<typeof logPatchSchema>;
