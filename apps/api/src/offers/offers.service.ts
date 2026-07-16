import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Offer } from '@prisma/client';
import { localizeRows } from '../common/i18n';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { CreateOfferInput } from './offers.dto';
import {
  ACTIVE_LIMIT_EXPERT,
  ACTIVE_LIMIT_SALON,
  checkOffer,
  FAKE_DISCOUNT_WINDOW_DAYS,
} from './offers.rules';

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  // Sahibin keşif kartı + tür + şehir: uzman → Specialist.proId; salon → Business.professionalId
  private async ownerContext(userId: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    if (sp?.proId) {
      const pro = await this.prisma.professional.findUnique({ where: { id: sp.proId } });
      return { ownerType: 'expert' as const, proId: sp.proId, city: pro?.city ?? '' };
    }
    const biz = await this.prisma.business.findFirst({
      where: { ownerUserId: userId, status: 'approved' },
    });
    if (biz?.professionalId) {
      return { ownerType: 'salon' as const, proId: biz.professionalId, city: biz.city };
    }
    throw new ForbiddenException({
      code: 'NO_PROVIDER_PROFILE',
      message: 'Kampanya için onaylı uzman/salon profili gerekli',
    });
  }

  // §2.5.1 — sahte indirim referansı: son 60 gün aynı sektör teklif fiyat ortalaması;
  // teklif yoksa hizmet listesindeki fiyatların ortalaması; hiç veri yoksa null (kontrol atlanır).
  private async avgRecentPrice(userId: string, proId: string, sector: string) {
    const since = new Date(Date.now() - FAKE_DISCOUNT_WINDOW_DAYS * 24 * 3600 * 1000);
    const quotes = await this.prisma.quote.findMany({
      where: { userId, createdAt: { gt: since } },
      select: { price: true },
      take: 200,
    });
    if (quotes.length >= 3) {
      return quotes.reduce((s, q) => s + Number(q.price), 0) / quotes.length;
    }
    const pro = await this.prisma.professional.findUnique({ where: { id: proId } });
    try {
      const services = JSON.parse(pro?.servicesJson ?? '[]') as { price?: number; cat?: string }[];
      const prices = services
        .filter((s) => typeof s.price === 'number' && s.price > 0)
        .map((s) => s.price as number);
      void sector;
      if (prices.length > 0) return prices.reduce((a, b) => a + b, 0) / prices.length;
    } catch {
      /* yoksay */
    }
    return null;
  }

  async create(userId: string, input: CreateOfferInput) {
    // Ceza penceresindeki hesap kampanya açamaz (§2.5.5)
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.restrictedAt) {
      throw new ForbiddenException({
        code: 'RESTRICTED',
        message: 'Kısıtlı moddayken kampanya oluşturulamaz',
      });
    }
    const ctx = await this.ownerContext(userId);

    // Aktif kampanya limiti: uzman 1, salon 3 (§2.2)
    const activeCount = await this.prisma.offer.count({
      where: { ownerUserId: userId, status: 'active', endsAt: { gt: new Date() } },
    });
    const limit = ctx.ownerType === 'salon' ? ACTIVE_LIMIT_SALON : ACTIVE_LIMIT_EXPERT;
    if (activeCount >= limit) {
      throw new BadRequestException({
        code: 'ACTIVE_LIMIT',
        message: `Aynı anda en fazla ${limit} aktif kampanya olabilir`,
      });
    }

    // Aynı sektör + örtüşen tarih aralığında mükerrer kampanya engeli (§2.5.4)
    const overlap = await this.prisma.offer.findFirst({
      where: {
        ownerUserId: userId,
        sector: input.sector,
        status: { in: ['active', 'paused'] },
        startsAt: { lt: new Date(input.endsAtMs) },
        endsAt: { gt: new Date(input.startsAtMs) },
      },
    });
    if (overlap) {
      throw new BadRequestException({
        code: 'OVERLAPPING_OFFER',
        message: 'Aynı kategoride örtüşen tarihli kampanyan zaten var',
      });
    }

    // Kural motoru (indirim aralığı, süre, dış yönlendirme, sahte indirim)
    const i18nTexts = [
      input.i18n?.kk?.title,
      input.i18n?.kk?.description,
      input.i18n?.ru?.title,
      input.i18n?.ru?.description,
    ].filter((x): x is string => !!x);
    const check = checkOffer({
      discountType: input.discountType,
      discountValue: input.discountValue,
      basePrice: input.basePrice,
      startsAtMs: input.startsAtMs,
      endsAtMs: input.endsAtMs,
      texts: [input.title, input.description, ...i18nTexts],
      avgRecentPrice: await this.avgRecentPrice(userId, ctx.proId, input.sector),
    });
    if (!check.ok) throw new BadRequestException({ code: check.code, message: check.message });

    // Görsel: R2 varsa objeye taşınır (mevcut storage deseni)
    const imageUrl = input.imageDataUrl
      ? ((await this.storage.put(input.imageDataUrl, 'offers')) ?? '')
      : '';

    const row = await this.prisma.offer.create({
      data: {
        ownerType: ctx.ownerType,
        ownerUserId: userId,
        proId: ctx.proId,
        status: 'active',
        title: input.title,
        description: input.description,
        ...(input.i18n ? { i18n: input.i18n } : {}),
        sector: input.sector,
        discountType: input.discountType,
        discountValue: input.discountValue,
        basePrice: input.basePrice,
        finalPrice: check.finalPrice,
        validDays: input.validDays,
        timeFrom: input.timeFrom,
        timeTo: input.timeTo,
        startsAt: new Date(input.startsAtMs),
        endsAt: new Date(input.endsAtMs),
        slotQuota: input.slotQuota ?? null,
        imageUrl,
        city: ctx.city,
      },
    });
    await this.audit.record({
      action: 'offer.created',
      resourceType: 'offer',
      resourceId: row.id,
      actorId: userId,
    });
    return mapOffer(row, true);
  }

  // Public keşif listesi: aktif + süresi geçmemiş + kotası dolmamış
  async listPublic(locale?: string, city?: string) {
    const rows = await this.prisma.offer.findMany({
      where: {
        status: 'active',
        startsAt: { lte: new Date() },
        endsAt: { gt: new Date() },
        ...(city ? { city } : {}),
      },
      orderBy: { endsAt: 'asc' },
      take: 100,
    });
    const open = rows.filter((r) => r.slotQuota == null || r.usedCount < r.slotQuota);
    // Sahibi silinmiş/askıdaki hesabın kampanyası keşifte görünmez (katalog filtresiyle tutarlı)
    const ownerIds = [...new Set(open.map((r) => r.ownerUserId))];
    const owners = ownerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, status: true },
        })
      : [];
    const hidden = new Set(owners.filter((u) => u.status !== 'active').map((u) => u.id));
    const visible = open.filter((r) => !hidden.has(r.ownerUserId));
    return localizeRows(visible, locale, ['title', 'description']).map((r) => mapOffer(r, false));
  }

  async listMine(userId: string) {
    const rows = await this.prisma.offer.findMany({
      where: { ownerUserId: userId, status: { not: 'removed' } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => mapOffer(r, true));
  }

  async setStatus(userId: string, id: string, status: 'paused' | 'active' | 'removed') {
    const o = await this.prisma.offer.findUnique({ where: { id } });
    if (!o || o.ownerUserId !== userId) {
      throw new NotFoundException({ code: 'OFFER_NOT_FOUND', message: 'Kampanya bulunamadı' });
    }
    const row = await this.prisma.offer.update({ where: { id }, data: { status } });
    await this.audit.record({
      action: `offer.${status}`,
      resourceType: 'offer',
      resourceId: id,
      actorId: userId,
    });
    return mapOffer(row, true);
  }

  // §2.5.5 — ceza alan hesabın tüm aktif kampanyaları duraklatılır (admin restrict hook'u çağırır)
  async pauseAllFor(userId: string) {
    await this.prisma.offer.updateMany({
      where: { ownerUserId: userId, status: 'active' },
      data: { status: 'paused' },
    });
  }

  // Randevu tarafı yardımcıları (BookingsService kullanır)
  async findActive(id: string) {
    const o = await this.prisma.offer.findUnique({ where: { id } });
    if (!o || o.status !== 'active') return null;
    if (o.endsAt.getTime() < Date.now()) return null;
    if (o.slotQuota != null && o.usedCount >= o.slotQuota) return null;
    return o;
  }

  async incrementUsed(id: string) {
    await this.prisma.offer.update({ where: { id }, data: { usedCount: { increment: 1 } } });
  }

  // İptal/no-show → kota iadesi (§2.4)
  async refundQuota(id: string) {
    await this.prisma.offer.updateMany({
      where: { id, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
  }

  // Admin gözetimi
  async adminList() {
    const rows = await this.prisma.offer.findMany({
      where: { status: { not: 'removed' } },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    return rows.map((r) => mapOffer(r, true));
  }

  async adminRemove(id: string) {
    const row = await this.prisma.offer.update({ where: { id }, data: { status: 'removed' } });
    await this.audit.record({
      action: 'offer.admin_removed',
      resourceType: 'offer',
      resourceId: id,
    });
    return mapOffer(row, true);
  }
}

function mapOffer(o: Offer, owner: boolean) {
  return {
    id: o.id,
    ownerType: o.ownerType,
    proId: o.proId,
    status: o.status,
    title: o.title,
    description: o.description,
    sector: o.sector,
    discountType: o.discountType,
    discountValue: Number(o.discountValue),
    basePrice: Number(o.basePrice),
    finalPrice: Number(o.finalPrice),
    validDays: o.validDays,
    timeFrom: o.timeFrom,
    timeTo: o.timeTo,
    startsAt: o.startsAt,
    endsAt: o.endsAt,
    // bitişe <48 saat → "son fırsat" göstergesi (§2.6)
    lastChance: o.endsAt.getTime() - Date.now() < 48 * 3600 * 1000,
    slotQuota: o.slotQuota,
    imageUrl: o.imageUrl,
    city: o.city,
    ...(owner ? { usedCount: o.usedCount } : {}),
  };
}
