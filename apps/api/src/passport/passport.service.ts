import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { GrantInput, SavePassportInput } from './passport.dto';

/**
 * §19 — AYNA PASSPORT.
 *
 * Kalıcı bir profil DEĞİL: randevu başına açılan, kendiliğinden kapanan geçici
 * erişim. Fark önemli — profil kalıcıdır ve unutulur; passport açılır, işini
 * görür ve kapanır.
 *
 * SAĞLIK İSTİSNASI açıkça kabul edilmiştir: alerjiler, erişim açılmasa bile
 * randevusu onaylanmış uzmana gider. Sağlık gizlilikten önce gelir; kullanıcıya
 * da ekranda böyle yazıyor. İstisnayı gizlemek yerine gerekçesiyle yazıyoruz.
 */

/** Erişim süresi: hizmetten sonra da lazım olabilir, ertesi gün kapanır. */
const ACCESS_TTL_MS = 24 * 3_600_000;

@Injectable()
export class PassportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async mine(userId: string) {
    const row = await this.prisma.userPassport.findUnique({ where: { userId } });
    return {
      allergies: row?.allergies ?? [],
      quietVisit: row?.quietVisit ?? false,
      noPhotos: row?.noPhotos ?? false,
      notifyLate: row?.notifyLate ?? true,
      womenOnly: row?.womenOnly ?? false,
      traits: safeParse(row?.traitsJson),
    };
  }

  async save(userId: string, input: SavePassportInput) {
    const data = {
      ...(input.allergies !== undefined ? { allergies: input.allergies } : {}),
      ...(input.quietVisit !== undefined ? { quietVisit: input.quietVisit } : {}),
      ...(input.noPhotos !== undefined ? { noPhotos: input.noPhotos } : {}),
      ...(input.notifyLate !== undefined ? { notifyLate: input.notifyLate } : {}),
      ...(input.womenOnly !== undefined ? { womenOnly: input.womenOnly } : {}),
      ...(input.traits !== undefined ? { traitsJson: JSON.stringify(input.traits) } : {}),
    };
    await this.prisma.userPassport.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return this.mine(userId);
  }

  /** Erişim kaydı — kullanıcı KENDİ görür. "Kim ne zaman baktı" gizli tutulmaz. */
  access(userId: string) {
    return this.prisma.passportAccess.findMany({
      where: { userId },
      orderBy: { grantedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        proId: true,
        bookingId: true,
        grantedAt: true,
        expiresAt: true,
        revokedAt: true,
        lastViewAt: true,
      },
    });
  }

  async grant(userId: string, input: GrantInput) {
    const row = await this.prisma.passportAccess.create({
      data: {
        userId,
        proId: input.proId,
        ...(input.bookingId ? { bookingId: input.bookingId } : {}),
        expiresAt: new Date(Date.now() + ACCESS_TTL_MS),
      },
      select: { id: true, expiresAt: true },
    });
    await this.audit.record({
      actorId: userId,
      action: 'passport.grant',
      resourceType: 'passport',
      resourceId: input.proId,
    });
    return row;
  }

  async revoke(userId: string, id: string) {
    const row = await this.prisma.passportAccess.findUnique({ where: { id } });
    if (!row || row.userId !== userId) throw new NotFoundException({ code: 'ACCESS_NOT_FOUND' });
    await this.prisma.passportAccess.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({
      actorId: userId,
      action: 'passport.revoke',
      resourceType: 'passport',
      resourceId: row.proId,
    });
    return { ok: true };
  }

  /**
   * Uzman tarafı okuma. Erişim yoksa/süresi dolduysa/iptal edildiyse 403.
   * Her okuma lastViewAt'e yazılır — kullanıcı gerçekten bakılıp bakılmadığını görsün.
   */
  async readAsPro(proId: string, userId: string) {
    const now = new Date();
    const grant = await this.prisma.passportAccess.findFirst({
      where: { userId, proId, revokedAt: null, expiresAt: { gt: now } },
      orderBy: { grantedAt: 'desc' },
    });
    if (!grant) throw new ForbiddenException({ code: 'PASSPORT_NOT_SHARED' });

    await this.prisma.passportAccess.update({
      where: { id: grant.id },
      data: { lastViewAt: now },
    });
    return this.mine(userId);
  }
}

function safeParse(json?: string | null): Record<string, string> {
  if (!json) return {};
  try {
    const v: unknown = JSON.parse(json);
    return v && typeof v === 'object' ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
}
