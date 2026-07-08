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
import { PushService } from '../push/push.service';
import type { RegisterSpecialistInput } from './specialists.dto';

@Injectable()
export class SpecialistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
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
        ...(input.photoDataUrl ? { avatarUrl: input.photoDataUrl } : {}),
        ...(input.birthDateMs ? { birthDate: new Date(input.birthDateMs) } : {}),
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
            sector: input.sector ?? 'hair',
            kind: 'independent',
            city: input.city ?? '', // §5.1.4 — harita/arama şehir eşleşmesi
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

  // §CRM — BUGÜN doğum günü olan MÜŞTERİLER (uzmana randevu bağı olan gerçek kişiler)
  async birthdaysToday(expertUserId: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId: expertUserId } });
    if (!sp?.proId) return [];
    const bookings = await this.prisma.booking.findMany({
      where: { proId: sp.proId, userId: { not: null } },
      select: { userId: true },
    });
    const ids = [...new Set(bookings.map((b) => b.userId).filter((x): x is string => !!x))];
    if (ids.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids }, birthDate: { not: null } },
      select: { id: true, name: true, birthDate: true },
    });
    const now = new Date(Date.now() + 5 * 60 * 60 * 1000); // Almatı günü
    const m = now.getUTCMonth();
    const d = now.getUTCDate();
    return users
      .filter((u) => u.birthDate!.getUTCMonth() === m && u.birthDate!.getUTCDate() === d)
      .map((u) => ({ id: u.id, name: u.name }));
  }

  // §6.1 — uzman galerisi (portfolyo): hesap verisi; public profil de bundan beslenir
  async myPortfolio(expertUserId: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId: expertUserId } });
    if (!sp?.proId) return { photos: [] };
    const pro = await this.prisma.professional.findUnique({ where: { id: sp.proId } });
    return { photos: pro?.portfolio ?? [] };
  }

  async setMyPortfolio(expertUserId: string, photos: string[]) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId: expertUserId } });
    if (!sp?.proId) return { photos: [] };
    const pro = await this.prisma.professional.update({
      where: { id: sp.proId },
      data: { portfolio: photos.slice(0, 20) },
    });
    return { photos: pro.portfolio };
  }

  // §11 — hesabın katalog karşılığı: uzman (Specialist.proId) ya da salon (Business.professionalId)
  private async proIdFor(userId: string): Promise<string | null> {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    if (sp?.proId) return sp.proId;
    const biz = await this.prisma.business.findFirst({ where: { ownerUserId: userId } });
    return biz?.professionalId ?? null;
  }

  // §11 — Platinum promosyonları: profil sayfasında yayınlanır (Keşfet vitrini DEĞİL — o admin'in)
  async myPromotions(userId: string) {
    const proId = await this.proIdFor(userId);
    if (!proId) return { promotions: [] };
    const pro = await this.prisma.professional.findUnique({ where: { id: proId } });
    return { promotions: safeParse(pro?.promoJson) };
  }

  async setMyPromotions(userId: string, promotions: unknown[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.membershipTier !== 'platinum') {
      throw new ForbiddenException({
        code: 'PLATINUM_REQUIRED',
        message: 'Promosyon oluşturma yalnız Platinum üyelikte',
      });
    }
    const proId = await this.proIdFor(userId);
    if (!proId) return { promotions: [] };
    const pro = await this.prisma.professional.update({
      where: { id: proId },
      data: { promoJson: JSON.stringify(promotions.slice(0, 10)) },
    });
    return { promotions: safeParse(pro.promoJson) };
  }

  // §CRM — kutlama: müşteriye push doğum günü mesajı (uzman adına)
  async celebrate(expertUserId: string, customerId: string) {
    const expert = await this.prisma.user.findUnique({
      where: { id: expertUserId },
      select: { name: true },
    });
    void this.push.sendToUser(customerId, {
      title: 'İyi ki doğdun! 🎂',
      body: `${expert?.name ?? 'Uzmanın'} doğum gününü kutluyor — nice mutlu, güzel yıllara! ✨`,
      data: { route: '/notifications' },
    });
    return { ok: true };
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

function safeParse(raw?: string): unknown[] {
  try {
    const arr = JSON.parse(raw ?? '[]') as unknown;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
