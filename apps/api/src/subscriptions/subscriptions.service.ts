import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { StorageService } from '../storage/storage.service';

// §11 — paket fiyatları (mobil ile aynı; parametrik ileri faz)
const PRICE: Record<string, number> = { premium: 999, platinum: 1999 };
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly storage: StorageService,
  ) {}

  private notFound(): never {
    throw new NotFoundException({ code: 'NOT_FOUND', message: 'Abonelik bulunamadı' });
  }

  private async audit(action: string, resourceId: string, actorId?: string) {
    await this.prisma.auditLog.create({
      data: {
        action,
        resourceType: 'subscription',
        resourceId,
        actorId: actorId ?? null,
        actorRole: 'admin',
      },
    });
  }

  // ── Mobil (uzman/salon) ──────────────────────────────────────────────
  // §11 — üyelik talebi oluştur: pending. App-dışı ödeme sonrası dekont yüklenir, admin onaylar.
  async create(userId: string, tier: 'premium' | 'platinum') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) this.notFound();
    return this.prisma.subscription.create({
      data: { userId, userName: user!.name, tier, amount: PRICE[tier] ?? 0, status: 'pending' },
    });
  }

  async uploadReceipt(userId: string, id: string, receiptUriRaw: string) {
    const receiptUri = (await this.storage.put(receiptUriRaw, 'receipts')) ?? receiptUriRaw;
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub || sub.userId !== userId) this.notFound();
    return this.prisma.subscription.update({
      where: { id },
      data: { receiptUri, receiptAt: new Date() },
    });
  }

  // Kullanıcının güncel katmanı + son talebi (mobil bunu okur)
  async mine(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const latest = await this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return {
      tier: user?.membershipTier ?? 'free',
      until: user?.membershipUntil ?? null,
      latest,
    };
  }

  // ── Admin ────────────────────────────────────────────────────────────
  list(status?: string) {
    return this.prisma.subscription.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  // §11 — dekontu doğrula → aktive et: kullanıcının tier + bitiş tarihini set eder.
  async approve(id: string, months = 1, actorId?: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) this.notFound();
    const now = new Date();
    const end = new Date(now.getTime() + months * 30 * DAY_MS);
    const [updated] = await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { id },
        data: { status: 'active', periodStart: now, periodEnd: end, reviewedAt: now },
      }),
      this.prisma.user.update({
        where: { id: sub!.userId },
        data: { membershipTier: sub!.tier, membershipUntil: end, isPremium: true },
      }),
    ]);
    await this.audit('subscription.approve', id, actorId);
    // §11 — kullanıcıya push: üyelik yükseltildi → app tier'ı tazeleyip hakları açar
    const buyer = await this.prisma.user.findUnique({ where: { id: sub!.userId } });
    const route = buyer?.role === 'user' ? '/profile/passport' : '/seller/premium';
    void this.push.sendToUser(sub!.userId, {
      title: 'Üyeliğin yükseltildi 🎉',
      body: `${sub!.tier === 'platinum' ? 'Platinum' : 'Premium'} üyeliğin aktif — tüm ayrıcalıkların açıldı.`,
      data: { route },
    });
    return updated;
  }

  async reject(id: string, actorId?: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) this.notFound();
    const updated = await this.prisma.subscription.update({
      where: { id },
      data: { status: 'rejected', reviewedAt: new Date() },
    });
    await this.audit('subscription.reject', id, actorId);
    void this.push.sendToUser(sub!.userId, {
      title: 'Üyelik dekontu onaylanmadı',
      body: 'Dekont doğrulanamadı — kontrol edip yeniden yükleyebilirsin.',
      data: { route: '/seller/premium' },
    });
    return updated;
  }

  // §11 — süresi dolan aktif abonelikleri free'ye düşür (cron/manuel). Döndürür: düşürülen sayısı.
  async expireDue() {
    const now = new Date();
    const due = await this.prisma.subscription.findMany({
      where: { status: 'active', periodEnd: { lt: now } },
    });
    let count = 0;
    for (const s of due) {
      await this.prisma.$transaction([
        this.prisma.subscription.update({ where: { id: s.id }, data: { status: 'expired' } }),
        this.prisma.user.update({
          where: { id: s.userId },
          data: { membershipTier: 'free', membershipUntil: null, isPremium: false },
        }),
      ]);
      count++;
    }
    return { expired: count };
  }
}
