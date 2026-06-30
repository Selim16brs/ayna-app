import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import type { Specialist, User } from '@prisma/client';
import type { Env } from '@ayna/config/env';
import { ENV } from '../config/config.module';
import { encryptField, hashPassword, normalizePhone, phoneHash, signJwt } from '../common/crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { RegisterSpecialistInput } from './specialists.dto';

@Injectable()
export class SpecialistsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  // §3.3 — Uzman kaydı. Salona bağlıysa işletme doğrulama kodu şart.
  async register(input: RegisterSpecialistInput) {
    let businessId: string | null = null;

    if (input.kind === 'salon_bound') {
      if (!input.businessId || !input.code) {
        throw new BadRequestException({ code: 'CODE_REQUIRED', message: 'Doğrulama kodu gerekli' });
      }
      const c = await this.prisma.businessInviteCode.findUnique({ where: { code: input.code } });
      const valid = c && c.businessId === input.businessId && c.status === 'active';
      if (!valid) {
        if (c && c.businessId === input.businessId) {
          await this.prisma.businessInviteCode.update({
            where: { id: c.id },
            data: { attempts: { increment: 1 } },
          });
        }
        throw new BadRequestException({
          code: 'INVALID_CODE',
          message: 'Kod geçersiz. Bir işletmeye bağlı değilseniz bireysel kayıt açın.',
        });
      }
      businessId = input.businessId;
    }

    const key = this.env.FIELD_ENCRYPTION_KEY;
    const ph = phoneHash(input.phone, key);
    if (await this.prisma.user.findUnique({ where: { phoneHash: ph } })) {
      throw new ConflictException({ code: 'PHONE_TAKEN', message: 'Bu telefon zaten kayıtlı' });
    }
    if (input.email && (await this.prisma.user.findUnique({ where: { email: input.email } }))) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Bu e-posta zaten kayıtlı' });
    }

    const user = await this.prisma.user.create({
      data: {
        phoneHash: ph,
        phoneEnc: Uint8Array.from(encryptField(normalizePhone(input.phone), key)),
        passwordHash: hashPassword(input.password),
        name: input.name,
        role: 'professional',
        defaultLocale: 'tr',
        ...(input.email ? { email: input.email } : {}),
        ...(input.city ? { city: input.city } : {}),
      },
    });

    const specialist = await this.prisma.specialist.create({
      data: {
        userId: user.id,
        businessId,
        kind: input.kind,
        bio: input.bio ?? '',
        certificates: input.certificates,
        featured: input.certificates.length > 0, // sertifika → öne çıkma (§3.3)
      },
    });

    if (input.kind === 'salon_bound' && input.code) {
      await this.prisma.businessInviteCode.update({
        where: { code: input.code },
        data: { status: 'used', usedByUserId: user.id },
      });
    }

    return { token: this.token(user), specialist: mapSpecialist(specialist) };
  }

  private token(user: User): string {
    return signJwt(
      { sub: user.id, role: user.role },
      this.env.JWT_ACCESS_SECRET,
      this.env.JWT_ACCESS_TTL,
    );
  }
}

function mapSpecialist(s: Specialist) {
  return {
    id: s.id,
    kind: s.kind,
    businessId: s.businessId ?? undefined,
    bio: s.bio,
    featured: s.featured,
  };
}
