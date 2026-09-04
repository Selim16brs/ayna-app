/**
 * MÜŞTERİ RANDEVU KAPISI.
 *
 * Kurucu: "bir müşteri ya admin panelinden onaylanmalı ya da mutlaka
 * telefon ile doğrulama yapmalı. aksi takdirde uygulamada kesinlikle
 * randevu veremez."
 *
 * ── NEDEN TEK YERDE ─────────────────────────────────────────────────────
 *
 * Kural üç yerde lazım: sunucu (tek gerçek kapı), uygulama (düğmeyi
 * kapatıp sebebini yazmak için) ve panel (yöneticinin ne açtığını
 * görmesi için). Üç kopya zamanla ayrışır: uygulama "alabilirsin" der,
 * sunucu reddeder.
 */

export interface RandevuKapisiGirdisi {
  phoneVerified?: boolean | null | undefined;
  adminApproved?: boolean | null | undefined;
}

/** Randevu oluşturabilir mi? İkisinden BİRİ yeterli. */
export function randevuVerebilir(k: RandevuKapisiGirdisi): boolean {
  return k.phoneVerified === true || k.adminApproved === true;
}

/** Sunucunun ve uygulamanın AYNI hata kodunu kullanması için. */
export const RANDEVU_KAPISI_KODU = 'VERIFICATION_REQUIRED';
