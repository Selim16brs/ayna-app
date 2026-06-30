import { z } from 'zod';

const hhmm = z.string().regex(/^\d{2}:\d{2}$/);

export const availabilitySchema = z.object({
  // weekday (0=Paz..6=Cmt) → çalışma penceresi
  weeklyHours: z.record(z.string(), z.object({ start: hhmm, end: hhmm })),
  slotMinutes: z.number().int().min(15).max(240).default(60),
});

export const blockSchema = z.object({
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  label: z.string().max(120).optional(),
});

export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type BlockInput = z.infer<typeof blockSchema>;
