import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SubmitRatingInput } from './ratings.dto';

const THRESHOLD_KEY = 'rating.threshold';
const DEFAULT_THRESHOLD = 3;

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async threshold(): Promise<number> {
    const s = await this.prisma.setting.findUnique({ where: { key: THRESHOLD_KEY } });
    return s?.intValue ?? DEFAULT_THRESHOLD;
  }

  // §1.8 — puan ver. İki taraf da verene kadar gizli (çift-kör).
  async submit(input: SubmitRatingInput) {
    const created = await this.prisma.rating.create({
      data: {
        bookingId: input.bookingId,
        raterRole: input.raterRole,
        subjectId: input.subjectId,
        score: input.score,
        comment: input.comment ?? '',
        visible: false,
      },
    });

    // Aynı randevuda hem kullanıcı hem uzman puan verdiyse → ikisini de görünür yap
    const roles = await this.prisma.rating.findMany({
      where: { bookingId: input.bookingId },
      select: { raterRole: true },
    });
    const bothRated =
      roles.some((r) => r.raterRole === 'user') && roles.some((r) => r.raterRole === 'specialist');
    if (bothRated) {
      await this.prisma.rating.updateMany({
        where: { bookingId: input.bookingId },
        data: { visible: true },
      });
    }

    return { id: created.id, visible: bothRated, bothRated };
  }

  // §1.8 — agregat yalnızca eşik aşılınca görünür.
  async summary(subjectId: string) {
    const threshold = await this.threshold();
    const visible = await this.prisma.rating.findMany({
      where: { subjectId, visible: true },
      orderBy: { createdAt: 'desc' },
    });
    const count = visible.length;
    const revealed = count >= threshold;
    const average = revealed
      ? Math.round((visible.reduce((s, r) => s + r.score, 0) / count) * 10) / 10
      : null;
    return {
      subjectId,
      count,
      average,
      revealed,
      threshold,
      reviews: revealed
        ? visible.map((r) => ({ id: r.id, score: r.score, comment: r.comment }))
        : [],
    };
  }

  async setThreshold(value: number) {
    const s = await this.prisma.setting.upsert({
      where: { key: THRESHOLD_KEY },
      create: { key: THRESHOLD_KEY, intValue: value },
      update: { intValue: value },
    });
    return { threshold: s.intValue };
  }
}
