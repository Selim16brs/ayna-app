import type { MessageKey } from '@ayna/i18n';

/**
 * AYNA tarih-saat yardımcıları. Backend UTC epoch ms; kullanıcıya Almatı saatiyle
 * gösterilir (CLAUDE.md). Kazakistan 2024'ten beri tek saat dilimi (UTC+5, DST yok),
 * bu yüzden sabit ofset güvenli ve deterministiktir.
 */
export const ALMATY_OFFSET_MS = 5 * 60 * 60_000;
export const DAY_MS = 24 * 60 * 60_000;

const two = (n: number) => String(n).padStart(2, '0');

export interface AlmatyParts {
  wd: number; // 0=Paz … 6=Cmt
  day: number;
  month: number; // 0-11
  h: number;
  min: number;
}

export function almatyParts(ms: number): AlmatyParts {
  const d = new Date(ms + ALMATY_OFFSET_MS);
  return {
    wd: d.getUTCDay(),
    day: d.getUTCDate(),
    month: d.getUTCMonth(),
    h: d.getUTCHours(),
    min: d.getUTCMinutes(),
  };
}

/** Almatı saatinde "HH:MM". */
export function slotTime(ms: number): string {
  const p = almatyParts(ms);
  return `${two(p.h)}:${two(p.min)}`;
}

/** Randevu etiketi: "Cuma · 14:00" (hafta günü i18n + Almatı saati). */
export function formatSlot(ms: number, t: (k: MessageKey) => string): string {
  const p = almatyParts(ms);
  return `${t(`wd.${p.wd}` as MessageKey)} · ${two(p.h)}:${two(p.min)}`;
}

// TR-öncelikli hafta günü — hook dışı bağlamlar (store bildirimleri, türetilmiş
// seçiciler) için; bu metinler mevcut kodda da TR sabit (whenShort gibi).
const WD_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

/** Randevu etiketi (TR sabit): "Cuma · 14:00". t gerektirmez. */
export function formatSlotTr(ms: number): string {
  const p = almatyParts(ms);
  return `${WD_TR[p.wd]} · ${two(p.h)}:${two(p.min)}`;
}

/**
 * Almatı takvim günü farkı (bugün=0, yarın=1, dün=-1). Saat değil, takvim günü:
 * sıralama ve "aynı gün mü" (geç iptal politikası §4.4) için.
 */
export function daysUntil(startMs: number, nowMs: number): number {
  const a = Math.floor((startMs + ALMATY_OFFSET_MS) / DAY_MS);
  const b = Math.floor((nowMs + ALMATY_OFFSET_MS) / DAY_MS);
  return a - b;
}

/** Almatı yerel gün başlangıcının UTC ms karşılığı (slot üretimi için pencere temeli). */
export function almatyDayStart(nowMs: number, addDays = 0): number {
  const localMidnight = Math.floor((nowMs + ALMATY_OFFSET_MS) / DAY_MS) * DAY_MS + addDays * DAY_MS;
  return localMidnight - ALMATY_OFFSET_MS;
}

/** Almatı yerel saat:dakikayı, verilen günde UTC ms'e çevirir. */
export function almatySlotMs(nowMs: number, addDays: number, h: number, min = 0): number {
  return almatyDayStart(nowMs, addDays) + h * 60 * 60_000 + min * 60_000;
}
