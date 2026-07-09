import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { canSendDecision, processMessage, resolvePair } from './messaging.util';

// EK Z.1 — Uygulama-içi DM mesajlaşma servisi.
// Kurallar: çift başına tek konuşma; yalnız katılımcı görür; engellenen gönderemez;
// yasaklı ifade alıcıya gösterilmez (audit'e düşer); telefon numarası maskelenir.
@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  private async userRole(id: string): Promise<{ name: string; role: string } | null> {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: { name: true, role: true },
    });
    return u ?? null;
  }

  // İki yönlü engel kontrolü
  private async isBlockedBetween(a: string, b: string): Promise<boolean> {
    const n = await this.prisma.userBlock.count({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
    });
    return n > 0;
  }

  // a, b'yi takip ediyor mu? (W2W circle takip ilişkisi)
  private async follows(a: string, b: string): Promise<boolean> {
    const n = await this.prisma.circleFollow.count({
      where: { followerId: a, targetId: b },
    });
    return n > 0;
  }

  // Kurucu izin modeli — kimin ne zaman mesaj atabileceği:
  //  • Karşılıklı takip → serbest (iki yön, sınırsız).
  //  • Kullanıcı → uzman/salon (takip karşılıklı değil): uzman yanıtlayana kadar TEK mesaj hakkı;
  //    uzman bir kez yanıtlarsa sohbet açılır ve serbest devam eder.
  //  • Uzman/salon → kullanıcı: kullanıcı henüz yazmadıysa uzman ANCAK kullanıcıyı takip ediyorsa
  //    yazabilir; aksi halde yasak (uygulama-dışı reklam/spam engeli). Kullanıcı yazdıysa uzman yanıtlar.
  private async assertCanSendBy(
    conv: { id: string; customerId: string; proUserId: string },
    senderId: string,
  ): Promise<void> {
    const other = conv.customerId === senderId ? conv.proUserId : conv.customerId;
    const [meFollowsOther, otherFollowsMe, custMsgs, proMsgs] = await Promise.all([
      this.follows(senderId, other),
      this.follows(other, senderId),
      this.prisma.message.count({ where: { conversationId: conv.id, senderId: conv.customerId } }),
      this.prisma.message.count({ where: { conversationId: conv.id, senderId: conv.proUserId } }),
    ]);
    const decision = canSendDecision({
      senderIsCustomer: senderId === conv.customerId,
      meFollowsOther,
      otherFollowsMe,
      custMsgs,
      proMsgs,
    });
    if (decision.ok) return;
    throw new ForbiddenException({
      code: decision.code,
      message:
        decision.code === 'AWAIT_REPLY'
          ? 'Uzman yanıtlayana kadar yalnızca bir mesaj gönderebilirsin'
          : 'Takip etmediğin bir kullanıcıya ilk mesajı gönderemezsin',
    });
  }

  // Sohbet başlat / getir (idempotent — çift benzersiz)
  async startConversation(
    meId: string,
    meRole: string,
    targetUserId: string,
    ctx: { bookingId?: string | undefined; requestId?: string | undefined },
  ) {
    if (targetUserId === meId)
      throw new BadRequestException({ code: 'SELF_CHAT', message: 'Kendinle sohbet açamazsın' });
    const target = await this.userRole(targetUserId);
    if (!target)
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Kullanıcı bulunamadı' });
    const pair = resolvePair(meId, meRole, targetUserId, target.role);
    if (!pair) {
      throw new BadRequestException({
        code: 'INVALID_PAIR',
        message: 'Sohbet yalnızca müşteri ile uzman/salon arasında açılabilir',
      });
    }
    if (await this.isBlockedBetween(meId, targetUserId)) {
      throw new ForbiddenException({
        code: 'BLOCKED',
        message: 'Bu kullanıcıyla mesajlaşma engellenmiş',
      });
    }
    // Uzman/salon YENİ sohbet AÇIYORSA (meId = proUserId) ve kullanıcı henüz hiç yazmamışsa:
    // yalnız kullanıcıyı takip ediyorsa açabilir (uygulama-dışı reklam/spam engeli).
    const existing = await this.prisma.conversation.findUnique({
      where: { customerId_proUserId: { customerId: pair.customerId, proUserId: pair.proUserId } },
    });
    if (!existing && meId === pair.proUserId) {
      const proFollowsUser = await this.follows(pair.proUserId, pair.customerId);
      if (!proFollowsUser) {
        throw new ForbiddenException({
          code: 'FOLLOW_REQUIRED',
          message: 'Takip etmediğin bir kullanıcıya sohbet başlatamazsın',
        });
      }
    }
    const conv = await this.prisma.conversation.upsert({
      where: { customerId_proUserId: { customerId: pair.customerId, proUserId: pair.proUserId } },
      create: {
        customerId: pair.customerId,
        proUserId: pair.proUserId,
        bookingId: ctx.bookingId ?? null,
        requestId: ctx.requestId ?? null,
      },
      update: {},
    });
    return { id: conv.id };
  }

  private async assertParticipant(meId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv || (conv.customerId !== meId && conv.proUserId !== meId)) {
      throw new NotFoundException({ code: 'CONVERSATION_NOT_FOUND', message: 'Sohbet bulunamadı' });
    }
    return conv;
  }

  async sendMessage(meId: string, conversationId: string, rawBody: string) {
    const conv = await this.assertParticipant(meId, conversationId);
    const otherId = conv.customerId === meId ? conv.proUserId : conv.customerId;
    if (await this.isBlockedBetween(meId, otherId)) {
      throw new ForbiddenException({
        code: 'BLOCKED',
        message: 'Bu kullanıcıyla mesajlaşma engellenmiş',
      });
    }
    // Kurucu izin modeli (takip/tek-mesaj/reklam engeli) — mesaj yazılmadan önce
    await this.assertCanSendBy(conv, meId);
    const { body, verdict } = processMessage(rawBody);
    if (!body) throw new BadRequestException({ code: 'EMPTY', message: 'Boş mesaj gönderilemez' });
    const moderation = verdict.flagged ? 'flagged' : 'ok';
    const msg = await this.prisma.message.create({
      data: { conversationId, senderId: meId, body, moderation },
    });
    // Yasaklı ifade → alıcıya gösterilmez + moderasyon kuyruğu (audit)
    if (verdict.flagged) {
      await this.prisma.auditLog.create({
        data: {
          action: 'message.flagged',
          resourceType: 'message',
          resourceId: msg.id,
          actorId: meId,
          actorRole: 'user',
        },
      });
    } else {
      // Yalnız temiz mesaj thread'i öne taşır (gizli içerik alıcının listesini kirletmesin)
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: msg.createdAt },
      });
      // EK Z.5 — alıcıya uzaktan push (DEEP-LINK: doğrudan sohbete). Fire-and-forget.
      const sender = await this.prisma.user.findUnique({
        where: { id: meId },
        select: { name: true },
      });
      void this.push.sendToUser(otherId, {
        title: sender?.name || 'Yeni mesaj',
        body: body.length > 80 ? `${body.slice(0, 80)}…` : body,
        data: { route: `/messages/${conversationId}` },
      });
    }
    return { id: msg.id, moderation, body: msg.body, createdAt: msg.createdAt };
  }

  // Mesajları getir — alıcı flagged mesajları GÖRMEZ; gönderen kendi mesajını görür.
  // Gelen (karşı taraftan, temiz) okunmamış mesajlar okundu işaretlenir.
  async messages(meId: string, conversationId: string) {
    await this.assertParticipant(meId, conversationId);
    const rows = await this.prisma.message.findMany({
      where: {
        conversationId,
        OR: [{ senderId: meId }, { moderation: 'ok' }],
      },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: meId }, moderation: 'ok', readAt: null },
      data: { readAt: new Date() },
    });
    return rows.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      mine: m.senderId === meId,
      body: m.body,
      // gönderen kendi engellenen mesajını bu bayrakla görür (UI "gizlendi" gösterir)
      hidden: m.moderation === 'flagged',
      readAt: m.readAt,
      createdAt: m.createdAt,
    }));
  }

  // Konuşma listesi — karşı taraf adı + son görünür mesaj + okunmamış sayısı
  async conversations(meId: string) {
    const rows = await this.prisma.conversation.findMany({
      where: { OR: [{ customerId: meId }, { proUserId: meId }] },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
    const otherIds = rows.map((c) => (c.customerId === meId ? c.proUserId : c.customerId));
    const users = otherIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: otherIds } },
          select: { id: true, name: true },
        })
      : [];
    const nameOf = new Map(users.map((u) => [u.id, u.name]));
    const out = [];
    for (const c of rows) {
      const otherId = c.customerId === meId ? c.proUserId : c.customerId;
      const last = await this.prisma.message.findFirst({
        where: { conversationId: c.id, OR: [{ senderId: meId }, { moderation: 'ok' }] },
        orderBy: { createdAt: 'desc' },
      });
      const unread = await this.prisma.message.count({
        where: { conversationId: c.id, senderId: { not: meId }, moderation: 'ok', readAt: null },
      });
      out.push({
        id: c.id,
        otherId,
        otherName: nameOf.get(otherId) ?? '',
        lastBody: last?.body ?? '',
        lastAt: last?.createdAt ?? c.createdAt,
        unread,
      });
    }
    return out;
  }

  // Kullanıcı engelle (idempotent) — mevcut sohbette mesajlaşmayı keser
  async block(meId: string, targetUserId: string) {
    if (targetUserId === meId)
      throw new BadRequestException({ code: 'SELF_BLOCK', message: 'Kendini engelleyemezsin' });
    await this.prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: meId, blockedId: targetUserId } },
      create: { blockerId: meId, blockedId: targetUserId },
      update: {},
    });
    return { ok: true };
  }

  async unblock(meId: string, targetUserId: string) {
    await this.prisma.userBlock.deleteMany({ where: { blockerId: meId, blockedId: targetUserId } });
    return { ok: true };
  }

  async blockedList(meId: string) {
    const rows = await this.prisma.userBlock.findMany({ where: { blockerId: meId } });
    const ids = rows.map((r) => r.blockedId);
    const users = ids.length
      ? await this.prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true },
        })
      : [];
    const nameOf = new Map(users.map((u) => [u.id, u.name]));
    return rows.map((r) => ({
      id: r.blockedId,
      name: nameOf.get(r.blockedId) ?? '',
      since: r.createdAt,
    }));
  }
}
