import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeBookingStats } from '../bookings/bookings.service';

// Onayda otomatik keşif listesi için varsayılan görsel (işletme foto yüklemediyse)
const DEFAULT_PRO_IMAGE =
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=70';

// Platform komisyon oranı (yüzde) — app sahibi her online randevudan bu oranı kazanır
const DEFAULT_COMMISSION_RATE = 10;

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

  // Detaylı istatistik — zaman serisi (kayıt / randevu / gelir) + kategori dağılımı
  // Tüm createdAt UTC; kovalar kullanıcıya Asia/Almaty (IANA) yerel tarihiyle sunulur.
  async stats(days: number) {
    const TZ = 'Asia/Almaty';
    const span = Math.min(Math.max(days, 7), 90);
    const since = new Date(Date.now() - (span - 1) * 86400000);
    since.setUTCHours(0, 0, 0, 0);

    const [users, bookings, professionals] = await Promise.all([
      this.prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      this.prisma.booking.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, status: true, price: true },
      }),
      this.prisma.professional.findMany({ select: { sector: true } }),
    ]);

    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dayKey = (d: Date) => fmt.format(d); // YYYY-MM-DD (yerel)

    // Boş kovaları da içermek için tüm gün anahtarlarını üret
    const buckets = new Map<string, { users: number; bookings: number; revenue: number }>();
    for (let i = 0; i < span; i++) {
      const d = new Date(since.getTime() + i * 86400000);
      buckets.set(dayKey(d), { users: 0, bookings: 0, revenue: 0 });
    }
    const bump = (d: Date, fn: (b: { users: number; bookings: number; revenue: number }) => void) => {
      const b = buckets.get(dayKey(d));
      if (b) fn(b);
    };
    for (const u of users) bump(u.createdAt, (b) => (b.users += 1));
    for (const bk of bookings) {
      bump(bk.createdAt, (b) => {
        b.bookings += 1;
        if (bk.status === 'completed') b.revenue += Number(bk.price);
      });
    }

    const series = [...buckets.entries()].map(([date, v]) => ({
      date: date.slice(5), // MM-DD (grafik ekseni)
      fullDate: date,
      ...v,
    }));
    const totals = series.reduce(
      (acc, s) => ({
        users: acc.users + s.users,
        bookings: acc.bookings + s.bookings,
        revenue: acc.revenue + s.revenue,
      }),
      { users: 0, bookings: 0, revenue: 0 },
    );

    // Kategori (sektör) dağılımı — öne çıkan/uzman havuzundan
    const bySector = new Map<string, number>();
    for (const p of professionals) bySector.set(p.sector, (bySector.get(p.sector) ?? 0) + 1);
    const categories = [...bySector.entries()]
      .map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count);

    return { range: span, timezone: TZ, series, totals, categories };
  }

  // Komisyon oranı (yüzde, tam sayı) — ayar tablosundan; yoksa varsayılan %10
  private async commissionRate(): Promise<number> {
    const s = await this.prisma.setting.findUnique({ where: { key: 'commission.rate' } });
    return s?.intValue ?? DEFAULT_COMMISSION_RATE;
  }

  async setCommissionRate(value: number) {
    if (value < 0 || value > 100) {
      throw new BadRequestException({ code: 'BAD_VALUE', message: 'Oran 0–100 olmalı' });
    }
    const s = await this.prisma.setting.upsert({
      where: { key: 'commission.rate' },
      create: { key: 'commission.rate', intValue: value },
      update: { intValue: value },
    });
    return { rate: s.intValue };
  }

  // Platform komisyonu — YALNIZCA online app randevuları (userId dolu; offline salon kaydı hariç).
  // Para birimi kuruş (minor unit) tam sayı ile hesaplanır (float yok, finans kuralı).
  async commissions() {
    const rate = await this.commissionRate();
    const rows = await this.prisma.booking.findMany({
      where: { userId: { not: null } }, // app üzerinden gelen randevular
      orderBy: { createdAt: 'desc' },
    });

    const EARNED = ['completed'];
    const PENDING = ['confirmed', 'pending', 'awaiting_provider', 'alternative_proposed', 'waitlist'];
    // kuruş cinsinden komisyon: round(priceMinor * rate / 100)
    const commMinor = (price: number) => Math.round(Math.round(price * 100) * rate) / 100;

    const bySalon = new Map<
      string,
      { proId: string; proName: string; count: number; gmv: number; earned: number; pending: number }
    >();
    const totals = { count: rows.length, gmv: 0, earned: 0, pending: 0, voided: 0 };
    const items = rows.map((r) => {
      const price = Number(r.price);
      const commission = Math.round(commMinor(price)) / 100; // KZT (2 hane)
      const isEarned = EARNED.includes(r.status);
      const isPending = PENDING.includes(r.status);
      const key = r.proId || r.proName;
      const s =
        bySalon.get(key) ??
        { proId: r.proId ?? '', proName: r.proName, count: 0, gmv: 0, earned: 0, pending: 0 };
      s.count += 1;
      if (isEarned || isPending) {
        s.gmv += price;
        totals.gmv += price;
      }
      if (isEarned) {
        s.earned += commission;
        totals.earned += commission;
      } else if (isPending) {
        s.pending += commission;
        totals.pending += commission;
      } else {
        totals.voided += commission;
      }
      bySalon.set(key, s);
      return {
        id: r.id,
        proName: r.proName,
        service: r.service,
        dateLabel: r.dateLabel,
        price,
        commission,
        status: r.status,
        state: isEarned ? 'earned' : isPending ? 'pending' : 'void',
      };
    });

    const round2 = (n: number) => Math.round(n * 100) / 100;
    return {
      rate,
      currency: 'KZT',
      totals: {
        count: totals.count,
        gmv: round2(totals.gmv),
        earned: round2(totals.earned),
        pending: round2(totals.pending),
      },
      salons: [...bySalon.values()]
        .map((s) => ({ ...s, gmv: round2(s.gmv), earned: round2(s.earned), pending: round2(s.pending) }))
        .sort((a, b) => b.earned + b.pending - (a.earned + a.pending)),
      items,
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

  // İşletme detay — ekip (uzman) + davet kodları + tam bilgi
  async businessDetail(id: string) {
    const b = await this.prisma.business.findUnique({ where: { id } });
    if (!b) throw new NotFoundException({ code: 'BUSINESS_NOT_FOUND', message: 'İşletme yok' });
    const [specialists, inviteCodes] = await Promise.all([
      this.prisma.specialist.findMany({ where: { businessId: id } }),
      this.prisma.businessInviteCode.findMany({
        where: { businessId: id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return {
      id: b.id,
      name: b.name,
      ownerName: b.ownerName,
      sector: b.sector,
      about: b.about,
      city: b.city,
      district: b.district,
      address: b.address,
      phone: b.phone,
      email: b.email,
      taxId: b.taxId,
      workingHours: b.workingHours,
      categories: b.categories,
      docUrl: b.docUrl ?? undefined,
      status: b.status,
      rejectReason: b.rejectReason ?? undefined,
      createdAt: b.createdAt,
      specialistCount: specialists.length,
      inviteCodes: inviteCodes.map((c) => ({ code: c.code, status: c.status, attempts: c.attempts })),
    };
  }

  async setBusinessStatus(id: string, status: 'approved' | 'rejected', reason?: string) {
    const b = await this.prisma.business.findUnique({ where: { id } });
    if (!b) throw new NotFoundException({ code: 'BUSINESS_NOT_FOUND', message: 'İşletme yok' });

    // Onayda: keşif listesi (professional) yoksa otomatik oluştur + bağla.
    // Böylece register→onay→keşifte görün→salon kendi randevu/yorumunu görür döngüsü kapanır.
    let professionalId = b.professionalId;
    if (status === 'approved' && !professionalId) {
      const sector = b.sector || b.categories[0] || 'hair';
      const pro = await this.prisma.professional.create({
        data: {
          name: b.name,
          specialty: b.about?.slice(0, 60) || 'Güzellik & bakım',
          sector,
          kind: 'salon',
          district: b.district,
          about: b.about,
          imageUrl: b.photos[0] ?? DEFAULT_PRO_IMAGE,
          badge: 'verified',
        },
      });
      professionalId = pro.id;
    }

    const updated = await this.prisma.business.update({
      where: { id },
      data: {
        status,
        rejectReason: status === 'rejected' ? (reason ?? '') : null,
        ...(professionalId && professionalId !== b.professionalId ? { professionalId } : {}),
      },
    });
    return { id: updated.id, status: updated.status, professionalId: updated.professionalId };
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

  // Reklam banner yönetimi
  async ads() {
    return this.prisma.adBanner.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createAd(input: {
    proId: string;
    title: string;
    subtitle?: string | undefined;
    image: string;
    sortOrder?: number | undefined;
  }) {
    return this.prisma.adBanner.create({
      data: {
        proId: input.proId,
        title: input.title,
        subtitle: input.subtitle ?? '',
        image: input.image,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  }

  async setAdActive(id: string, active: boolean) {
    const a = await this.prisma.adBanner.findUnique({ where: { id } });
    if (!a) throw new NotFoundException({ code: 'AD_NOT_FOUND', message: 'Reklam yok' });
    return this.prisma.adBanner.update({ where: { id }, data: { active } });
  }

  async deleteAd(id: string) {
    await this.prisma.adBanner.delete({ where: { id } }).catch(() => {
      throw new NotFoundException({ code: 'AD_NOT_FOUND', message: 'Reklam yok' });
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

  // Moderasyon — görünür yorumlar (kötüye kullanım denetimi)
  async reviews() {
    const rows = await this.prisma.rating.findMany({
      where: { visible: true, raterRole: 'user' },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      score: r.score,
      comment: r.comment,
      serviceTag: r.serviceTag,
      authorLabel: r.authorLabel,
      reply: r.reply,
      createdAt: r.createdAt,
    }));
  }

  // Moderasyon: uygunsuz yorumu gizle (admin yetkisi; §6.D kalıcılık kullanıcı/işletme içindir)
  async hideReview(id: string) {
    const r = await this.prisma.rating.findUnique({ where: { id } });
    if (!r) throw new NotFoundException({ code: 'RATING_NOT_FOUND', message: 'Yorum yok' });
    await this.prisma.rating.update({ where: { id }, data: { visible: false } });
    return { id, hidden: true };
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
