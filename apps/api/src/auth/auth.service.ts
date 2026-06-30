import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { Env } from '@ayna/config/env';
import { ENV } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';
import {
  decryptField,
  encryptField,
  hashPassword,
  normalizePhone,
  phoneHash,
  signJwt,
  verifyPassword,
} from '../common/crypto';
import type { LoginInput, RegisterInput } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async register(input: RegisterInput) {
    const key = this.env.FIELD_ENCRYPTION_KEY;
    const ph = phoneHash(input.phone, key);
    const existing = await this.prisma.user.findUnique({ where: { phoneHash: ph } });
    if (existing) {
      throw new ConflictException({ code: 'PHONE_TAKEN', message: 'Bu telefon zaten kayıtlı' });
    }
    if (input.email) {
      const byEmail = await this.prisma.user.findUnique({ where: { email: input.email } });
      if (byEmail) {
        throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Bu e-posta zaten kayıtlı' });
      }
    }
    const user = await this.prisma.user.create({
      data: {
        phoneHash: ph,
        phoneEnc: Uint8Array.from(encryptField(normalizePhone(input.phone), key)),
        passwordHash: hashPassword(input.password),
        name: input.name,
        defaultLocale: 'tr',
        ...(input.email ? { email: input.email } : {}),
        ...(input.city ? { city: input.city } : {}),
      },
    });
    // Hoş geldin bonusu (sadakat defterine ilk kayıt)
    await this.prisma.loyaltyEntry.create({
      data: {
        userId: user.id,
        kind: 'earn',
        reason: 'rewards.earn.welcome',
        detail: '',
        points: 200,
      },
    });
    return this.session(user);
  }

  async login(input: LoginInput) {
    const key = this.env.FIELD_ENCRYPTION_KEY;
    const user = input.identifier.includes('@')
      ? await this.prisma.user.findUnique({ where: { email: input.identifier } })
      : await this.prisma.user.findUnique({
          where: { phoneHash: phoneHash(input.identifier, key) },
        });
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException({ code: 'BAD_CREDENTIALS', message: 'Bilgiler hatalı' });
    }
    // §3.2 — İşletme admin onayı olmadan giriş yapamaz
    if (user.role === 'salon') {
      const business = await this.prisma.business.findFirst({ where: { ownerUserId: user.id } });
      if (business && business.status !== 'approved') {
        throw new UnauthorizedException({
          code: business.status === 'pending' ? 'BUSINESS_PENDING' : 'BUSINESS_REJECTED',
          message:
            business.status === 'pending'
              ? 'İşletme hesabınız admin onayı bekliyor'
              : `İşletme kaydı reddedildi: ${business.rejectReason ?? ''}`,
        });
      }
    }
    return this.session(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException({ code: 'NO_USER', message: 'Kullanıcı yok' });
    return this.safe(user);
  }

  private session(user: User) {
    const token = signJwt(
      { sub: user.id, role: user.role },
      this.env.JWT_ACCESS_SECRET,
      this.env.JWT_ACCESS_TTL,
    );
    return { token, user: this.safe(user) };
  }

  private safe(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email ?? undefined,
      city: user.city ?? undefined,
      role: user.role,
      phone: decryptField(Buffer.from(user.phoneEnc), this.env.FIELD_ENCRYPTION_KEY),
    };
  }
}
