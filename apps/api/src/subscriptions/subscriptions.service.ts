import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
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

  // ── Mobil (HER ROL) ─────────────────────────────────────────────────
  // §11 — üyelik talebi oluştur: pending. App-dışı ödeme sonrası dekont yüklenir, admin onaylar.
  //
  // Başlık eskiden "uzman/salon" diyordu ama rol kapısı hiç olmadı ve MÜŞTERİ de
  // buradan geçiyor: müşteri Premium'u Boni + cut-out foto için alıyor. Onay
  // yolu da role bakmıyor (admin.service → membershipTier).
  async create(userId: string, tier: 'premium' | 'platinum') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) this.notFound();
    return this.prisma.subscription.create({
      data: { userId, userName: user!.name, tier, amount: PRICE[tier] ?? 0, status: 'pending' },
    });
  }

  async uploadReceipt(userId: string, id: string, receiptUriRaw: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub || sub.userId !== userId) this.notFound();
    /*
     * AYNI DEKONT İKİNCİ KEZ KULLANILAMAZ.
     *
     * Randevu depozitosunda bu koruma vardı, üyelikte yoktu: kullanıcı geçen
     * ayın Kaspi dekontunu her ay yeniden yükleyebiliyor, yönetici geçerli
     * görünen bir dekont gördüğü için onaylıyordu. Hash ham içerikten
     * üretiliyor — depolamaya yüklemeden ÖNCE, yoksa her yükleme farklı bir
     * adres üretip aynı görseli farklı sanardık.
     */
    const hash = createHash('sha256').update(receiptUriRaw).digest('hex');
    const kullanilmis = await this.prisma.subscription.findFirst({
      where: { id: { not: id }, receiptHash: hash },
      select: { id: true },
    });
    if (kullanilmis) {
      throw new BadRequestException({
        code: 'RECEIPT_REUSED',
        message: 'Bu dekont başka bir üyelik için kullanılmış',
      });
    }
    const receiptUri = (await this.storage.put(receiptUriRaw, 'receipts')) ?? receiptUriRaw;
    return this.prisma.subscription.update({
      where: { id },
      data: { receiptUri, receiptHash: hash, receiptAt: new Date() },
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
    /*
     * ZATEN İŞLENMİŞ TALEP YENİDEN ONAYLANAMAZ.
     *
     * Durum kapısı hiç yoktu: aktif ya da süresi dolmuş bir talebi yeniden
     * onaylamak, ödeme alınmadan 30 gün daha üyelik yazıyordu. Yönetici
     * panelinde yavaş bağlantıda çift tıklamak yetiyordu.
     *
     * `rejected` bilerek serbest: yanlışlıkla reddedilen dekont düzeltilebilsin.
     */
    if (sub!.status === 'active' || sub!.status === 'expired') {
      throw new BadRequestException({
        code: 'ALREADY_REVIEWED',
        message: 'Bu üyelik talebi zaten işlendi',
      });
    }
    const now = new Date();
    const kullanici = await this.prisma.user.findUnique({
      where: { id: sub!.userId },
      select: { membershipTier: true, membershipUntil: true },
    });
    /*
     * YENİLEMEDE ÖDENEN SÜRE KAYBOLMUYOR.
     *
     * Bitiş `now + ay` diye SABİT yazılıyordu: süresi dolmadan yenileyen —
     * yani tam olarak iyi müşteri — kalan günlerini kaybediyordu. İki ay
     * ödeyip bir ay alıyordu.
     *
     * Aynı katmanda yenileme mevcut bitişin ÜSTÜNE ekleniyor. Katman
     * değişiyorsa (premium → platinum) yeni ürün bugün başlıyor: farklı bir
     * paketin günlerini taşımak iki fiyatı birbirine karıştırırdı.
     */
    const ayniKatman = kullanici?.membershipTier === sub!.tier;
    const mevcutBitis = kullanici?.membershipUntil ?? null;
    const baslangic =
      ayniKatman && mevcutBitis && mevcutBitis.getTime() > now.getTime() ? mevcutBitis : now;
    const end = new Date(baslangic.getTime() + months * 30 * DAY_MS);
    const [updated] = await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { id },
        data: { status: 'active', periodStart: now, periodEnd: end, reviewedAt: now },
      }),
      /*
       * ÖNCEKİ AKTİF SATIRLAR KAPATILIYOR.
       *
       * Kapatılmasaydı eski satır `status: 'active'` ve GEÇMİŞ `periodEnd` ile
       * kalırdı; `expireDue` onu bulup kullanıcıyı `free`ye düşürürdü — yani
       * yenileyen müşteri, yeni ayının ortasında üyeliğini kaybederdi.
       */
      this.prisma.subscription.updateMany({
        where: { userId: sub!.userId, status: 'active', id: { not: id } },
        data: { status: 'replaced' },
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
    void this.push.sendTemplate(
      sub!.userId,
      'membership.upgraded',
      // Katman adı ÜRÜN ADI: üç dilde de "Premium"/"Platinum" yazılıyor.
      { katman: sub!.tier === 'platinum' ? 'Platinum' : 'Premium' },
      { route },
    );
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
    void this.push.sendTemplate(sub!.userId, 'membership.receipt_rejected', undefined, {
      route: '/seller/premium',
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
      /*
       * BAŞKA GEÇERLİ ÜYELİK VARSA KULLANICI DÜŞÜRÜLMÜYOR.
       *
       * Satırı `expired` yapmak her hâlükârda doğru; ama kullanıcıyı `free`ye
       * düşürmek yalnız onu KAPSAYAN başka bir üyelik yoksa doğru. Yoksa
       * yenileme yapmış müşteri, eski satırı dolduğu gün üyeliğini kaybederdi.
       */
      const digerAktif = await this.prisma.subscription.findFirst({
        where: { userId: s.userId, status: 'active', id: { not: s.id }, periodEnd: { gte: now } },
        select: { id: true },
      });
      await this.prisma.$transaction([
        this.prisma.subscription.update({ where: { id: s.id }, data: { status: 'expired' } }),
        ...(digerAktif
          ? []
          : [
              this.prisma.user.update({
                where: { id: s.userId },
                data: { membershipTier: 'free', membershipUntil: null, isPremium: false },
              }),
            ]),
      ]);
      count++;
    }
    return { expired: count };
  }
}
