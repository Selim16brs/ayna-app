import type { PrismaService } from '../prisma/prisma.service';

// Randevu zaman pencereleri — şartname §5.3: "Değer config/admin ayarı olmalı;
// kod içine dağınık yazılmamalı." Pencereler önce üç ayrı yerde sabit yazılıydı.
//
// PENCERELER SLOTU DOĞRUDAN ETKİLER: `depozito_bekliyor` slotu işgal ediyor
// (≡ şartnamedeki HELD). Penceresi olmayan bir kayıt scheduler'ın süre dolum
// sorgusuna hiç düşmez, yani o saat kimseye açılmaz. Bu yüzden `depozito_bekliyor`
// doğuran her yol MUTLAKA `depositDeadline` yazmalı.

export type BookingWindows = {
  /** Kapora dekontu için tanınan süre (dk). Slot bu süre boyunca tutulur. */
  holdMin: number;
  /** Uzmanın talebe yanıt süresi (saat). */
  responseHours: number;
};

export const DEFAULT_WINDOWS: BookingWindows = {
  // Brief §4.4 — DEPOZİTO PENCERESİ 10 DAKİKA. Eskiden 180 dakikaydı; brief
  // bunu bilinçli olarak sertleştiriyor ("Randevunuzu korumak için 09:32
  // içinde ödeyin") çünkü slot bu süre boyunca KİLİTLİ kalıyor ve kimse
  // alamıyor. Uzun pencere, takvimi boş yere işgal ederdi.
  holdMin: 10,
  // Brief §4.2 — UZMAN CEVAP SÜRESİ 3 SAAT (eskiden 6). 1. ve 2. saatte
  // hatırlatma; süre dolarsa ya da randevuya 3 saatten az kalırsa talep düşer.
  responseHours: 3,
};

export const WINDOW_SETTING_KEYS = ['policy.hold_minutes', 'policy.response_hours'] as const;

export async function loadWindows(prisma: PrismaService): Promise<BookingWindows> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [...WINDOW_SETTING_KEYS] } },
    select: { key: true, intValue: true },
  });
  const val = (k: string) => {
    const v = rows.find((r) => r.key === k)?.intValue;
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
  };
  return {
    holdMin: val('policy.hold_minutes') ?? DEFAULT_WINDOWS.holdMin,
    responseHours: val('policy.response_hours') ?? DEFAULT_WINDOWS.responseHours,
  };
}

export function holdDeadline(w: BookingWindows, now = Date.now()): Date {
  return new Date(now + w.holdMin * 60_000);
}

export function responseDeadline(w: BookingWindows, now = Date.now()): Date {
  return new Date(now + w.responseHours * 3_600_000);
}

/**
 * UZMANIN CEVAP SÜRESİ — randevu ne kadar YAKINSA o kadar KISA.
 *
 * ── ÖNCEKİ DAVRANIŞ: TALEP ANINDA DÜŞÜYORDU ─────────────────────────────
 *
 * Kurucu: "müşteriden gelen randevu isteği taleplerde görünmüyor. takvimde
 * çıktı ve orada da hemen süresi doldu diye kapanmış, teklif verilmeden."
 *
 * Cevap penceresi SABİT 3 saatti ve ayrı bir kural randevu saatine 3
 * saatten az kalan HER talebi otomatik düşürüyordu. Yani sabah 08:30'da
 * saat 10:00 için gelen bir talep uzmana hiç ulaşmadan, ilk zamanlayıcı
 * turunda "süre doldu" oluyordu. Aynı gün randevu almak imkânsızdı.
 *
 * ── YENİ KURAL ──────────────────────────────────────────────────────────
 *
 * Pencere kalan sürenin YARISI: uzman cevap versin ama müşteriye de
 * depozitoyu ödeyip hazırlanmak için zaman kalsın. Üst sınır yine 3 saat
 * (uzun vadeli talep uzmanı sonsuza kadar bekletmesin), alt sınır 15
 * dakika — daha kısası uzmanın telefonuna bakmasına bile yetmez.
 *
 * Randevu saati GEÇMİŞSE pencere yok: geçmişe randevu onaylanamaz.
 */
export const EN_KISA_CEVAP_MS = 15 * 60_000;

export function cevapPenceresiMs(
  w: BookingWindows,
  startMs: number | null | undefined,
  now = Date.now(),
): number {
  const tam = w.responseHours * 3_600_000;
  if (startMs == null) return tam; // saatsiz talep (teklif toplama) — tam pencere
  const kalan = startMs - now;
  if (kalan <= 0) return 0;
  /*
   * Pencere RANDEVU SAATİNİ AŞAMAZ.
   *
   * Alt sınır (15 dk) tek başına uygulandığında, randevuya 5 dakika kalan
   * bir talepte pencere randevu saatinden SONRA bitiyordu: uzman
   * randevu saati geçtikten sonra onaylayabilir, müşteri gelmemiş bir
   * randevunun onayını alırdı. (Bu testi yazarken çıktı.)
   */
  return Math.min(tam, kalan, Math.max(EN_KISA_CEVAP_MS, Math.floor(kalan / 2)));
}

/** Cevap penceresinin bitiş anı; pencere yoksa `null`. */
export function cevapSonu(
  w: BookingWindows,
  startMs: number | null | undefined,
  now = Date.now(),
): Date | null {
  const ms = cevapPenceresiMs(w, startMs, now);
  return ms > 0 ? new Date(now + ms) : null;
}
