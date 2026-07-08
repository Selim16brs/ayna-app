import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SubmitKycInput } from './kyc.dto';

// EK Z.3 — Ağır KYC servisi. Uzman/salon belge yükler → admin onaylar → "doğrulanmış" rozeti.
// Mevcut OTP + yüz tespiti self-publish akışına EK katman (MD_000 satır 67'yi geçersiz kılmaz,
// üstüne opsiyonel güven katmanı ekler).
@Injectable()
export class KycService {
  constructor(private readonly prisma: PrismaService) {}

  // Uzman/salon başvuru gönderir (pending). Mevcut pending varsa yenisiyle değişir.
  async submit(userId: string, role: string, input: SubmitKycInput) {
    if (role !== 'professional' && role !== 'salon') {
      throw new ForbiddenException({
        code: 'PRO_ONLY',
        message: 'Yalnızca uzman/salon doğrulama gönderebilir',
      });
    }
    // Aynı kullanıcının bekleyen başvurusunu temizle (tek aktif başvuru)
    await this.prisma.kycVerification.deleteMany({ where: { userId, status: 'pending' } });
    const v = await this.prisma.kycVerification.create({
      data: { userId, docType: input.docType, documents: input.documents, status: 'pending' },
    });
    await this.prisma.user.update({ where: { id: userId }, data: { kycStatus: 'pending' } });
    return this.map(v);
  }

  async mine(userId: string) {
    const [u, v] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { kycStatus: true, kycVerifiedAt: true },
      }),
      this.prisma.kycVerification.findFirst({
        where: { userId },
        orderBy: { submittedAt: 'desc' },
      }),
    ]);
    return {
      status: u?.kycStatus ?? 'none',
      verifiedAt: u?.kycVerifiedAt ?? null,
      latest: v ? this.map(v) : null,
    };
  }

  // ── Admin ──────────────────────────────────────────────────────────────
  async queue(status?: string) {
    const rows = await this.prisma.kycVerification.findMany({
      where: status ? { status } : {},
      orderBy: { submittedAt: 'desc' },
      take: 200,
    });
    const ids = rows.map((r) => r.userId);
    const users = ids.length
      ? await this.prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, role: true },
        })
      : [];
    const uMap = new Map(users.map((u) => [u.id, u]));
    return rows.map((r) => ({
      ...this.map(r),
      userName: uMap.get(r.userId)?.name ?? '',
      userRole: uMap.get(r.userId)?.role ?? '',
    }));
  }

  async approve(id: string, actorId?: string) {
    const v = await this.prisma.kycVerification.findUnique({ where: { id } });
    if (!v) throw new NotFoundException({ code: 'KYC_NOT_FOUND', message: 'Başvuru bulunamadı' });
    if (v.status !== 'pending')
      throw new BadRequestException({
        code: 'ALREADY_REVIEWED',
        message: 'Başvuru zaten değerlendirildi',
      });
    const updated = await this.prisma.kycVerification.update({
      where: { id },
      data: { status: 'approved', reviewedAt: new Date() },
    });
    await this.prisma.user.update({
      where: { id: v.userId },
      data: { kycStatus: 'approved', kycVerifiedAt: new Date() },
    });
    await this.audit('kyc.approve', id, actorId);
    return this.map(updated);
  }

  async reject(id: string, note: string | undefined, actorId?: string) {
    const v = await this.prisma.kycVerification.findUnique({ where: { id } });
    if (!v) throw new NotFoundException({ code: 'KYC_NOT_FOUND', message: 'Başvuru bulunamadı' });
    if (v.status !== 'pending')
      throw new BadRequestException({
        code: 'ALREADY_REVIEWED',
        message: 'Başvuru zaten değerlendirildi',
      });
    const updated = await this.prisma.kycVerification.update({
      where: { id },
      data: { status: 'rejected', note: note ?? '', reviewedAt: new Date() },
    });
    await this.prisma.user.update({ where: { id: v.userId }, data: { kycStatus: 'rejected' } });
    await this.audit('kyc.reject', id, actorId);
    return this.map(updated);
  }

  private async audit(action: string, resourceId: string, actorId?: string) {
    await this.prisma.auditLog.create({
      data: {
        action,
        resourceType: 'kyc',
        resourceId,
        actorId: actorId ?? null,
        actorRole: 'admin',
      },
    });
  }

  private map(v: {
    id: string;
    userId: string;
    docType: string;
    documents: unknown;
    status: string;
    note: string;
    submittedAt: Date;
    reviewedAt: Date | null;
  }) {
    return {
      id: v.id,
      userId: v.userId,
      docType: v.docType,
      documents: (v.documents as string[]) ?? [],
      status: v.status,
      note: v.note,
      submittedAt: v.submittedAt,
      reviewedAt: v.reviewedAt,
    };
  }
}
