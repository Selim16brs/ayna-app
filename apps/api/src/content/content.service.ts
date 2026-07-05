import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import type {
  AnnouncementInput,
  ApplicationInput,
  ArticleInput,
  ArticlePatchInput,
  ReviewApplicationInput,
  ThemeInput,
} from './content.dto';

// Onaylanan blog başvurusuna verilen varsayılan puan (§12.6 "puan otomatik verilir")
const BLOG_APPROVAL_POINTS = 200;

interface ArticleRow {
  id: string;
  title: string;
  tag: string;
  categoryCode: string | null;
  readMin: number;
  image: string;
  excerpt: string;
  body: string[];
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
}

function mapArticle(a: ArticleRow) {
  return {
    id: a.id,
    title: a.title,
    tag: a.tag,
    categoryCode: a.categoryCode ?? null,
    readMin: a.readMin,
    image: a.image,
    excerpt: a.excerpt,
    body: a.body,
    published: a.published,
    publishedAt: a.publishedAt,
    createdAt: a.createdAt,
  };
}

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  // Kritik eylem izi — PII yok (yalnızca rol/kaynak)
  private async audit(action: string, resourceId: string, actorId?: string) {
    await this.prisma.auditLog.create({
      data: { action, resourceType: 'blog', resourceId, actorId: actorId ?? null, actorRole: 'admin' },
    });
  }

  // ── Public (app) ───────────────────────────────────────────────────────
  async publicArticles() {
    const rows = await this.prisma.blogArticle.findMany({
      where: { published: true },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(mapArticle);
  }

  async publicArticle(id: string) {
    const a = await this.prisma.blogArticle.findFirst({ where: { id, published: true } });
    if (!a) throw new NotFoundException({ code: 'ARTICLE_NOT_FOUND', message: 'Yazı bulunamadı' });
    return mapArticle(a);
  }

  async activeTheme() {
    const t = await this.prisma.weeklyTheme.findFirst({
      where: { active: true },
      orderBy: { weekStart: 'desc' },
    });
    return t ?? null;
  }

  async submitApplication(input: ApplicationInput, userId?: string) {
    const app = await this.prisma.blogApplication.create({
      data: {
        userId: userId ?? null,
        authorName: input.authorName,
        title: input.title,
        excerpt: input.excerpt ?? '',
        body: input.body,
        tag: input.tag ?? '',
      },
    });
    return { id: app.id, status: app.status };
  }

  // ── Admin — makaleler ───────────────────────────────────────────────────
  async adminArticles() {
    const rows = await this.prisma.blogArticle.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map(mapArticle);
  }

  async createArticle(input: ArticleInput, actorId?: string) {
    const published = input.published ?? false;
    const a = await this.prisma.blogArticle.create({
      data: {
        title: input.title,
        tag: input.tag,
        categoryCode: input.categoryCode ?? null,
        readMin: input.readMin ?? 3,
        image: input.image ?? '',
        excerpt: input.excerpt,
        body: input.body,
        published,
        publishedAt: published ? new Date() : null,
      },
    });
    await this.audit('article.create', a.id, actorId);
    return mapArticle(a);
  }

  async updateArticle(id: string, patch: ArticlePatchInput, actorId?: string) {
    const existing = await this.prisma.blogArticle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'ARTICLE_NOT_FOUND', message: 'Yazı bulunamadı' });
    // Yayına ilk kez alınıyorsa publishedAt damgala
    const publishedAt =
      patch.published === true && !existing.publishedAt ? new Date() : existing.publishedAt;
    const a = await this.prisma.blogArticle.update({
      where: { id },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.tag !== undefined ? { tag: patch.tag } : {}),
        ...(patch.categoryCode !== undefined ? { categoryCode: patch.categoryCode || null } : {}),
        ...(patch.readMin !== undefined ? { readMin: patch.readMin } : {}),
        ...(patch.image !== undefined ? { image: patch.image } : {}),
        ...(patch.excerpt !== undefined ? { excerpt: patch.excerpt } : {}),
        ...(patch.body !== undefined ? { body: patch.body } : {}),
        ...(patch.published !== undefined ? { published: patch.published } : {}),
        publishedAt,
      },
    });
    await this.audit('article.update', a.id, actorId);
    return mapArticle(a);
  }

  async deleteArticle(id: string, actorId?: string) {
    await this.prisma.blogArticle.delete({ where: { id } });
    await this.audit('article.delete', id, actorId);
    return { ok: true };
  }

  // ── Admin — başvurular ──────────────────────────────────────────────────
  async adminApplications() {
    const rows = await this.prisma.blogApplication.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId ?? null,
      authorName: r.authorName,
      title: r.title,
      excerpt: r.excerpt,
      body: r.body,
      tag: r.tag,
      status: r.status,
      points: r.points,
      note: r.note,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
    }));
  }

  async reviewApplication(id: string, input: ReviewApplicationInput, actorId?: string) {
    const app = await this.prisma.blogApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException({ code: 'APPLICATION_NOT_FOUND', message: 'Başvuru bulunamadı' });
    if (app.status !== 'pending') {
      throw new NotFoundException({ code: 'ALREADY_REVIEWED', message: 'Başvuru zaten değerlendirildi' });
    }

    if (input.decision === 'reject') {
      const updated = await this.prisma.blogApplication.update({
        where: { id },
        data: { status: 'rejected', note: input.note ?? '', reviewedAt: new Date() },
      });
      await this.audit('application.reject', id, actorId);
      return { id: updated.id, status: updated.status };
    }

    // Onay: yazıyı yayına al + kullanıcıya puan yaz (loyalty ledger)
    const points = input.points ?? BLOG_APPROVAL_POINTS;
    const article = await this.prisma.blogArticle.create({
      data: {
        title: app.title,
        tag: app.tag || 'Topluluk',
        categoryCode: input.categoryCode ?? null,
        image: input.image ?? '',
        excerpt: app.excerpt || app.body[0]?.slice(0, 120) || '',
        body: app.body,
        published: true,
        publishedAt: new Date(),
        applicationId: app.id,
      },
    });
    if (app.userId) {
      await this.prisma.loyaltyEntry.create({
        data: {
          userId: app.userId,
          kind: 'earn',
          reason: 'rewards.earn.blog',
          detail: app.title,
          points,
        },
      });
    }
    const updated = await this.prisma.blogApplication.update({
      where: { id },
      data: { status: 'approved', points, reviewedAt: new Date() },
    });
    await this.audit('application.approve', id, actorId);
    return { id: updated.id, status: updated.status, articleId: article.id, points };
  }

  // ── Admin — haftalık W2W teması ────────────────────────────────────────
  async themes() {
    return this.prisma.weeklyTheme.findMany({ orderBy: { weekStart: 'desc' } });
  }

  async createTheme(input: ThemeInput, actorId?: string) {
    const t = await this.prisma.weeklyTheme.create({
      data: { title: input.title, prompt: input.prompt, weekStart: new Date(input.weekStart) },
    });
    await this.audit('theme.create', t.id, actorId);
    return t;
  }

  async activateTheme(id: string, actorId?: string) {
    // Tek aktif tema — diğerlerini kapat
    await this.prisma.weeklyTheme.updateMany({ where: { active: true }, data: { active: false } });
    const t = await this.prisma.weeklyTheme.update({ where: { id }, data: { active: true } });
    await this.audit('theme.activate', id, actorId);
    return t;
  }

  // ── §12.10 Bildirim Merkezi — toplu duyuru ─────────────────────────────
  // Segment → hedef kullanıcı filtresi (yalnızca aktif hesaplar erişilebilir)
  private segmentWhere(segment: string, city?: string | null): Prisma.UserWhereInput {
    const base: Prisma.UserWhereInput = { status: 'active' };
    switch (segment) {
      case 'premium':
        return { ...base, isPremium: true };
      case 'platinum':
        return { ...base, membershipTier: 'platinum' };
      case 'professionals':
        return { ...base, role: 'professional' };
      case 'salons':
        return { ...base, role: 'salon' };
      case 'city':
        return { ...base, city: city ?? '' };
      default:
        return base; // all
    }
  }

  async createAnnouncement(input: AnnouncementInput, actorId?: string) {
    const recipientCount = await this.prisma.user.count({
      where: this.segmentWhere(input.segment, input.city ?? null),
    });
    const a = await this.prisma.announcement.create({
      data: {
        title: input.title,
        body: input.body,
        segment: input.segment,
        city: input.segment === 'city' ? (input.city ?? null) : null,
        recipientCount,
      },
    });
    await this.audit('announcement.send', a.id, actorId);
    return a;
  }

  async announcementHistory() {
    return this.prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  }

  // Girişli kullanıcının segmentine uyan duyurular (app bildirim listesine enjekte eder)
  async announcementsForUser(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, city: true, isPremium: true, membershipTier: true },
    });
    if (!u) return [];
    const or: Prisma.AnnouncementWhereInput[] = [{ segment: 'all' }];
    if (u.isPremium) or.push({ segment: 'premium' });
    if (u.membershipTier === 'platinum') or.push({ segment: 'platinum' });
    if (u.role === 'professional') or.push({ segment: 'professionals' });
    if (u.role === 'salon') or.push({ segment: 'salons' });
    if (u.city) or.push({ segment: 'city', city: u.city });
    return this.prisma.announcement.findMany({
      where: { OR: or },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
