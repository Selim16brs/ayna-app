import type { PrismaService } from '../prisma/prisma.service';
import { expiryFrom, loadLoyaltyRules } from './loyalty.rules';

// Puan kazandırmanın TEK kapısı.
//
// NEDEN: kazanım dört ayrı serviste yazılıyordu (auth hoş geldin, referral,
// content blog, loyalty.earn) ve ikisi `expiresAt` koymayı unutmuştu — o puanlar
// hiç yanmıyordu. K4.4 "3 ay içinde kullanılmazsa yanar" diyor; kuralın bir
// çağrı yerinde unutulmasıyla delinmemesi için son kullanma tarihini artık
// çağıran değil bu fonksiyon koyuyor.
//
// `tx` verilebilir: kazanım başka yazımlarla aynı transaction'da olmalıysa
// (örn. referans puanı iki tarafa birden) çağıran kendi transaction'ını geçirir.

export type GrantInput = {
  userId: string;
  /** i18n anahtarı — örn. 'rewards.earn.review'. */
  reason: string;
  points: number;
  detail?: string;
};

type LedgerWriter = {
  loyaltyEntry: { createMany: (args: { data: unknown[] }) => Promise<unknown> };
};

/**
 * Bir veya daha çok kullanıcıya puan yazar; son kullanma tarihini kendisi koyar.
 * Pozitif olmayan kazanımlar sessizce elenir (0 puanlı kayıt defteri kirletir).
 */
export async function grantPoints(
  prisma: PrismaService,
  grants: GrantInput | GrantInput[],
  tx?: LedgerWriter,
): Promise<number> {
  const list = (Array.isArray(grants) ? grants : [grants]).filter(
    (g) => Number.isFinite(g.points) && g.points > 0,
  );
  if (list.length === 0) return 0;

  const rules = await loadLoyaltyRules(prisma);
  const expiresAt = expiryFrom(new Date(), rules);
  const writer = tx ?? prisma;
  await writer.loyaltyEntry.createMany({
    data: list.map((g) => ({
      userId: g.userId,
      kind: 'earn' as const,
      reason: g.reason,
      detail: g.detail ?? '',
      points: Math.floor(g.points),
      expiresAt,
    })),
  });

  // §12 — kritik eylem denetim kaydı. 1 puan = 1 ₸ olduğu için kazanım yazmak
  // PARA BASMAKTIR ve kaydı tutulmuyordu. (PR #19'daki para basma açığı tam da
  // burada, denetim izi olmadan istismar edilebiliyordu.)
  //
  // PII YAZILMAZ: `detail` referans kazanımında karşı tarafın ADINI taşıyor —
  // safeDiff'e yalnız sebep ve tutar girer (docs/security/03).
  await Promise.all(
    list.map((g) =>
      prisma.auditLog
        .create({
          data: {
            actorId: g.userId,
            actorRole: 'system',
            action: 'loyalty.earn',
            resourceType: 'loyalty',
            resourceId: g.userId,
            safeDiff: { reason: g.reason, points: Math.floor(g.points) },
          },
        })
        .catch(() => undefined),
    ),
  );
  return list.length;
}
