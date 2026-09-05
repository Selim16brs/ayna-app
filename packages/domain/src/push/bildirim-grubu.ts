/**
 * BİLDİRİM GRUPLARI — kullanıcının kapattığı bildirim GERÇEKTEN kapanmalı.
 *
 * ── SORUN ────────────────────────────────────────────────────────────────
 *
 * Ayarlardaki "Bildirim tercihleri" ekranı dört grup sunuyor ve seçim
 * sunucuya kaydediliyordu (`UserPrefs.notifJson`). Ama push gönderen kod bu
 * kaydı HİÇ OKUMUYORDU: kullanıcı "Bakım hatırlatmaları"nı kapatıyor,
 * telefonu kapattığı bildirimi almaya devam ediyordu.
 *
 * Tutulmayan bir söz; üstelik kullanıcının kendi telefonuna dair.
 *
 * ── ZORUNLU BİLDİRİMLER ──────────────────────────────────────────────────
 *
 * Bazı bildirimler kapatılamaz, çünkü kaçırmak GERİ ALINAMAZ bir kayıp
 * demek: depozito süresi bitiyor, randevu iptal edildi, para iade edildi,
 * ödeme doğrulanamadı. Kullanıcıyı bildirim tercihiyle parasından etmek,
 * tercihe uymaktan daha büyük bir zarar.
 *
 * Bu ayrım ekranda da yazıyor — sessizce uygulanan bir istisna olmuyor.
 */

/** Ayarlar ekranındaki gruplar. `personal` yalnız cihazda üretiliyor. */
export type BildirimGrubu = 'booking' | 'care';

/**
 * Kapatılamayan bildirimler — kaçırılması geri alınamaz sonuç doğuranlar.
 *
 * Liste DAR tutuluyor: her bildirimi "önemli" saymak, tercihi tümden
 * anlamsız kılardı.
 */
const ZORUNLU: ReadonlySet<string> = new Set([
  // Para / süre — kaçırmak randevuyu ya da parayı kaybettirir.
  'booking.deposit_last_minutes',
  'booking.deposit_expired',
  'booking.free_cancel_last',
  'booking.cancelled',
  'booking.cancelled_reason',
  'booking.cancelled_receipt',
  'refund.sent',
  'ad.payment_failed',
  'membership.receipt_rejected',
  // Hakkında karar verilmiş: itiraz süresi işliyor.
  'booking.no_show_marked',
  'dispute.approved',
  'dispute.rejected',
]);

/** Bakım geri sayımları — "kök boya zamanı", "manikür vakti". */
const BAKIM_ONEKLERI = ['reengage.'] as const;

/**
 * Bu bildirim hangi gruba giriyor?
 *
 * `null` = gruplara girmiyor (uzman/salon işleyişi, mesaj, destek). Onlar
 * ayarlardaki dört anahtarın hiçbirinin sözü değil; tercihe bakılmadan
 * gönderiliyor.
 */
export function bildirimGrubu(key: string): BildirimGrubu | null {
  if (ZORUNLU.has(key)) return null;
  if (BAKIM_ONEKLERI.some((p) => key.startsWith(p))) return 'care';
  if (key.startsWith('booking.') || key.startsWith('quote.')) return 'booking';
  return null;
}

/** Kullanıcının tercihi bu bildirimin GÖNDERİLMESİNE izin veriyor mu? */
export function bildirimGonderilebilir(
  key: string,
  tercihler: Record<string, unknown> | null | undefined,
): boolean {
  const grup = bildirimGrubu(key);
  if (!grup) return true; // zorunlu ya da gruplara girmiyor
  const deger = tercihler?.[grup];
  /*
   * Tercih HİÇ kaydedilmemişse AÇIK: varsayılan olarak bildirim geliyor.
   * `false` dışındaki her değer (undefined, null, true) açık sayılıyor —
   * bozuk bir kayıt yüzünden kullanıcının bildirimleri sessizce kesilmesin.
   */
  return deger !== false;
}

/** Kapatılamayan bildirim mi? Ekran bunu kullanıcıya yazabilsin. */
export function zorunluBildirim(key: string): boolean {
  return ZORUNLU.has(key);
}
