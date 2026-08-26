// ÇALIŞMA SAATİ DEĞİŞİKLİĞİ ↔ MEVCUT RANDEVU ÇAKIŞMASI.
//
// Uzman çalışma saatlerini serbestçe değiştirebilmeli — admin onayı beklemek
// anlamsız, kendi takvimi. Ama kapattığı bir aralıkta ONAYLANMIŞ müşteri
// randevusu varsa bu sessizce olmamalı: müşteri o saate göre plan yaptı.
//
// Bu dosya kararı SAF olarak verir (veritabanısız, saatsiz): hangi randevular
// yeni saatlerin dışında kalıyor? Sunucu bu listeyi uyarıya çevirir; uzman
// yine de devam ederse randevular geçerli kalır ve gelmemesi hâlinde
// "uzman gelmedi" cezası işler (§4.4-b).

/** Bir günün çalışma penceresi. `wd`: 0=Pazar … 6=Cumartesi. */
export interface DayHours {
  wd: number;
  open: boolean;
  /** "HH:MM" — 24 saat. */
  from: string;
  to: string;
}

/** Çakışma kontrolü için gereken en az randevu bilgisi. */
export interface BookingWindow {
  id: string;
  /** Randevunun başlangıcı — Almatı yerel gün/saatine çevrilmiş hâli. */
  wd: number;
  /** Başlangıç dakikası (gün başından). */
  startMin: number;
  /** Süre (dk). Bitiş de pencereye sığmalı. */
  durationMin: number;
}

/** "HH:MM" → gün başından dakika. Bozuk girdi null döner. */
export function dakika(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? '');
  if (!m) return null;
  const s = Number(m[1]);
  const d = Number(m[2]);
  if (s < 0 || s > 23 || d < 0 || d > 59) return null;
  return s * 60 + d;
}

/**
 * Yeni saatlere göre DIŞARIDA kalan randevular.
 *
 * Dışarıda sayılma koşulları:
 *  - o gün tamamen kapatılmışsa,
 *  - ya da randevu penceresinin dışına taşıyorsa (başlangıç erken / bitiş geç).
 *
 * O gün için HİÇ kayıt yoksa gün kapalı sayılır: eksik veriyi "açık" varsaymak,
 * uyarıyı sessizce atlamak olurdu.
 */
export function cakisanRandevular(
  yeniSaatler: readonly DayHours[],
  randevular: readonly BookingWindow[],
): BookingWindow[] {
  const gunler = new Map<number, DayHours>();
  for (const g of yeniSaatler) gunler.set(g.wd, g);

  return randevular.filter((r) => {
    const g = gunler.get(r.wd);
    if (!g || !g.open) return true;
    const bas = dakika(g.from);
    const bit = dakika(g.to);
    // Saat okunamıyorsa güvenli taraf: çakışma say, uzman görsün.
    if (bas == null || bit == null || bit <= bas) return true;
    const rBas = r.startMin;
    const rBit = r.startMin + Math.max(0, r.durationMin);
    return rBas < bas || rBit > bit;
  });
}
