import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Specialist, User } from '@prisma/client';
import type { Env } from '@ayna/config/env';
import { ENV } from '../config/config.module';
import {
  deviceHash,
  encryptField,
  hashPassword,
  normalizePhone,
  phoneHash,
  signJwt,
} from '../common/crypto';
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
    // §4.4 — kalıcı engel 2. katman: aynı cihaz parmak iziyle engellenmiş (suspended) hesap varsa yeni kayıt engellenir
    const dh = input.deviceFp ? deviceHash(input.deviceFp, key) : null;
    if (dh) {
      const banned = await this.prisma.user.findFirst({
        where: { deviceHash: dh, status: 'suspended' },
      });
      if (banned) {
        throw new ForbiddenException({
          code: 'DEVICE_BANNED',
          message: 'Bu cihaz kalıcı olarak engellenmiş. Destek ile iletişime geçin.',
        });
      }
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
        ...(dh ? { deviceHash: dh } : {}),
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

    // §7 — bağımsız uzman keşif kataloğunda da yer alır; yorumları bu Professional'a bağlanır.
    // (salon_bound uzman tek başına listelenmez — salonun kaydı üzerinden görünür)
    if (input.kind === 'independent') {
      try {
        const pro = await this.prisma.professional.create({
          data: {
            name: input.name,
            specialty: (input.bio ?? '').slice(0, 60) || input.name,
            sector: 'hair',
            kind: 'independent',
            district: input.city ?? '',
            imageUrl: '',
          },
        });
        await this.prisma.specialist.update({
          where: { id: specialist.id },
          data: { proId: pro.id },
        });
      } catch {
        // keşif kaydı oluşturulamazsa kayıt yine de tamamlanır (proId null kalır)
      }
    }

    return { token: this.token(user), specialist: mapSpecialist(specialist) };
  }

  // §7 — uzmanın KENDİ işlerine yazılan yorumları (proId = keşif karşılığı ile eşleşen görünür ratings).
  async myReviews(userId: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    if (!sp?.proId) return { linked: false, average: null, count: 0, reviews: [] };
    const rows = await this.prisma.rating.findMany({
      where: { subjectId: sp.proId, raterRole: 'user', visible: true },
      orderBy: { createdAt: 'desc' },
    });
    const count = rows.length;
    const average = count
      ? Math.round((rows.reduce((s, r) => s + r.score, 0) / count) * 10) / 10
      : null;
    return {
      linked: true,
      average,
      count,
      reviews: rows.map((r) => ({
        id: r.id,
        score: r.score,
        comment: r.comment,
        serviceTag: r.serviceTag,
        authorLabel: r.authorLabel,
        reply: r.reply,
        createdAt: r.createdAt,
      })),
    };
  }

  // §7.2 — uzman yalnız KENDİ yorumuna tek yanıt yazabilir (silemez).
  async replyReview(userId: string, ratingId: string, text: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    // geçersiz/hatalı UUID → Prisma fırlatır; kullanıcıya 404 olarak dönelim (500 değil)
    const r = await this.prisma.rating.findUnique({ where: { id: ratingId } }).catch(() => null);
    if (!r) throw new NotFoundException({ code: 'RATING_NOT_FOUND', message: 'Yorum bulunamadı' });
    if (!sp?.proId || r.subjectId !== sp.proId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Bu yorum sana ait değil' });
    }
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

  // §7.2 — uzman KENDİ yorumuna itiraz eder → admin kuyruğuna düşer; yorum GÖRÜNÜR kalır (otomatik gizleme YOK).
  async disputeReview(userId: string, ratingId: string, reason: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    const r = await this.prisma.rating.findUnique({ where: { id: ratingId } }).catch(() => null);
    if (!r) throw new NotFoundException({ code: 'RATING_NOT_FOUND', message: 'Yorum bulunamadı' });
    if (!sp?.proId || r.subjectId !== sp.proId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Bu yorum sana ait değil' });
    }
    const updated = await this.prisma.rating.update({
      where: { id: ratingId },
      // visible DEĞİŞMEZ — yorum inceleme boyunca görünür kalır (§7.2)
      data: { disputed: true, disputeReason: reason || null, disputedAt: new Date() },
    });
    return { id: updated.id, disputed: updated.disputed };
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
