import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { expiryDateFrom } from '../loyalty/loyalty.expiry';

// EK Z.6 — Müşteri referans programı. Davet eden + edilen ödül (loyalty ledger).
const REFERRAL_POINTS = 300; // §8.1 "ilk randevu / hoş geldin" ile uyumlu
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // karışabilen 0/O/1/I hariç

@Injectable()
export class ReferralService {
  constructor(private readonly prisma: PrismaService) {}

  private randomCode(len = 6): string {
    let s = '';
    for (let i = 0; i < len; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    return s;
  }

  // Kullanıcının kodunu döndür (yoksa üret + benzersizliği garanti et)
  private async ensureCode(userId: string): Promise<string> {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
    if (u?.referralCode) return u.referralCode;
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = this.randomCode();
      const clash = await this.prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
      if (!clash) {
        await this.prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
        return code;
      }
    }
    throw new BadRequestException({ code: 'CODE_GEN_FAILED', message: 'Kod üretilemedi, tekrar dene' });
  }

  async mine(userId: string) {
    const code = await this.ensureCode(userId);
    const [invited, entries] = await Promise.all([
      this.prisma.user.count({ where: { referredBy: userId } }),
      this.prisma.loyaltyEntry.findMany({
        where: { userId, reason: 'rewards.earn.referral' },
        select: { points: true },
      }),
    ]);
    const pointsEarned = entries.reduce((s, e) => s + e.points, 0);
    return { code, invited, pointsEarned, rewardPoints: REFERRAL_POINTS };
  }

  // Yeni kullanıcı bir davet kodunu kullanır → iki tarafa puan.
  async redeem(userId: string, rawCode: string) {
    const code = rawCode.trim().toUpperCase();
    const me = await this.prisma.user.findUnique({ where: { id: userId }, select: { referredBy: true, name: true } });
    if (!me) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Kullanıcı bulunamadı' });
    if (me.referredBy) throw new BadRequestException({ code: 'ALREADY_REFERRED', message: 'Zaten bir davet kodu kullandın' });

    const referrer = await this.prisma.user.findUnique({ where: { referralCode: code }, select: { id: true, name: true } });
    if (!referrer) throw new NotFoundException({ code: 'CODE_NOT_FOUND', message: 'Davet kodu geçersiz' });
    if (referrer.id === userId) throw new BadRequestException({ code: 'SELF_REFERRAL', message: 'Kendi kodunu kullanamazsın' });

    await this.prisma.user.update({ where: { id: userId }, data: { referredBy: referrer.id } });
    const expiresAt = expiryDateFrom(new Date());
    await this.prisma.loyaltyEntry.createMany({
      data: [
        { userId: referrer.id, kind: 'earn', reason: 'rewards.earn.referral', detail: me.name, points: REFERRAL_POINTS, expiresAt },
        { userId, kind: 'earn', reason: 'rewards.earn.referral', detail: referrer.name, points: REFERRAL_POINTS, expiresAt },
      ],
    });
    return { ok: true, pointsAwarded: REFERRAL_POINTS, referrerName: referrer.name };
  }
}
