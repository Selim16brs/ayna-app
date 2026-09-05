/**
 * BİR GÜN KAPALI MI? — uzman ekranı ile müşteri ekranı AYNI cevabı versin.
 *
 * ── SORUN ────────────────────────────────────────────────────────────────
 *
 * Kurucu (06.09.2026): "uzman izinli olarak işaretlemediği halde kullanıcıya
 * o gün çalışmıyor gibi görünüyor."
 *
 * Bir günün kapalı olmasının İKİ ayrı sebebi var:
 *   1. Uzman o TARİHİ tek tek kapalı işaretledi (`closedDays`).
 *   2. HAFTALIK çalışma saatlerinde o gün kapalı (`hours[wd].open === false`).
 *
 * Sunucunun slot motoru İKİSİNE de bakıyordu; uzmanın kendi takvimi ise
 * yalnız BİRİNCİSİNE. Sonuç: haftalık saatlerinde pazar kapalı olan uzmanın
 * takviminde pazar günü kilit YOK — kendini açık sanıyor — ama müşteri o gün
 * hiç slot göremiyor. İki ekran aynı soruya farklı cevap veriyordu.
 *
 * Cevap artık tek yerde.
 */

export type GunSaati = { wd: number; open: boolean; from: string; to: string };

/**
 * Haftalık çalışma saatlerine göre bu HAFTA GÜNÜ kapalı mı?
 *
 * Saatler HİÇ girilmemişse kapalı DEĞİL: sunucu o durumda varsayılan
 * pencereyi (10:00–20:00) uyguluyor. "Girmedi" ile "kapattı" aynı şey değil.
 */
export function haftaGunuKapali(
  hours: readonly GunSaati[] | null | undefined,
  weekday: number,
): boolean {
  if (!hours || hours.length === 0) return false;
  const gun = hours.find((h) => h.wd === weekday);
  return gun ? !gun.open : false;
}

/** Belirli bir tarih kapalı mı? İki sebep de burada birleşiyor. */
export function gunKapali(input: {
  /** Gün başlangıcı (UTC ms) — `closedDays` bu değerle saklanıyor. */
  dayMs: number;
  /** Almatı'ya göre haftanın günü (0 = Pazar). */
  weekday: number;
  hours?: readonly GunSaati[] | null;
  closedDays?: readonly number[] | null;
}): boolean {
  if (input.closedDays?.includes(input.dayMs)) return true;
  return haftaGunuKapali(input.hours, input.weekday);
}

/**
 * Günün kapalı olma SEBEBİ — ekran doğru cümleyi yazabilsin.
 *
 * Uzmana "kapalı" demek yetmiyor: tek tek işaretlediği bir izin gününü
 * ekrandan açabilir, ama haftalık saatlerinden gelen kapalılığı ancak
 * çalışma saatleri ekranından açabilir. Sebebi söylemeyen bir kilit,
 * uzmanı çalışmayan bir düğmeye bastırır.
 */
export function kapaliSebebi(input: {
  dayMs: number;
  weekday: number;
  hours?: readonly GunSaati[] | null;
  closedDays?: readonly number[] | null;
}): 'izin' | 'haftalik' | null {
  if (input.closedDays?.includes(input.dayMs)) return 'izin';
  return haftaGunuKapali(input.hours, input.weekday) ? 'haftalik' : null;
}

/**
 * ALMATI'ya göre haftanın günü (0 = Pazar).
 *
 * Sunucu ve uygulama ayrı ayrı hesaplıyordu; sabit UTC farkıyla hesaplayan
 * her kopya gün sınırında bir gün kayar. Tek kaynak.
 */
export function almatiHaftaGunu(ms: number): number {
  const kisa = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Almaty',
    weekday: 'short',
  }).format(new Date(ms));
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(kisa);
}
