import { grantPoints } from './loyalty.grant';
import type { PrismaService } from '../prisma/prisma.service';

// K4.1 — "Kullanıcı işlem sonrasında, bir sonraki alışverişinde kullanmak üzere
// para puan kazanır."
//
// Uygulama bunu ZATEN vaat ediyordu ("Her tamamlanan hizmette %3 geri kazan",
// rewards.rules.earn) ama veren hiçbir kod yoktu: kazanım kaynakları hoş geldin,
// referans, blog, yorum, ilk randevu ve W2W beğenisiydi — hizmet bedelinden geri
// kazanım hiç yoktu. Bu dosya o vaadi karşılar.
//
// Oran admin ayarı; kodda sabit yok.

export const CASHBACK_SETTING_KEY = 'rate.points_earn_pct';
export const DEFAULT_CASHBACK_PCT = 3;
export const CASHBACK_REASON = 'rewards.earn.cashback';

export function cashbackPoints(price: number, pct: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  return Math.floor((price * pct) / 100);
}

/**
 * Tamamlanan randevular için geri kazanım yazar.
 *
 * İKİ KEZ YAZMAZ: aynı randevu için daha önce kazanım varsa atlanır. Randevu
 * hem müşteri teyidiyle hem de zamanlayıcının otomatik kesinleştirmesiyle
 * `completed` olabiliyor; koruma olmasa iki yol çakışıp puanı ikiye katlardı.
 * Ayırt edici anahtar `detail` alanındaki randevu kimliği.
 */
export async function grantCompletionCashback(
  prisma: PrismaService,
  bookings: ReadonlyArray<{ id: string; userId: string | null; price: unknown }>,
): Promise<number> {
  const uygun = bookings.filter(
    (b): b is { id: string; userId: string; price: unknown } => !!b.userId,
  );
  if (uygun.length === 0) return 0;

  const setting = await prisma.setting.findUnique({ where: { key: CASHBACK_SETTING_KEY } });
  const pct = setting?.intValue ?? DEFAULT_CASHBACK_PCT;

  const zaten = await prisma.loyaltyEntry.findMany({
    where: { reason: CASHBACK_REASON, detail: { in: uygun.map((b) => b.id) } },
    select: { detail: true },
  });
  const yazilmis = new Set(zaten.map((e) => e.detail));

  const grants = uygun
    .filter((b) => !yazilmis.has(b.id))
    .map((b) => ({
      userId: b.userId,
      reason: CASHBACK_REASON,
      detail: b.id,
      points: cashbackPoints(Number(b.price), pct),
    }))
    .filter((g) => g.points > 0);

  return grantPoints(prisma, grants);
}
