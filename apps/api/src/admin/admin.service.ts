import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeBookingStats } from '../bookings/bookings.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // Dashboard genel bakış — platform geneli metrikler
  async overview() {
    const [users, bookings, businesses, professionals, campaigns] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.booking.findMany({ select: { status: true, price: true } }),
      this.prisma.business.groupBy({ by: ['status'], _count: true }),
      this.prisma.professional.count(),
      this.prisma.campaign.count({ where: { active: true } }),
    ]);
    const bizByStatus = { pending: 0, approved: 0, rejected: 0 } as Record<string, number>;
    for (const g of businesses) bizByStatus[g.status] = g._count;
    const stats = computeBookingStats(bookings.map((b) => ({ status: b.status, price: Number(b.price) })));
    return {
      users,
      professionals,
      activeCampaigns: campaigns,
      businesses: bizByStatus,
      bookings: stats,
    };
  }

  // Üyelik işlemleri — işletmeler (duruma göre)
  async businesses(status?: string) {
    const rows = await this.prisma.business.findMany({
      ...(status ? { where: { status: status as never } } : {}),
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((b) => ({
      id: b.id,
      name: b.name,
      ownerName: b.ownerName,
      sector: b.sector,
      city: b.city,
      district: b.district,
      phone: b.phone,
      email: b.email,
      taxId: b.taxId,
      status: b.status,
      rejectReason: b.rejectReason ?? undefined,
      createdAt: b.createdAt,
    }));
  }

  async setBusinessStatus(id: string, status: 'approved' | 'rejected', reason?: string) {
    const b = await this.prisma.business.findUnique({ where: { id } });
    if (!b) throw new NotFoundException({ code: 'BUSINESS_NOT_FOUND', message: 'İşletme yok' });
    const updated = await this.prisma.business.update({
      where: { id },
      data: { status, rejectReason: status === 'rejected' ? (reason ?? '') : null },
    });
    return { id: updated.id, status: updated.status };
  }

  // Kullanıcılar (temel liste; PII gösterilmez)
  async users() {
    const rows = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        name: true,
        email: true,
        city: true,
        role: true,
        gender: true,
        phoneVerified: true,
        isPremium: true,
        createdAt: true,
      },
    });
    return rows;
  }

  // Kampanya / banner yönetimi
  async campaigns() {
    return this.prisma.campaign.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createCampaign(input: {
    title: string;
    subtitle?: string | undefined;
    badge?: string | undefined;
    category?: string | undefined;
    image: string;
    tone?: string | undefined;
    sortOrder?: number | undefined;
  }) {
    return this.prisma.campaign.create({
      data: {
        title: input.title,
        subtitle: input.subtitle ?? '',
        badge: input.badge ?? '',
        category: input.category ?? null,
        image: input.image,
        tone: input.tone ?? 'rose',
        sortOrder: input.sortOrder ?? 0,
      },
    });
  }

  async setCampaignActive(id: string, active: boolean) {
    const c = await this.prisma.campaign.findUnique({ where: { id } });
    if (!c) throw new NotFoundException({ code: 'CAMPAIGN_NOT_FOUND', message: 'Kampanya yok' });
    return this.prisma.campaign.update({ where: { id }, data: { active } });
  }

  async deleteCampaign(id: string) {
    await this.prisma.campaign.delete({ where: { id } }).catch(() => {
      throw new NotFoundException({ code: 'CAMPAIGN_NOT_FOUND', message: 'Kampanya yok' });
    });
    return { deleted: true };
  }

  // Öne çıkan firmalar — badge üzerinden (campaign = öne çıkan)
  async professionals() {
    const rows = await this.prisma.professional.findMany({ orderBy: { rating: 'desc' } });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      sector: p.sector,
      district: p.district,
      rating: Number(p.rating),
      reviewCount: p.reviewCount,
      badge: p.badge,
      featured: p.badge === 'campaign',
    }));
  }

  async setFeatured(id: string, featured: boolean) {
    const p = await this.prisma.professional.findUnique({ where: { id } });
    if (!p) throw new NotFoundException({ code: 'PRO_NOT_FOUND', message: 'İşletme yok' });
    const updated = await this.prisma.professional.update({
      where: { id },
      data: { badge: featured ? 'campaign' : 'verified' },
    });
    return { id: updated.id, featured: updated.badge === 'campaign' };
  }

  // Puan görünürlük eşiği (moderasyon)
  async setRatingThreshold(value: number) {
    if (value < 1 || value > 50) {
      throw new BadRequestException({ code: 'BAD_VALUE', message: 'Eşik 1–50 olmalı' });
    }
    const s = await this.prisma.setting.upsert({
      where: { key: 'rating.threshold' },
      create: { key: 'rating.threshold', intValue: value },
      update: { intValue: value },
    });
    return { threshold: s.intValue };
  }
}
