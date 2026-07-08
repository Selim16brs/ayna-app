import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SubmitRatingInput } from './ratings.dto';

const THRESHOLD_KEY = 'rating.threshold';
const DEFAULT_THRESHOLD = 3;

// §7.1 — salon skoru = %60 salon doğrudan puanı + %40 bağlı uzmanların ortalaması. Saf, testli.
export function blendedSalonScore(
  salonAvg: number | null,
  specialistAvgs: readonly (number | null)[],
): number | null {
  const specs = specialistAvgs.filter((n): n is number => n != null);
  const specAvg = specs.length ? specs.reduce((a, b) => a + b, 0) / specs.length : null;
  if (salonAvg == null && specAvg == null) return null;
  if (specAvg == null) return salonAvg;
  if (salonAvg == null) return Math.round(specAvg * 10) / 10;
  return Math.round((salonAvg * 0.6 + specAvg * 0.4) * 10) / 10;
}

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async threshold(): Promise<number> {
    const s = await this.prisma.setting.findUnique({ where: { key: THRESHOLD_KEY } });
    return s?.intValue ?? DEFAULT_THRESHOLD;
  }

  // §1.8 — puan ver. İki taraf da verene kadar gizli (çift-kör).
  // Doğrulanmış yorum: yorum yalnızca GERÇEKTEN TAMAMLANMIŞ ve rater'a ait randevuya bağlanır
  // → sahte/yalan yorum yazılamaz.
  async submit(input: SubmitRatingInput, raterUserId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: input.bookingId } });
    if (!booking) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    }
    if (booking.status !== 'completed') {
      throw new BadRequestException({
        code: 'BOOKING_NOT_COMPLETED',
        message: 'Yalnızca tamamlanan randevu değerlendirilebilir',
      });
    }

    // subjectId istemciden GÜVENİLMEZ — randevudan sunucuda türetilir
    let subjectId: string;
    if (input.raterRole === 'user') {
      if (!booking.userId || booking.userId !== raterUserId) {
        throw new ForbiddenException({
          code: 'NOT_YOUR_BOOKING',
          message: 'Bu randevu size ait değil',
        });
      }
      if (!booking.proId) {
        throw new BadRequestException({
          code: 'NO_SUBJECT',
          message: 'Randevu bir uzmana bağlı değil',
        });
      }
      subjectId = booking.proId;
    } else {
      if (!booking.proId) {
        throw new BadRequestException({
          code: 'NO_SUBJECT',
          message: 'Randevu bir uzmana bağlı değil',
        });
      }
      const biz = await this.prisma.business.findFirst({
        where: { professionalId: booking.proId, ownerUserId: raterUserId },
      });
      if (!biz) {
        throw new ForbiddenException({
          code: 'NOT_YOUR_BOOKING',
          message: 'Bu randevu size ait değil',
        });
      }
      if (!booking.userId) {
        throw new BadRequestException({
          code: 'NO_SUBJECT',
          message: 'Offline randevu müşterisi değerlendirilemez',
        });
      }
      subjectId = booking.userId;
    }

    // Randevu başına rol başına tek yorum (mükerrer/spam önleme)
    const existing = await this.prisma.rating.findFirst({
      where: { bookingId: input.bookingId, raterRole: input.raterRole },
    });
    if (existing) {
      throw new ConflictException({
        code: 'ALREADY_REVIEWED',
        message: 'Bu randevuyu zaten değerlendirdiniz',
      });
    }

    const created = await this.prisma.rating.create({
      data: {
        bookingId: input.bookingId,
        raterRole: input.raterRole,
        subjectId, // sunucuda türetildi (istemci override edemez)
        score: input.score,
        comment: input.comment ?? '',
        serviceTag: input.serviceTag ?? '',
        authorLabel: input.authorLabel?.trim() || 'Doğrulanmış üye',
        ...(input.photos && input.photos.length ? { photos: input.photos } : {}), // EK Z.10
        visible: false,
      },
    });

    if (input.raterRole === 'user') {
      await this.prisma.booking.update({
        where: { id: input.bookingId },
        data: { reviewed: true },
      });
    }

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
  // §7.1 — salon skoru: salon doğrudan + bağlı uzman ortalaması (blended)
  async salonScore(salonProId: string) {
    const salon = await this.summary(salonProId);
    const salonAvg = salon.average;
    const biz = await this.prisma.business.findFirst({
      where: { professionalId: salonProId },
      select: { id: true },
    });
    let specialistAvgs: (number | null)[] = [];
    if (biz) {
      const specs = await this.prisma.specialist.findMany({
        where: { businessId: biz.id },
        select: { userId: true },
      });
      // Uzman puanı subjectId=userId ile aranır (per-uzman puanlama modeli geldiğinde dolar)
      specialistAvgs = await Promise.all(
        specs.map(async (s) => {
          const rows = await this.prisma.rating.findMany({
            where: { subjectId: s.userId, visible: true },
            select: { score: true },
          });
          return rows.length ? rows.reduce((a, r) => a + r.score, 0) / rows.length : null;
        }),
      );
    }
    return {
      salonProId,
      salonAvg,
      specialistCount: specialistAvgs.filter((x) => x != null).length,
      score: blendedSalonScore(salonAvg, specialistAvgs),
    };
  }

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
        ? visible.map((r) => ({
            id: r.id,
            score: r.score,
            comment: r.comment,
            serviceTag: r.serviceTag,
            authorLabel: r.authorLabel, // kimlik değil, yalnızca etiket (provider-blind)
            photos: (r.photos as string[] | null) ?? [], // EK Z.10 — öncesi/sonrası galeri
            createdAt: r.createdAt,
            reply: r.reply,
            repliedAt: r.repliedAt,
          }))
        : [],
    };
  }

  // §6.D — uzman/işletme yorumu YANITLAR (silemez). Yalnızca görünür (kalıcı) yoruma yanıt.
  async reply(ratingId: string, text: string) {
    const r = await this.prisma.rating.findUnique({ where: { id: ratingId } });
    if (!r) throw new NotFoundException({ code: 'RATING_NOT_FOUND', message: 'Yorum bulunamadı' });
    if (!r.visible) {
      throw new BadRequestException({
        code: 'RATING_NOT_VISIBLE',
        message: 'Henüz açılmamış yoruma yanıt verilemez',
      });
    }
    const updated = await this.prisma.rating.update({
      where: { id: ratingId },
      data: { reply: text, repliedAt: new Date() },
    });
    return { id: updated.id, reply: updated.reply, repliedAt: updated.repliedAt };
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
