import { DEFAULT_SPEND_RULES, type LedgerState, type SpendRules, replayLedger } from '@ayna/domain';
import type { PrismaService } from '../prisma/prisma.service';

// Para puan kuralları — Karar K4. Tüm sayılar admin ayarı; kodda sabit yok.

// §5 puan tablosunun ayarlanabilir üç değeri. Sübvansiyon tavanı ve komisyon
// oranı buradan ÇIKARILDI: brief'te puan kullanımını sınırlayan iki kural var
// (eşik ve %25), üçüncüsü yok.
export const LOYALTY_SETTING_KEYS = [
  'rate.points_cap_pct',
  'rate.points_unlock_kzt',
  'rate.points_expiry_days',
] as const;

/** §5 — "Geçerlilik: 12 ay". Kod bir süre 90 gün kullanıyordu. */
export const DEFAULT_EXPIRY_DAYS = 365;

export type LoyaltyRules = SpendRules & { expiryDays: number };

export const DEFAULT_LOYALTY_RULES: LoyaltyRules = {
  ...DEFAULT_SPEND_RULES,
  expiryDays: DEFAULT_EXPIRY_DAYS,
};

export async function loadLoyaltyRules(prisma: PrismaService): Promise<LoyaltyRules> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [...LOYALTY_SETTING_KEYS] } },
    select: { key: true, intValue: true },
  });
  const val = (k: string) => {
    const v = rows.find((r) => r.key === k)?.intValue;
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
  };
  return {
    capPct: val('rate.points_cap_pct') ?? DEFAULT_LOYALTY_RULES.capPct,
    unlockAt: val('rate.points_unlock_kzt') ?? DEFAULT_LOYALTY_RULES.unlockAt,
    // 0 gün "anında yansın" demek olurdu; sıfır değeri sona ermeyi KAPATIR sayılır.
    expiryDays: val('rate.points_expiry_days') || DEFAULT_LOYALTY_RULES.expiryDays,
  };
}

/** Kazanım anından itibaren son kullanma tarihi. */
export function expiryFrom(earnedAt: Date, rules: LoyaltyRules): Date {
  return new Date(earnedAt.getTime() + rules.expiryDays * 86_400_000);
}

/**
 * Kullanıcının defterini okuyup FIFO motorundan geçirir.
 *
 * Bakiyeyi ASLA `SUM(points)` ile hesaplama: o toplam süresi dolmuş puanları da
 * sayar (ödeme servisi tam olarak bunu yapıyordu) ve harcamayı hangi kazanımdan
 * düştüğünü bilmediği için bakiyeyi negatife düşürebilir.
 */
export async function loadLedgerState(
  prisma: PrismaService,
  userId: string,
  at: Date = new Date(),
): Promise<LedgerState> {
  const rows = await prisma.loyaltyEntry.findMany({
    where: { userId },
    select: { points: true, expiresAt: true, createdAt: true },
  });
  return replayLedger(rows, at);
}
