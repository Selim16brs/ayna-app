import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

/**
 * §destek — kullanıcının insana ulaşma yolu.
 *
 * Yardım ekranındaki "Destek ile iletişim" düğmesi hiçbir şey yapmıyordu.
 * Parası takılan, taciz bildiren ya da güvenlik sorunu yaşayan bir kadının
 * insana ulaşacak yolu yoktu.
 */

/** Yönlendirme başlıkları. Bilinmeyen değer 'other'a düşer. */
const TOPICS = new Set(['payment', 'booking', 'safety', 'account', 'other']);

/** Açık talep sınırı: aynı kullanıcı kuyruğu dolduramaz. */
const MAX_OPEN = 5;

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  async create(userId: string, topic: string, rawBody: string) {
    const body = (rawBody ?? '').trim().slice(0, 4000);
    if (body.length < 5) {
      throw new BadRequestException({ code: 'TOO_SHORT', message: 'Lütfen sorunu biraz anlat' });
    }
    // Kuyruk taşırmayı engelle — ama AÇIK taleple sınırla, toplamla değil:
    // yıllar içinde 5 talep açmış biri altıncıyı açamamalı.
    const acik = await this.prisma.supportTicket.count({ where: { userId, status: 'open' } });
    if (acik >= MAX_OPEN) {
      throw new BadRequestException({
        code: 'TOO_MANY_OPEN',
        message: 'Açık talebin var; yanıtı bekleyip oradan devam edebilirsin',
      });
    }
    const t = await this.prisma.supportTicket.create({
      data: { userId, topic: TOPICS.has(topic) ? topic : 'other', body },
    });
    return { id: t.id, status: t.status, createdAt: t.createdAt };
  }

  /** Kendi taleplerim + yanıtları. */
  async mine(userId: string) {
    const rows = await this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((t) => ({
      id: t.id,
      topic: t.topic,
      body: t.body,
      status: t.status,
      reply: t.reply,
      repliedAt: t.repliedAt,
      createdAt: t.createdAt,
    }));
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  async list(status?: string) {
    const rows = await this.prisma.supportTicket.findMany({
      where: status ? { status } : {},
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      take: 300,
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.userId))] } },
      select: { id: true, name: true },
    });
    const adByUser = new Map(users.map((u) => [u.id, u.name]));
    return rows.map((t) => ({
      id: t.id,
      userId: t.userId,
      userName: adByUser.get(t.userId) ?? '—',
      topic: t.topic,
      body: t.body,
      status: t.status,
      reply: t.reply,
      repliedAt: t.repliedAt,
      createdAt: t.createdAt,
    }));
  }

  async reply(id: string, reply: string, adminId?: string) {
    const metin = (reply ?? '').trim().slice(0, 4000);
    if (!metin) throw new BadRequestException({ code: 'EMPTY', message: 'Yanıt boş olamaz' });
    const t = await this.prisma.supportTicket.update({
      where: { id },
      data: { reply: metin, status: 'answered', repliedAt: new Date() },
    });
    // Yanıt yazıldı ama kullanıcı haberdar olmazsa yanıt YOK demektir.
    void this.push
      .sendToUser(t.userId, {
        title: 'Destek yanıtladı',
        body: 'Talebine yanıt geldi.',
        data: { route: '/profile/help' },
      })
      .catch(() => undefined);
    await this.prisma.auditLog
      .create({
        data: {
          actorId: adminId ?? null,
          actorRole: 'admin',
          action: 'support.reply',
          resourceType: 'support',
          resourceId: id,
          // Talebin ya da yanıtın METNİ kayda GİRMEZ: kullanıcı burada en
          // hassas şeyini anlatmış olabilir (taciz, sağlık, para).
          safeDiff: { topic: t.topic },
        },
      })
      .catch(() => undefined);
    return { id: t.id, status: t.status };
  }

  async close(id: string) {
    const t = await this.prisma.supportTicket.update({
      where: { id },
      data: { status: 'closed' },
    });
    return { id: t.id, status: t.status };
  }
}
