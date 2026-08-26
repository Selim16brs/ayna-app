import { BadRequestException, Injectable } from '@nestjs/common';
import type { LoyaltyEntry } from '@prisma/client';
import { computeAvailableBalance } from '@ayna/domain';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { EarnInput } from './loyalty.dto';
import { ONCE_PER_LIFETIME, ruleFor } from './earn-rules';
import { expiringSoon, expiryDateFrom } from './loyalty.expiry';

// Ödül kataloğu (mobil REWARDS ile aynı) — maliyet ve i18n etiketi sunucuda doğrulanır
const REWARDS: Record<string, { cost: number; key: string }> = {
  rw1: { cost: 200, key: 'rewards.redeem.discount' },
  rw2: { cost: 150, key: 'rewards.redeem.addon' },
  rw3: { cost: 100, key: 'rewards.redeem.raffle' },
  rw4: { cost: 500, key: 'rewards.redeem.premium' },
};

const dateFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });

// §11 — sadakat seviyeleri (kümülatif KAZANILAN puana göre; harcama seviyeyi düşürmez)
const TIERS = [
  { key: 'bronze', min: 0 },
  { key: 'silver', min: 500 },
  { key: 'gold', min: 1500 },
] as const;

export function computeTier(lifetimeEarned: number) {
  let idx = 0;
  for (let i = 0; i < TIERS.length; i++) {
    if (lifetimeEarned >= TIERS[i]!.min) idx = i;
  }
  const current = TIERS[idx]!;
  const next = TIERS[idx + 1] ?? null;
  const pointsToNext = next ? Math.max(0, next.min - lifetimeEarned) : 0;
  const span = next ? next.min - current.min : 1;
  const progress = next ? Math.min(1, (lifetimeEarned - current.min) / span) : 1;
  return {
    key: current.key,
    lifetimeEarned,
    next: next?.key ?? null,
    pointsToNext,
    progress: Math.round(progress * 100) / 100,
  };
}

@Injectable()
export class LoyaltyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async summary(userId: string) {
    const entries = await this.prisma.loyaltyEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    // §8 — kullanılabilir bakiye süresi dolan puanları HARİÇ tutar (domain saf mantığı)
    const points = computeAvailableBalance(
      entries.map((e) => ({
        transactionType: e.kind === 'earn' ? ('earn' as const) : ('spend' as const),
        amount: e.points,
        expiresAt: e.expiresAt ?? null,
      })),
      now,
    );
    const lifetimeEarned = entries
      .filter((e) => e.kind === 'earn')
      .reduce((sum, e) => sum + e.points, 0);
    const raffleEntries = entries.filter(
      (e) => e.kind === 'spend' && e.reason === 'rewards.redeem.raffle',
    ).length;
    // §8 — 30 gün içinde sona erecek puan uyarısı ("puanların yanmasın 🎁")
    const expiring = expiringSoon(
      entries.map((e) => ({ kind: e.kind, points: e.points, expiresAt: e.expiresAt ?? null })),
      now,
    );
    return {
      points,
      raffleEntries,
      tier: computeTier(lifetimeEarned),
      ledger: entries.map(mapEntry),
      expiringPoints: expiring.points,
      nextExpiry: expiring.nextExpiry,
    };
  }

  /**
   * GÜVENLİK: tutarı SUNUCU belirler. İstemcinin gönderdiği `points` yok sayılır.
   *
   * Öncesinde bu metot istemciden gelen 1..10000 arası herhangi bir değeri
   * doğrulamasız ledger'a yazıyordu; 1 puan = 1 ₸ olduğu ve puan bir ödemenin
   * %50'sini karşıladığı için bu, kayıtlı her kullanıcıya sınırsız para basma
   * imkânı veriyordu.
   */
  async earn(userId: string, input: EarnInput) {
    const rule = ruleFor(input.reason);
    if (!rule) {
      // Bilinmeyen sebep sessizce yutulmaz: istemcide kalmış eski bir çağrı varsa
      // görünür olsun, yeni bir kazanım yolu da buradan açılamasın.
      throw new BadRequestException({ code: 'EARN_REASON_NOT_ALLOWED' });
    }

    const now = new Date();
    const since = new Date(now.getTime() - 24 * 3_600_000);
    const [dayCount, lifetimeCount] = await Promise.all([
      this.prisma.loyaltyEntry.count({
        where: { userId, kind: 'earn', reason: input.reason, createdAt: { gte: since } },
      }),
      ONCE_PER_LIFETIME.has(input.reason)
        ? this.prisma.loyaltyEntry.count({ where: { userId, kind: 'earn', reason: input.reason } })
        : Promise.resolve(0),
    ]);

    // Sınır aşıldıysa HATA DEĞİL, sessiz atlama: kullanıcı bir şeyi yanlış
    // yapmadı ve istemci akışı kırılmamalı. Kazanım yalnız yazılmaz.
    if (dayCount >= rule.dailyLimit || lifetimeCount > 0) {
      await this.audit.record({
        actorId: userId,
        action: 'loyalty.earn.throttled',
        resourceType: 'loyalty',
        safeDiff: { reason: input.reason, dayCount, lifetimeCount },
      });
      return this.summary(userId);
    }

    await this.prisma.loyaltyEntry.create({
      data: {
        userId,
        kind: 'earn',
        reason: input.reason,
        detail: input.detail ?? '',
        // İSTEMCİNİN DEĞİLİ: kural tablosundan gelen sabit tutar
        points: rule.points,
        // §8 — kazanılan puan 12 ay sonra sona erer
        expiresAt: expiryDateFrom(new Date()),
      },
    });
    await this.audit.record({
      actorId: userId,
      action: 'loyalty.earn',
      resourceType: 'loyalty',
      safeDiff: { reason: input.reason, points: rule.points },
    });
    return this.summary(userId);
  }

  async redeem(userId: string, rewardId: string) {
    const reward = REWARDS[rewardId];
    if (!reward) {
      throw new BadRequestException({ code: 'REWARD_NOT_FOUND', message: 'Ödül bulunamadı' });
    }
    const { points } = await this.summary(userId);
    if (points < reward.cost) {
      throw new BadRequestException({ code: 'INSUFFICIENT_POINTS', message: 'Yeterli puan yok' });
    }
    await this.prisma.loyaltyEntry.create({
      data: {
        userId,
        kind: 'spend',
        reason: reward.key,
        detail: 'Ödül kullanıldı',
        points: -reward.cost,
      },
    });
    // Finansal/kritik eylem → audit log (hassas veri içermez)
    await this.audit.record({
      actorId: userId,
      actorRole: 'user',
      action: 'loyalty.redeem',
      resourceType: 'loyalty',
      resourceId: rewardId,
      safeDiff: { cost: reward.cost },
    });
    return this.summary(userId);
  }
}

function mapEntry(e: LoyaltyEntry) {
  return {
    id: e.id,
    kind: e.kind,
    labelKey: e.reason,
    detail: e.detail,
    points: e.points,
    dateLabel: dateFmt.format(e.createdAt),
  };
}
