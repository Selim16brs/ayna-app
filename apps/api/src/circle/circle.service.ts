import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Env } from '@ayna/config/env';
import { ENV } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCommentInput, CreatePostInput } from './circle.dto';
import { type ModerationVerdict, keywordModeration } from './circle.moderation';

const REPORT_THRESHOLD = 3; // eşik aşan içerik otomatik gizlenir (§5.5)

@Injectable()
export class CircleService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  // §5.5 — OpenAI /moderations (ücretsiz) birincil; anahtar yoksa keyword yedeği
  private async moderate(text: string): Promise<ModerationVerdict> {
    const key = this.env.OPENAI_API_KEY;
    if (!key) return keywordModeration(text);
    try {
      const res = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'omni-moderation-latest', input: text }),
      });
      if (!res.ok) return keywordModeration(text);
      const data = (await res.json()) as {
        results?: { flagged: boolean; categories: Record<string, boolean> }[];
      };
      const r = data.results?.[0];
      if (r?.flagged) {
        const cats = Object.entries(r.categories)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(', ');
        return { flagged: true, reason: `OpenAI moderasyon: ${cats}` };
      }
      // OpenAI temiz dese de keyword yedeğini de uygula (spam vb.)
      return keywordModeration(text);
    } catch {
      return keywordModeration(text);
    }
  }

  private async authorLabel(userId: string | undefined, anonymous: boolean): Promise<string> {
    if (anonymous || !userId) return 'AYNA Üyesi';
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const first = u?.name?.trim().split(/\s+/)[0];
    return first || 'AYNA Üyesi';
  }

  // §5.5 — uzman/salon W2W'de gönderi PAYLAŞAMAZ (okur + yorum yapar)
  private assertCanPost(role: string | undefined) {
    if (role === 'professional' || role === 'salon') {
      throw new ForbiddenException({
        code: 'CIRCLE_POST_FORBIDDEN',
        message: 'Uzman/salon hesapları W2W akışında paylaşım yapamaz',
      });
    }
  }

  async listPosts() {
    const posts = await this.prisma.circlePost.findMany({
      where: { status: 'published' },
      orderBy: [{ helpful: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    const counts = await this.prisma.circleComment.groupBy({
      by: ['postId'],
      _count: { _all: true },
      where: { postId: { in: posts.map((p) => p.id) } },
    });
    const byPost = new Map(counts.map((c) => [c.postId, c._count._all]));
    return posts.map((p) => ({
      id: p.id,
      category: p.category,
      text: p.text,
      anonymous: p.anonymous,
      authorLabel: p.authorLabel,
      helpful: p.helpful,
      comments: byPost.get(p.id) ?? 0,
      createdAt: p.createdAt,
    }));
  }

  async createPost(userId: string | undefined, role: string | undefined, input: CreatePostInput) {
    this.assertCanPost(role);
    const verdict = await this.moderate(input.text);
    const anonymous = input.anonymous ?? false;
    const post = await this.prisma.circlePost.create({
      data: {
        userId: userId ?? null,
        category: input.category,
        text: input.text,
        anonymous,
        authorLabel: await this.authorLabel(userId, anonymous),
        // Şüpheli → yayınlanmaz, admin kuyruğuna düşer (pending)
        status: verdict.flagged ? 'pending' : 'published',
        moderationReason: verdict.reason,
      },
    });
    return { id: post.id, status: post.status, moderationReason: post.moderationReason };
  }

  async addComment(
    userId: string | undefined,
    role: string | undefined,
    postId: string,
    input: CreateCommentInput,
  ) {
    const post = await this.prisma.circlePost.findUnique({ where: { id: postId } });
    if (!post || post.status !== 'published') {
      throw new NotFoundException({ code: 'POST_NOT_FOUND', message: 'Gönderi bulunamadı' });
    }
    const verdict = await this.moderate(input.text);
    if (verdict.flagged) {
      throw new ForbiddenException({ code: 'COMMENT_BLOCKED', message: verdict.reason });
    }
    const anonymous = input.anonymous ?? false;
    const c = await this.prisma.circleComment.create({
      data: {
        postId,
        userId: userId ?? null,
        authorLabel: await this.authorLabel(userId, anonymous),
        text: input.text,
      },
    });
    return { id: c.id };
  }

  // §5.5 — şikâyet; eşik aşınca otomatik gizle + admin kuyruğu
  async report(userId: string | undefined, postId: string, reason?: string) {
    const post = await this.prisma.circlePost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException({ code: 'POST_NOT_FOUND', message: 'Gönderi bulunamadı' });
    await this.prisma.circleReport.create({
      data: { postId, userId: userId ?? null, reason: reason ?? '' },
    });
    const reports = post.reports + 1;
    const hide = reports >= REPORT_THRESHOLD;
    await this.prisma.circlePost.update({
      where: { id: postId },
      data: {
        reports,
        ...(hide && post.status === 'published'
          ? { status: 'hidden', moderationReason: `${reports} şikâyet — otomatik gizlendi` }
          : {}),
      },
    });
    return { reports, hidden: hide };
  }

  // ── Admin (§12.5 Moderasyon Merkezi) ────────────────────────────────────
  async queue() {
    const posts = await this.prisma.circlePost.findMany({
      where: { status: { in: ['pending', 'hidden'] } },
      orderBy: { createdAt: 'desc' },
    });
    return posts.map((p) => ({
      id: p.id,
      category: p.category,
      text: p.text,
      authorLabel: p.authorLabel,
      status: p.status,
      reports: p.reports,
      moderationReason: p.moderationReason,
      createdAt: p.createdAt,
    }));
  }

  async resolve(postId: string, decision: 'approve' | 'hide', actorId?: string) {
    const post = await this.prisma.circlePost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException({ code: 'POST_NOT_FOUND', message: 'Gönderi bulunamadı' });
    const updated = await this.prisma.circlePost.update({
      where: { id: postId },
      data: {
        status: decision === 'approve' ? 'published' : 'hidden',
        ...(decision === 'approve' ? { reports: 0, moderationReason: '' } : {}),
      },
    });
    await this.prisma.auditLog.create({
      data: {
        action: `circle.${decision}`,
        resourceType: 'circle_post',
        resourceId: postId,
        actorId: actorId ?? null,
        actorRole: 'admin',
      },
    });
    return { id: updated.id, status: updated.status };
  }
}
