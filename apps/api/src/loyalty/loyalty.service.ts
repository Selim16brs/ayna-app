import { BadRequestException, Injectable } from '@nestjs/common';
import type { LoyaltyEntry } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { EarnInput } from './loyalty.dto';

// Ödül kataloğu (mobil REWARDS ile aynı) — maliyet ve i18n etiketi sunucuda doğrulanır
const REWARDS: Record<string, { cost: number; key: string }> = {
  rw1: { cost: 200, key: 'rewards.redeem.discount' },
  rw2: { cost: 150, key: 'rewards.redeem.addon' },
  rw3: { cost: 100, key: 'rewards.redeem.raffle' },
  rw4: { cost: 500, key: 'rewards.redeem.premium' },
};

const dateFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });

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
    const points = entries.reduce((sum, e) => sum + e.points, 0);
    const raffleEntries = entries.filter(
      (e) => e.kind === 'spend' && e.reason === 'rewards.redeem.raffle',
    ).length;
    return { points, raffleEntries, ledger: entries.map(mapEntry) };
  }

  async earn(userId: string, input: EarnInput) {
    await this.prisma.loyaltyEntry.create({
      data: {
        userId,
        kind: 'earn',
        reason: input.reason,
        detail: input.detail ?? '',
        points: input.points,
      },
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
