import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Business, BusinessInviteCode } from '@prisma/client';
import type { Env } from '@ayna/config/env';
import { AuditService } from '../audit/audit.service';
import { BookingsService } from '../bookings/bookings.service';
import { ENV } from '../config/config.module';
import { encryptField, hashPassword, normalizePhone, phoneHash } from '../common/crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { RegisterBusinessInput } from './businesses.dto';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(len = 6): string {
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += CODE_CHARS[bytes[i]! % CODE_CHARS.length];
  return out;
}

@Injectable()
export class BusinessesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly bookings: BookingsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  // §3.2 — İşletme kaydı: sahip hesabı (rol salon) + işletme (pending). Token YOK (admin onayı şart).
  async register(input: RegisterBusinessInput) {
    const key = this.env.FIELD_ENCRYPTION_KEY;
    const ph = phoneHash(input.phone, key);
    if (await this.prisma.user.findUnique({ where: { phoneHash: ph } })) {
      throw new ConflictException({ code: 'PHONE_TAKEN', message: 'Bu telefon zaten kayıtlı' });
    }
    if (input.email && (await this.prisma.user.findUnique({ where: { email: input.email } }))) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Bu e-posta zaten kayıtlı' });
    }
    const owner = await this.prisma.user.create({
      data: {
        phoneHash: ph,
        phoneEnc: Uint8Array.from(encryptField(normalizePhone(input.phone), key)),
        passwordHash: hashPassword(input.password),
        name: input.ownerName,
        role: 'salon',
        defaultLocale: 'tr',
        ...(input.email ? { email: input.email } : {}),
        ...(input.city ? { city: input.city } : {}),
      },
    });
    const business = await this.prisma.business.create({
      data: {
        ownerUserId: owner.id,
        name: input.name,
        ownerName: input.ownerName,
        sector: input.sector,
        categories: input.categories,
        city: input.city,
        district: input.district,
        address: input.address,
        phone: input.phone,
        email: input.email ?? '',
        workingHours: input.workingHours ?? '',
        taxId: input.taxId ?? '',
        ...(input.docUrl ? { docUrl: input.docUrl } : {}),
      },
    });
    return { business: mapBusiness(business) };
  }

  async listApproved() {
    const rows = await this.prisma.business.findMany({
      where: { status: 'approved' },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapBusiness);
  }

  // Uzman kaydında aranan işletme listesi (onaylı). Ayrıca pending da görünür ki bağlanılabilsin.
  async searchable() {
    const rows = await this.prisma.business.findMany({
      where: { status: { in: ['approved', 'pending'] } },
      orderBy: { name: 'asc' },
    });
    return rows.map((b) => ({ id: b.id, name: b.name, city: b.city, sector: b.sector }));
  }

  async mine(ownerUserId: string) {
    const rows = await this.prisma.business.findMany({ where: { ownerUserId } });
    return rows.map(mapBusiness);
  }

  async get(id: string) {
    const b = await this.prisma.business.findUnique({ where: { id } });
    if (!b) throw new NotFoundException({ code: 'NOT_FOUND', message: 'İşletme bulunamadı' });
    return mapBusiness(b);
  }

  async approve(id: string, adminId: string) {
    const b = await this.prisma.business.update({ where: { id }, data: { status: 'approved' } });
    await this.audit.record({
      actorId: adminId,
      actorRole: 'admin',
      action: 'business.approve',
      resourceType: 'business',
      resourceId: id,
    });
    return mapBusiness(b);
  }

  async reject(id: string, reason: string, adminId: string) {
    const b = await this.prisma.business.update({
      where: { id },
      data: { status: 'rejected', rejectReason: reason },
    });
    await this.audit.record({
      actorId: adminId,
      actorRole: 'admin',
      action: 'business.reject',
      resourceType: 'business',
      resourceId: id,
      safeDiff: { reason },
    });
    return mapBusiness(b);
  }

  private async assertOwner(businessId: string, ownerUserId: string) {
    const b = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!b) throw new NotFoundException({ code: 'NOT_FOUND', message: 'İşletme bulunamadı' });
    if (b.ownerUserId !== ownerUserId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yetkisiz' });
    }
    return b;
  }

  // Salon paneli — YALNIZCA kendi işletmesine (keşif listesine) ait randevular
  async bookingsForBusiness(businessId: string, ownerUserId: string) {
    const b = await this.assertOwner(businessId, ownerUserId);
    if (!b.professionalId) return { linked: false, bookings: [] };
    const rows = await this.prisma.booking.findMany({
      where: { proId: b.professionalId },
      orderBy: { inDays: 'asc' },
    });
    return {
      linked: true,
      bookings: rows.map((r) => ({
        id: r.id,
        service: r.service,
        // §5 — offline'da müşteri adı, online'da uzman adı; PII değil, salonun kendi kaydı
        customerName: r.customerName ?? r.uzmanName ?? '',
        dateLabel: r.dateLabel,
        price: Number(r.price),
        status: r.status,
        bookingKind: r.bookingKind,
        source: r.source,
      })),
    };
  }

  // Salon paneli — kendi randevusuna aksiyon (onayla/gelmedi/iptal/alternatif öner)
  // Yalnızca sahibi + randevu bu işletmenin keşif listesine ait olmalı.
  async bookingAction(
    businessId: string,
    bookingId: string,
    action: 'approve' | 'no-show' | 'cancel' | 'propose',
    ownerUserId: string,
    dateLabel?: string,
  ) {
    const b = await this.assertOwner(businessId, ownerUserId);
    const bk = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!bk || !b.professionalId || bk.proId !== b.professionalId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Randevu bulunamadı' });
    }
    switch (action) {
      case 'approve':
        return this.bookings.approve(bookingId);
      case 'no-show':
        return this.bookings.noShow(bookingId);
      case 'cancel':
        return this.bookings.cancel(bookingId);
      case 'propose':
        if (!dateLabel) {
          throw new NotFoundException({ code: 'BAD_INPUT', message: 'Tarih gerekli' });
        }
        return this.bookings.propose(bookingId, dateLabel);
    }
  }

  // Salon paneli — kendi yorumları (provider-blind: yazar kimliği DEĞİL, yalnızca etiket)
  async reviewsForBusiness(businessId: string, ownerUserId: string) {
    const b = await this.assertOwner(businessId, ownerUserId);
    if (!b.professionalId) return { linked: false, average: null, count: 0, reviews: [] };
    const rows = await this.prisma.rating.findMany({
      where: { subjectId: b.professionalId, visible: true },
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
        authorLabel: r.authorLabel, // kimlik değil (privacy-by-design)
        reply: r.reply,
        createdAt: r.createdAt,
      })),
    };
  }

  // Salon paneli — kendi yorumuna yanıt (§6.D: silinemez, yalnızca yanıtlanır; sahiplik doğrulanır)
  async replyToReview(businessId: string, ratingId: string, text: string, ownerUserId: string) {
    const b = await this.assertOwner(businessId, ownerUserId);
    const r = await this.prisma.rating.findUnique({ where: { id: ratingId } });
    if (!r || r.subjectId !== b.professionalId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Yorum bulunamadı' });
    }
    const updated = await this.prisma.rating.update({
      where: { id: ratingId },
      data: { reply: text, repliedAt: new Date() },
    });
    return { id: updated.id, reply: updated.reply };
  }

  async createInviteCode(businessId: string, ownerUserId: string) {
    await this.assertOwner(businessId, ownerUserId);
    let code = randomCode();
    // Çakışma olmayan kod garanti
    for (let i = 0; i < 5; i++) {
      if (!(await this.prisma.businessInviteCode.findUnique({ where: { code } }))) break;
      code = randomCode();
    }
    const created = await this.prisma.businessInviteCode.create({ data: { businessId, code } });
    return { id: created.id, code: created.code, status: created.status };
  }

  async listInviteCodes(businessId: string, ownerUserId: string) {
    await this.assertOwner(businessId, ownerUserId);
    const rows = await this.prisma.businessInviteCode.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((c: BusinessInviteCode) => ({
      id: c.id,
      code: c.code,
      status: c.status,
      attempts: c.attempts,
    }));
  }

  async revokeInviteCode(businessId: string, codeId: string, ownerUserId: string) {
    await this.assertOwner(businessId, ownerUserId);
    const c = await this.prisma.businessInviteCode.findUnique({ where: { id: codeId } });
    if (!c || c.businessId !== businessId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Kod bulunamadı' });
    }
    await this.prisma.businessInviteCode.update({
      where: { id: codeId },
      data: { status: 'revoked' },
    });
    return { ok: true };
  }
}

function mapBusiness(b: Business) {
  return {
    id: b.id,
    name: b.name,
    ownerName: b.ownerName,
    sector: b.sector,
    categories: b.categories,
    city: b.city,
    district: b.district,
    address: b.address,
    phone: b.phone,
    email: b.email,
    workingHours: b.workingHours,
    status: b.status,
    rejectReason: b.rejectReason ?? undefined,
  };
}
