import type { Interval } from '@ayna/types';

/**
 * Slot motoru — rezervasyonun kalbi (master §4.2, §4.6). SIFIR HATA hedefi:
 * çift rezervasyon teknik olarak imkânsız kılınır. Bu modül SAF mantıktır;
 * gerçek atomiklik sunucu tarafında transaction içinde `canLock` çağrısıyla sağlanır.
 *
 * Zaman birimi: UTC epoch milisaniye. Aralıklar yarı-açık [startMs, endMs) —
 * bitişik randevular (biri 14:00 biter, diğeri 14:00 başlar) ÇAKIŞMAZ.
 */

export const MIN = 60_000;
export const HOUR = 60 * MIN;

/** Aralık geçerli mi (pozitif süre)? */
export function isValidInterval(i: Interval): boolean {
  return Number.isFinite(i.startMs) && Number.isFinite(i.endMs) && i.endMs > i.startMs;
}

/**
 * İki yarı-açık aralık çakışıyor mu? [aStart,aEnd) ∩ [bStart,bEnd) ≠ ∅.
 * Bitişiklik (aEnd === bStart) çakışma DEĞİLDİR.
 */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

/** Aday aralık, meşgul aralıkların herhangi biriyle çakışıyor mu? */
export function hasConflict(candidate: Interval, busy: readonly Interval[]): boolean {
  return busy.some((b) => overlaps(candidate, b));
}

export interface SlotParams {
  /** Uzmanın o gün açık olduğu aralık(lar) — UTC ms. Birden fazla = öğle arası vb. */
  openWindows: readonly Interval[];
  /** Mevcut randevular + kişisel bloklar (tatil/izin) — UTC ms. */
  busy: readonly Interval[];
  /** Hizmet süresi (ms). Slot bu süre kesintisiz sığarsa üretilir. */
  serviceDurationMs: number;
  /** Slot başlangıç granülerliği (ms), örn. 15dk. */
  stepMs: number;
  /** Şu an (UTC ms) — geçmiş slotlar elenir. */
  nowMs: number;
  /** En erken rezervasyon tamponu (ms), örn. 2 saat. Varsayılan 0. */
  minLeadMs?: number;
}

/**
 * Bir gün için müsait slot başlangıçlarını üretir (master §4.6 kullanıcı tarafı:
 * "boş takvim değil, doğrudan müsait slotlar"). Sadece hizmet süresi kesintisiz
 * sığan, geçmişte olmayan ve tamponu geçen slotlar döner. Sıralı ve tekilleştirilmiş.
 */
export function computeAvailableSlots(params: SlotParams): Interval[] {
  const { openWindows, busy, serviceDurationMs, stepMs, nowMs } = params;
  const minLeadMs = params.minLeadMs ?? 0;
  if (serviceDurationMs <= 0 || stepMs <= 0) return [];

  const earliest = nowMs + minLeadMs;
  const seen = new Set<number>();
  const slots: Interval[] = [];

  for (const win of openWindows) {
    if (!isValidInterval(win)) continue;
    // İlk aday: pencere başı veya (varsa) tamponu geçen ilk step hizası.
    let start = win.startMs;
    if (start < earliest) {
      const stepsOver = Math.ceil((earliest - start) / stepMs);
      start = win.startMs + stepsOver * stepMs;
    }
    for (; start + serviceDurationMs <= win.endMs; start += stepMs) {
      if (start < earliest) continue;
      if (seen.has(start)) continue;
      const candidate: Interval = { startMs: start, endMs: start + serviceDurationMs };
      if (hasConflict(candidate, busy)) continue;
      seen.add(start);
      slots.push(candidate);
    }
  }

  slots.sort((a, b) => a.startMs - b.startMs);
  return slots;
}

export interface DaySlot extends Interval {
  /** Kilitlenebilir mi? (çakışma yok + geçmiş/tampon değil). */
  available: boolean;
}

/**
 * Bir günün TÜM slot adaylarını availability bayrağıyla döner (master §4.6:
 * "dolu saatler tıklanamaz/soluk"). computeAvailableSlots yalnız müsaitleri
 * verirken bu, UI'da soluk gösterim için dolu/geçmiş olanları da içerir.
 */
export function computeDaySlots(params: SlotParams): DaySlot[] {
  const { openWindows, busy, serviceDurationMs, stepMs, nowMs } = params;
  const minLeadMs = params.minLeadMs ?? 0;
  if (serviceDurationMs <= 0 || stepMs <= 0) return [];
  const earliest = nowMs + minLeadMs;
  const seen = new Set<number>();
  const out: DaySlot[] = [];

  for (const win of openWindows) {
    if (!isValidInterval(win)) continue;
    for (let start = win.startMs; start + serviceDurationMs <= win.endMs; start += stepMs) {
      if (seen.has(start)) continue;
      seen.add(start);
      const candidate: Interval = { startMs: start, endMs: start + serviceDurationMs };
      const available = start >= earliest && !hasConflict(candidate, busy);
      out.push({ ...candidate, available });
    }
  }
  out.sort((a, b) => a.startMs - b.startMs);
  return out;
}

export type LockResult =
  | { ok: true }
  | { ok: false; reason: 'INVALID' | 'CONFLICT' | 'OUT_OF_HOURS' | 'PAST' };

/**
 * Slot kilit önkoşulu (master §4.2 "atomik kilit"). Sunucu bunu transaction içinde,
 * meşgul listesini kilitledikten SONRA çağırır; ok=false ise "bu saat doldu" +
 * alternatif akışı döner. Saf ve yan etkisiz.
 */
export function canLock(
  candidate: Interval,
  ctx: {
    openWindows: readonly Interval[];
    busy: readonly Interval[];
    nowMs: number;
    minLeadMs?: number;
  },
): LockResult {
  if (!isValidInterval(candidate)) return { ok: false, reason: 'INVALID' };
  if (candidate.startMs < ctx.nowMs + (ctx.minLeadMs ?? 0)) return { ok: false, reason: 'PAST' };
  const inHours = ctx.openWindows.some(
    (w) => candidate.startMs >= w.startMs && candidate.endMs <= w.endMs,
  );
  if (!inHours) return { ok: false, reason: 'OUT_OF_HOURS' };
  if (hasConflict(candidate, ctx.busy)) return { ok: false, reason: 'CONFLICT' };
  return { ok: true };
}
