import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateReportInput } from './reports.dto';

/**
 * §21 — KULLANICI ŞİKÂYETİ.
 *
 * Tasarım kararı: şikâyet edilen kişi bunu ASLA öğrenmez. Kadın kullanıcının
 * şikâyet etmesinin önündeki asıl engel misilleme korkusudur; bunu kaldırmak
 * şikâyet akışının kendisinden daha önemlidir.
 *
 * Bu yüzden bu serviste şikâyet edilene giden HİÇBİR bildirim/olay yoktur ve
 * hedefe dönen bir okuma ucu da açılmaz.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(reporterId: string, input: CreateReportInput) {
    if (input.targetId === reporterId) {
      throw new BadRequestException({ code: 'SELF_REPORT' });
    }
    const target = await this.prisma.user.findUnique({
      where: { id: input.targetId },
      select: { id: true },
    });
    if (!target) throw new BadRequestException({ code: 'TARGET_NOT_FOUND' });

    // Aynı kişiyi üst üste bildirme: 24 saatte bir kayıt yeter. Kullanıcıya
    // hata döndürmüyoruz — "gönderildi" demek, spam kaydı üretmekten iyi.
    const since = new Date(Date.now() - 24 * 3_600_000);
    const existing = await this.prisma.userReport.findFirst({
      where: { reporterId, targetId: input.targetId, createdAt: { gte: since } },
      select: { id: true },
    });
    if (existing) return { id: existing.id, deduped: true };

    const row = await this.prisma.userReport.create({
      data: {
        reporterId,
        targetId: input.targetId,
        reason: input.reason,
        note: input.note,
        ...(input.threadId ? { threadId: input.threadId } : {}),
      },
      select: { id: true },
    });

    // Kritik eylem → audit. PII yazılmaz: yalnız kimlikler ve sebep kodu.
    await this.audit.record({
      actorId: reporterId,
      action: 'user.report',
      resourceType: 'user',
      resourceId: input.targetId,
      safeDiff: { reason: input.reason },
    });

    return { id: row.id, deduped: false };
  }

  /** Kullanıcının KENDİ gönderdiği şikâyetler — hedefe dair hiçbir uç yok. */
  mine(reporterId: string) {
    return this.prisma.userReport.findMany({
      where: { reporterId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, reason: true, status: true, createdAt: true },
    });
  }
}
