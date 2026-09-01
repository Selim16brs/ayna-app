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
