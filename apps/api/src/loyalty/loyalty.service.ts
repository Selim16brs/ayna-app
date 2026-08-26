import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { LoyaltyEntry } from '@prisma/client';
import { expiringWithin, shouldUnlock, spendGate } from '@ayna/domain';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { EarnInput } from './loyalty.dto';
import { EXPIRY_WARN_DAYS } from './loyalty.expiry';
import { grantPoints } from './loyalty.grant';
import { loadLedgerState, loadLoyaltyRules } from './loyalty.rules';

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
  private readonly log = new Logger(LoyaltyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async summary(userId: string) {
    const now = new Date();
    const [entries, rules, state, user] = await Promise.all([
      this.prisma.loyaltyEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      loadLoyaltyRules(this.prisma),
      loadLedgerState(this.prisma, userId, now),
      this.prisma.user.findUnique({ where: { id: userId }, select: { pointsUnlockedAt: true } }),
    ]);
    // K4.2 — bakiye eşiği geçtiyse kilit KALICI olarak açılır (bir defalık damga).
    let unlockedAt = user?.pointsUnlockedAt ?? null;
    if (shouldUnlock(state.available, unlockedAt, rules)) {
      unlockedAt = now;
      await this.prisma.user.update({ where: { id: userId }, data: { pointsUnlockedAt: now } });
      await this.audit.record({
        actorId: userId,
        actorRole: 'user',
        action: 'loyalty.unlock',
        resourceType: 'loyalty',
        resourceId: userId,
        safeDiff: { threshold: rules.unlockAt },
      });
    }
    const gate = spendGate(state.available, unlockedAt, rules);
    // Karşılıksız harcama = veri tutarsızlığı. Sessiz kalmaz; PII taşımaz.
    if (state.overspent > 0) {
      this.log.error(`loyalty: defterde ${state.overspent} puanlık karşılıksız harcama var`);
    }
    const raffleEntries = entries.filter(
      (e) => e.kind === 'spend' && e.reason === 'rewards.redeem.raffle',
    ).length;
    return {
      points: state.available,
      raffleEntries,
      tier: computeTier(state.lifetimeEarned),
      ledger: entries.map(mapEntry),
      // §8 — yaklaşan yanma uyarısı ("puanların yanmasın 🎁")
      expiringPoints: expiringWithin(state, now, EXPIRY_WARN_DAYS),
      nextExpiry: state.nextExpiry,
      // K4.5 — kurallar kullanıcıya GÖSTERİLİR; istemci metni buradan kurar.
      spend: {
        unlocked: gate.allowed,
        unlockAt: rules.unlockAt,
        remainingToUnlock: gate.allowed ? 0 : gate.remaining,
        capPct: rules.capPct,
        expiryDays: rules.expiryDays,
        // §8.4 — istemci tavanı sunucuyla AYNI fonksiyonla hesaplasın diye
        // gereken iki değer de burada.
        commissionPct: rules.commissionPct,
        subsidyCapPct: rules.subsidyCapPct,
      },
    };
  }

  async earn(userId: string, input: EarnInput) {
    // K4.4 — son kullanma tarihini grantPoints koyar; tek kapı.
    await grantPoints(this.prisma, {
      userId,
      reason: input.reason,
      detail: input.detail ?? '',
      points: input.points,
    });
    return this.summary(userId);
  }

  async redeem(userId: string, rewardId: string) {
    const reward = REWARDS[rewardId];
    if (!reward) {
      throw new BadRequestException({ code: 'REWARD_NOT_FOUND', message: 'Ödül bulunamadı' });
    }
    const { points, spend } = await this.summary(userId);
    // K4.2 — ödül kullanımı da kilide tabidir; aksi hâlde kilit yalnız ödemede
    // geçerli olur ve kullanıcı puanı ödül kataloğundan sızdırırdı.
    if (!spend.unlocked) {
      throw new BadRequestException({
        code: 'POINTS_LOCKED',
        message: `Puan kullanımı ${spend.unlockAt.toLocaleString('tr-TR')} ₸ bakiyeden sonra açılır`,
      });
    }
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
