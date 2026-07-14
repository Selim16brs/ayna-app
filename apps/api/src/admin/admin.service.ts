import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../common/crypto';
import { computeBookingStats } from '../bookings/bookings.service';

// Onayda otomatik keşif listesi için varsayılan görsel (işletme foto yüklemediyse)
const DEFAULT_PRO_IMAGE =
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=70';

// Platform komisyon oranı (yüzde) — app sahibi her online randevudan bu oranı kazanır (MD: %15)
const DEFAULT_COMMISSION_RATE = 10;

interface ProInput {
  name: string;
  specialty?: string | undefined;
  sector: string;
  kind?: string | undefined;
  district?: string | undefined;
  about?: string | undefined;
  experienceYears?: number | undefined;
  priceFrom?: number | undefined;
  imageUrl?: string | undefined;
  badge?: string | undefined;
}

function mapAdminPro(p: {
  id: string;
  name: string;
  specialty: string;
  sector: string;
  kind: string;
  district: string;
  about: string;
  rating: unknown;
  reviewCount: number;
  experienceYears: number;
  priceFrom: unknown;
  imageUrl: string;
  badge: string;
}) {
  return {
    id: p.id,
    name: p.name,
    specialty: p.specialty,
    sector: p.sector,
    kind: p.kind,
    district: p.district,
    about: p.about,
    rating: Number(p.rating),
    reviewCount: p.reviewCount,
    experienceYears: p.experienceYears,
    priceFrom: Number(p.priceFrom),
    imageUrl: p.imageUrl,
    badge: p.badge,
    featured: p.badge === 'campaign',
  };
}

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
    // §12.1 — BEKLEYEN İŞLER: tüm onay kuyruklarının sayacı (dashboard kartları + nav rozetleri)
    const [kycPending, profilePending, subsPending, disputesOpen, reviewDisputes, circleQueue] =
      await Promise.all([
        this.prisma.kycVerification.count({ where: { status: 'pending' } }),
        this.prisma.profileChangeRequest.count({ where: { status: 'pending' } }),
        this.prisma.subscription.count({ where: { status: 'pending', receiptUri: { not: null } } }),
        this.prisma.dispute.count({ where: { status: 'open' } }),
        this.prisma.rating.count({ where: { disputed: true, visible: true } }),
        this.prisma.circlePost.count({ where: { status: 'pending' } }),
      ]);
    const bizByStatus = { pending: 0, approved: 0, rejected: 0 } as Record<string, number>;
    for (const g of businesses) bizByStatus[g.status] = g._count;
    const stats = computeBookingStats(
      bookings.map((b) => ({ status: b.status, price: Number(b.price) })),
    );
    return {
      users,
      professionals,
      activeCampaigns: campaigns,
      businesses: bizByStatus,
      bookings: stats,
      pending: {
        businesses: bizByStatus.pending ?? 0,
        kyc: kycPending,
        profileChanges: profilePending,
        subscriptions: subsPending,
        disputes: disputesOpen,
        reviewDisputes,
        circle: circleQueue,
      },
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
      this.prisma.user.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
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
    const bump = (
      d: Date,
      fn: (b: { users: number; bookings: number; revenue: number }) => void,
    ) => {
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
    const [rows, payoutRows] = await Promise.all([
      this.prisma.booking.findMany({
        where: { userId: { not: null } }, // app üzerinden gelen randevular
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.commissionPayout.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);

    // Tahsilat toplamı — salon anahtarına göre (kuruş cinsinden tam sayı)
    const collectedMinorBy = new Map<string, number>();
    let totalCollectedMinor = 0;
    for (const p of payoutRows) {
      const minor = Math.round(Number(p.amount) * 100);
      collectedMinorBy.set(p.proId, (collectedMinorBy.get(p.proId) ?? 0) + minor);
      totalCollectedMinor += minor;
    }

    const EARNED = ['completed'];
    const PENDING = [
      'confirmed',
      'pending',
      'awaiting_provider',
      'alternative_proposed',
      'waitlist',
    ];
    // kuruş cinsinden komisyon: round(priceMinor * rate / 100)
    const commMinor = (price: number) => Math.round(Math.round(price * 100) * rate) / 100;

    const bySalon = new Map<
      string,
      {
        proId: string;
        proName: string;
        count: number;
        gmv: number;
        earned: number;
        pending: number;
      }
    >();
    const totals = { count: rows.length, gmv: 0, earned: 0, pending: 0, voided: 0 };
    const items = rows.map((r) => {
      const price = Number(r.price);
      const commission = Math.round(commMinor(price)) / 100; // KZT (2 hane)
      const isEarned = EARNED.includes(r.status);
      const isPending = PENDING.includes(r.status);
      const key = r.proId || r.proName;
      const s = bySalon.get(key) ?? {
        proId: r.proId ?? '',
        proName: r.proName,
        count: 0,
        gmv: 0,
        earned: 0,
        pending: 0,
      };
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
    const totalCollected = totalCollectedMinor / 100;
    return {
      rate,
      currency: 'KZT',
      totals: {
        count: totals.count,
        gmv: round2(totals.gmv),
        earned: round2(totals.earned),
        pending: round2(totals.pending),
        collected: round2(totalCollected),
        // Alacak = kazanılan − tahsil edilen (negatife düşmez: fazla tahsilat 0 sayılır)
        outstanding: round2(Math.max(0, totals.earned - totalCollected)),
      },
      salons: [...bySalon.values()]
        .map((s) => {
          const collected = (collectedMinorBy.get(s.proId || s.proName) ?? 0) / 100;
          return {
            ...s,
            gmv: round2(s.gmv),
            earned: round2(s.earned),
            pending: round2(s.pending),
            collected: round2(collected),
            outstanding: round2(Math.max(0, s.earned - collected)),
          };
        })
        .sort((a, b) => b.outstanding - a.outstanding || b.earned - a.earned),
      payouts: payoutRows.slice(0, 50).map((p) => ({
        id: p.id,
        proId: p.proId,
        proName: p.proName,
        amount: Number(p.amount),
        note: p.note,
        createdAt: p.createdAt,
      })),
      items,
    };
  }

  // Komisyon tahsilatı kaydet (append-only ledger girişi)
  async addPayout(input: {
    proId: string;
    proName: string;
    amount: number;
    note?: string | undefined;
  }) {
    if (!(input.amount > 0)) {
      throw new BadRequestException({ code: 'BAD_VALUE', message: 'Tutar pozitif olmalı' });
    }
    const p = await this.prisma.commissionPayout.create({
      data: {
        proId: input.proId,
        proName: input.proName,
        amount: input.amount,
        note: input.note ?? '',
      },
    });
    return { id: p.id, proId: p.proId, amount: Number(p.amount) };
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
      docType: b.docType,
      status: b.status,
      rejectReason: b.rejectReason ?? undefined,
      reviewNote: b.reviewNote ?? undefined,
      createdAt: b.createdAt,
      // §3 — resmî doğrulama alanları (admin BİN'i görür; doğrulama için)
      entityType: b.entityType ?? undefined,
      bin: b.bin,
      legalName: b.legalName,
      managerName: b.managerName,
      oked: b.oked,
      vatPayer: b.vatPayer,
      foundedYear: b.foundedYear ?? undefined,
      womenOnly: b.womenOnly,
      socialInstagram: b.socialInstagram,
      socialTiktok: b.socialTiktok,
      socialVerifyCode: b.socialVerifyCode,
      verification: {
        identity: b.identityVerified,
        business: b.businessVerified,
        bin: b.binVerified,
        address: b.addressVerified,
        social: b.socialVerified,
      },
      specialistCount: specialists.length,
      inviteCodes: inviteCodes.map((c) => ({
        code: c.code,
        status: c.status,
        attempts: c.attempts,
      })),
    };
  }

  async setBusinessStatus(
    id: string,
    status: 'approved' | 'rejected' | 'needs_docs' | 'under_review',
    reason?: string,
  ) {
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
          city: b.city,
          district: b.district,
          about: b.about,
          // §5.1.4 — salonun haritadan seçtiği gerçek konum keşif haritasına taşınır
          ...(b.lat != null ? { lat: b.lat } : {}),
          ...(b.lng != null ? { lng: b.lng } : {}),
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
        reviewNote:
          status === 'needs_docs' || status === 'under_review' ? (reason ?? '') : b.reviewNote,
        ...(professionalId && professionalId !== b.professionalId ? { professionalId } : {}),
      },
    });
    return { id: updated.id, status: updated.status, professionalId: updated.professionalId };
  }

  // §3.3 — katmanlı doğrulama rozetlerini admin işaretler (kimlik/işletme/BİN/adres/sosyal).
  async setBusinessVerification(
    id: string,
    flags: {
      identity?: boolean | undefined;
      business?: boolean | undefined;
      bin?: boolean | undefined;
      address?: boolean | undefined;
      social?: boolean | undefined;
    },
  ) {
    const b = await this.prisma.business.findUnique({ where: { id } });
    if (!b) throw new NotFoundException({ code: 'BUSINESS_NOT_FOUND', message: 'İşletme yok' });
    const updated = await this.prisma.business.update({
      where: { id },
      data: {
        ...(flags.identity != null ? { identityVerified: flags.identity } : {}),
        ...(flags.business != null ? { businessVerified: flags.business } : {}),
        ...(flags.bin != null ? { binVerified: flags.bin } : {}),
        ...(flags.address != null ? { addressVerified: flags.address } : {}),
        ...(flags.social != null ? { socialVerified: flags.social } : {}),
      },
    });
    return {
      id: updated.id,
      verification: {
        identity: updated.identityVerified,
        business: updated.businessVerified,
        bin: updated.binVerified,
        address: updated.addressVerified,
        social: updated.socialVerified,
      },
    };
  }

  // §uzman onboarding — admin uzman doğrulama kuyruğu (bağımsız uzmanlar)
  async specialists() {
    const rows = await this.prisma.specialist.findMany({
      where: { kind: 'independent' },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    const userIds = rows.map((s) => s.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, city: true, kycStatus: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return rows.map((s) => {
      const u = byId.get(s.userId);
      const identity = u?.kycStatus === 'approved';
      return {
        id: s.id,
        name: u?.name ?? '',
        city: u?.city ?? '',
        entityType: s.entityType,
        hasIin: /^\d{12}$/.test(s.iin),
        kycStatus: u?.kycStatus ?? 'none',
        verification: {
          identity,
          cert: s.certVerified,
          social: s.socialVerified,
        },
        aynaVerified: identity && (s.certVerified || s.socialVerified),
        createdAt: s.createdAt,
      };
    });
  }

  async specialistDetail(id: string) {
    const s = await this.prisma.specialist.findUnique({ where: { id } });
    if (!s) throw new NotFoundException({ code: 'SPECIALIST_NOT_FOUND', message: 'Uzman yok' });
    const u = await this.prisma.user.findUnique({
      where: { id: s.userId },
      select: { name: true, city: true, kycStatus: true, kycVerifiedAt: true },
    });
    const identity = u?.kycStatus === 'approved';
    return {
      id: s.id,
      name: u?.name ?? '',
      city: u?.city ?? '',
      bio: s.bio,
      entityType: s.entityType,
      iin: s.iin, // admin resmî kaydı görür (public'te açık değil)
      certificates: s.certificates,
      kycStatus: u?.kycStatus ?? 'none',
      kycVerifiedAt: u?.kycVerifiedAt ?? null,
      socialInstagram: s.socialInstagram,
      socialVerifyCode: s.socialVerifyCode,
      verification: {
        identity,
        cert: s.certVerified,
        social: s.socialVerified,
      },
      aynaVerified: identity && (s.certVerified || s.socialVerified),
    };
  }

  async setSpecialistVerification(
    id: string,
    flags: { cert?: boolean | undefined; social?: boolean | undefined },
  ) {
    const s = await this.prisma.specialist.findUnique({ where: { id } });
    if (!s) throw new NotFoundException({ code: 'SPECIALIST_NOT_FOUND', message: 'Uzman yok' });
    const updated = await this.prisma.specialist.update({
      where: { id },
      data: {
        ...(flags.cert != null ? { certVerified: flags.cert } : {}),
        ...(flags.social != null ? { socialVerified: flags.social } : {}),
      },
    });
    return {
      id: updated.id,
      verification: { cert: updated.certVerified, social: updated.socialVerified },
    };
  }

  // §uzman onboarding — test/spam uzman kaydını tamamen kaldır: katalog (Professional) +
  // Specialist + kullanıcıyı soft-delete. Zero-demo temizliği + spam yönetimi için.
  async removeSpecialist(id: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { id } });
    if (!sp) throw new NotFoundException({ code: 'SPECIALIST_NOT_FOUND', message: 'Uzman yok' });
    // Katalog karşılığını (varsa) kaldır — böylece keşifte görünmez.
    if (sp.proId) {
      await this.prisma.professional.delete({ where: { id: sp.proId } }).catch(() => undefined);
    }
    await this.prisma.specialist.delete({ where: { id } }).catch(() => undefined);
    // Kullanıcıyı soft-delete (FK güvenli): giriş kapanır, PII kalır ama pasif.
    await this.prisma.user
      .update({ where: { id: sp.userId }, data: { status: 'deleted' } })
      .catch(() => undefined);
    return { ok: true };
  }

  // Kullanıcılar (temel liste; PII/telefon gösterilmez)
  async users() {
    const rows = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 300,
      select: {
        id: true,
        name: true,
        email: true,
        city: true,
        role: true,
        status: true,
        gender: true,
        phoneVerified: true,
        isPremium: true,
        membershipTier: true,
        membershipUntil: true,
        createdAt: true,
      },
    });
    return rows;
  }

  async setUserRole(id: string, role: 'user' | 'professional' | 'salon' | 'moderator' | 'admin') {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Kullanıcı yok' });
    const updated = await this.prisma.user.update({ where: { id }, data: { role } });
    return { id: updated.id, role: updated.role };
  }

  async setUserStatus(id: string, status: 'active' | 'suspended' | 'deleted') {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Kullanıcı yok' });
    if (u.role === 'admin' && status !== 'active') {
      throw new BadRequestException({
        code: 'CANNOT_SUSPEND_ADMIN',
        message: 'Admin askıya alınamaz',
      });
    }
    // Aktife dönerse kısıt bayrağı da temizlenir
    const updated = await this.prisma.user.update({
      where: { id },
      data: status === 'active' ? { status, restrictedAt: null, restrictReason: null } : { status },
    });
    return { id: updated.id, status: updated.status };
  }

  // §12.3 Ceza takip — 7 gün sayaçlı kısıtlı mod
  private static RESTRICT_WINDOW_DAYS = 7;

  async restrictUser(id: string, reason: string) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Kullanıcı yok' });
    if (u.role === 'admin') {
      throw new BadRequestException({
        code: 'CANNOT_RESTRICT_ADMIN',
        message: 'Admin kısıtlanamaz',
      });
    }
    const updated = await this.prisma.user.update({
      where: { id },
      // İlk kısıtsa sayaç şimdi başlar; zaten kısıtlıysa süre korunur (yalnız gerekçe güncellenir)
      data: {
        restrictedAt: u.restrictedAt ?? new Date(),
        restrictReason: reason || u.restrictReason,
      },
    });
    return { id: updated.id, restrictedAt: updated.restrictedAt };
  }

  async unrestrictUser(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Kullanıcı yok' });
    const updated = await this.prisma.user.update({
      where: { id },
      data: { restrictedAt: null, restrictReason: null },
    });
    return { id: updated.id, restrictedAt: updated.restrictedAt };
  }

  // Kısıtlı hesaplar + 7 gün sayacı (geçen/kalan gün; süre dolan kalıcı engel adayı)
  async penalties() {
    const rows = await this.prisma.user.findMany({
      where: { restrictedAt: { not: null } },
      orderBy: { restrictedAt: 'asc' },
      select: {
        id: true,
        name: true,
        role: true,
        city: true,
        status: true,
        restrictedAt: true,
        restrictReason: true,
      },
    });
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const window = AdminService.RESTRICT_WINDOW_DAYS;
    return rows.map((r) => {
      const elapsed = r.restrictedAt ? Math.floor((now - r.restrictedAt.getTime()) / dayMs) : 0;
      const remaining = Math.max(0, window - elapsed);
      return {
        id: r.id,
        name: r.name,
        role: r.role,
        city: r.city,
        status: r.status,
        restrictedAt: r.restrictedAt,
        restrictReason: r.restrictReason ?? '',
        daysElapsed: elapsed,
        daysRemaining: remaining,
        // Süre doldu → kalıcı engel adayı
        banEligible: remaining === 0,
      };
    });
  }

  // §7.2 — itiraz kuyruğu: uzman/işletmenin itiraz ettiği yorumlar (görünür kalır, admin karar verir)
  async disputedReviews() {
    const rows = await this.prisma.rating.findMany({
      where: { disputed: true },
      orderBy: { disputedAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      score: r.score,
      comment: r.comment,
      authorLabel: r.authorLabel,
      reply: r.reply,
      disputeReason: r.disputeReason ?? '',
      disputedAt: r.disputedAt,
      visible: r.visible,
    }));
  }

  // §7.2 — admin kararı: 'keep' (itirazı kapat, yorum kalır) | 'remove' (yalnız kural ihlalinde gizle)
  async resolveDispute(id: string, action: 'keep' | 'remove') {
    const r = await this.prisma.rating.findUnique({ where: { id } }).catch(() => null);
    if (!r) throw new NotFoundException({ code: 'RATING_NOT_FOUND', message: 'Yorum yok' });
    const updated = await this.prisma.rating.update({
      where: { id },
      data: {
        disputed: false,
        disputedAt: null,
        // "Beğenmedim" tarzı dürüst negatif yorum SİLİNMEZ; yalnız kural ihlalinde gizlenir
        ...(action === 'remove' ? { visible: false } : {}),
      },
    });
    return { id: updated.id, visible: updated.visible, action };
  }

  async setUserPremium(id: string, isPremium: boolean) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Kullanıcı yok' });
    const updated = await this.prisma.user.update({ where: { id }, data: { isPremium } });
    return { id: updated.id, isPremium: updated.isPremium };
  }

  // §11 — admin manuel üyelik katmanı atar (free | premium | platinum). Abonelik onayı
  // dışında elle düzeltme için. Platinum/premium → +30 gün; free → sıfırla.
  async setUserTier(id: string, tier: 'free' | 'premium' | 'platinum') {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Kullanıcı yok' });
    const until = tier === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { membershipTier: tier, membershipUntil: until, isPremium: tier !== 'free' },
    });
    return {
      id: updated.id,
      membershipTier: updated.membershipTier,
      membershipUntil: updated.membershipUntil,
    };
  }

  // §12.2 — admin herhangi bir üyenin parolasını sıfırlar (hash'lenerek saklanır).
  async setUserPassword(id: string, password: string) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Kullanıcı yok' });
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: hashPassword(password) },
    });
    return { id, ok: true };
  }

  // Randevular — platform geneli (admin görünürlüğü)
  async bookings(filter?: string) {
    const rows = await this.prisma.booking.findMany({ orderBy: { createdAt: 'desc' }, take: 300 });
    const mapped = rows.map((b) => ({
      id: b.id,
      service: b.service,
      proName: b.proName,
      customerName: b.customerName ?? b.uzmanName ?? '',
      dateLabel: b.dateLabel,
      price: Number(b.price),
      status: b.status,
      source: b.source,
      online: b.userId != null, // app üzerinden mi (komisyonlu)
      createdAt: b.createdAt,
    }));
    return filter && filter !== 'all' ? mapped.filter((b) => b.status === filter) : mapped;
  }

  // Teklif talepleri (§ çekirdek akış: foto teklif / talep) + gelen teklifler
  async quoteRequests() {
    const rows = await this.prisma.quoteRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { category: true, quotes: true },
    });
    // §12.4 — talep sahibi adları (canlı akışta kim açtı görünür)
    const userIds = [...new Set(rows.map((r) => r.userId).filter((x): x is string => !!x))];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : [];
    const names = new Map(users.map((u) => [u.id, u.name]));
    return rows.map((q) => ({
      id: q.id,
      category: q.category?.nameTr ?? '—',
      userName: q.userId ? (names.get(q.userId) ?? '—') : '—',
      city: q.city,
      mode: q.mode,
      budget: q.budget != null ? Number(q.budget) : null,
      note: q.note ?? '',
      hasPhoto: !!q.photoUrl,
      status: q.status,
      expiresAt: q.expiresAt,
      bookingId: q.bookingId,
      quoteCount: q.quotes.length,
      bestPrice: q.quotes.length ? Math.min(...q.quotes.map((x) => Number(x.price))) : null,
      createdAt: q.createdAt,
    }));
  }

  // Sadakat (puan defteri) — bakiye/borç ledger'dan türetilir (finans kuralı)
  async loyalty() {
    const [earnAgg, spendAgg, entries] = await Promise.all([
      this.prisma.loyaltyEntry.aggregate({ _sum: { points: true }, where: { points: { gt: 0 } } }),
      this.prisma.loyaltyEntry.aggregate({ _sum: { points: true }, where: { points: { lt: 0 } } }),
      this.prisma.loyaltyEntry.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    ]);
    const earned = earnAgg._sum.points ?? 0;
    const spent = -(spendAgg._sum.points ?? 0);
    const userIds = [...new Set(entries.map((e) => e.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map(users.map((u) => [u.id, u.name]));
    return {
      totals: { earned, spent, balance: earned - spent }, // dolaşımdaki puan = platform yükümlülüğü
      entries: entries.map((e) => ({
        id: e.id,
        userName: nameById.get(e.userId) || '—',
        kind: e.kind,
        reason: e.reason,
        detail: e.detail,
        points: e.points,
        createdAt: e.createdAt,
      })),
    };
  }

  // Feature flag yönetimi
  async featureFlags() {
    return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  }

  async setFeatureFlag(key: string, enabled: boolean, description?: string | undefined) {
    return this.prisma.featureFlag.upsert({
      where: { key },
      create: { key, enabled, description: description ?? null },
      update: { enabled, ...(description !== undefined ? { description } : {}) },
    });
  }

  // Denetim kaydı (audit log) — kritik eylemler; PII yok (yalnızca hash/rol)
  async auditLogs() {
    const rows = await this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    return rows.map((a) => ({
      id: a.id,
      action: a.action,
      resourceType: a.resourceType,
      resourceId: a.resourceId ?? '',
      actorRole: a.actorRole ?? '',
      requestId: a.requestId ?? '',
      createdAt: a.createdAt,
    }));
  }

  // Kampanya / banner yönetimi
  async campaigns() {
    return this.prisma.campaign.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createCampaign(input: {
    title: string;
    subtitle?: string | undefined;
    i18n?: unknown;
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
        ...(input.i18n ? { i18n: input.i18n as object } : {}), // §14.5 — kk/ru
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
    i18n?: unknown;
    image: string;
    sortOrder?: number | undefined;
  }) {
    return this.prisma.adBanner.create({
      data: {
        proId: input.proId,
        title: input.title,
        subtitle: input.subtitle ?? '',
        ...(input.i18n ? { i18n: input.i18n as object } : {}), // §14.5 — kk/ru
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

  // Uzmanlar / işletmeler — keşif listesi (tam alanlar, düzenlenebilir)
  async professionals() {
    const rows = await this.prisma.professional.findMany({ orderBy: { rating: 'desc' } });
    return rows.map(mapAdminPro);
  }

  async createProfessional(input: ProInput) {
    const p = await this.prisma.professional.create({
      data: {
        name: input.name,
        specialty: input.specialty ?? '',
        sector: input.sector,
        kind: (input.kind ?? 'salon') as never,
        district: input.district ?? '',
        about: input.about ?? '',
        experienceYears: input.experienceYears ?? 0,
        priceFrom: input.priceFrom ?? 0,
        imageUrl: input.imageUrl ?? DEFAULT_PRO_IMAGE,
        badge: (input.badge ?? 'verified') as never,
      },
    });
    return mapAdminPro(p);
  }

  async updateProfessional(id: string, input: { [K in keyof ProInput]?: ProInput[K] | undefined }) {
    const p = await this.prisma.professional.findUnique({ where: { id } });
    if (!p) throw new NotFoundException({ code: 'PRO_NOT_FOUND', message: 'Uzman yok' });
    const updated = await this.prisma.professional.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.specialty !== undefined ? { specialty: input.specialty } : {}),
        ...(input.sector !== undefined ? { sector: input.sector } : {}),
        ...(input.kind !== undefined ? { kind: input.kind as never } : {}),
        ...(input.district !== undefined ? { district: input.district } : {}),
        ...(input.about !== undefined ? { about: input.about } : {}),
        ...(input.experienceYears !== undefined ? { experienceYears: input.experienceYears } : {}),
        ...(input.priceFrom !== undefined ? { priceFrom: input.priceFrom } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.badge !== undefined ? { badge: input.badge as never } : {}),
      },
    });
    return mapAdminPro(updated);
  }

  async deleteProfessional(id: string) {
    // İlişkili teklifler varsa önce onları temizle (FK)
    await this.prisma.quote.deleteMany({ where: { professionalId: id } });
    await this.prisma.professional.delete({ where: { id } }).catch(() => {
      throw new NotFoundException({ code: 'PRO_NOT_FOUND', message: 'Uzman yok' });
    });
    return { deleted: true };
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

  // Hizmetler (servis kategorileri) — keşif taksonomisi
  async categories() {
    const rows = await this.prisma.serviceCategory.findMany({ orderBy: { sortOrder: 'asc' } });
    return rows.map((c) => ({
      id: c.id,
      code: c.code,
      nameTr: c.nameTr,
      icon: c.icon,
      tone: c.tone,
      sortOrder: c.sortOrder,
    }));
  }

  async createCategory(input: {
    code: string;
    nameTr: string;
    icon: string;
    tone: string;
    sortOrder?: number | undefined;
  }) {
    const exists = await this.prisma.serviceCategory.findUnique({ where: { code: input.code } });
    if (exists) throw new BadRequestException({ code: 'CODE_TAKEN', message: 'Bu kod kullanımda' });
    return this.prisma.serviceCategory.create({
      data: {
        code: input.code,
        nameTr: input.nameTr,
        icon: input.icon,
        tone: input.tone,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  }

  async updateCategory(
    id: string,
    input: {
      nameTr?: string | undefined;
      icon?: string | undefined;
      tone?: string | undefined;
      sortOrder?: number | undefined;
    },
  ) {
    const c = await this.prisma.serviceCategory.findUnique({ where: { id } });
    if (!c) throw new NotFoundException({ code: 'CAT_NOT_FOUND', message: 'Kategori yok' });
    return this.prisma.serviceCategory.update({
      where: { id },
      data: {
        ...(input.nameTr !== undefined ? { nameTr: input.nameTr } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.tone !== undefined ? { tone: input.tone } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
    });
  }

  async deleteCategory(id: string) {
    await this.prisma.serviceCategory.delete({ where: { id } }).catch(() => {
      throw new NotFoundException({ code: 'CAT_NOT_FOUND', message: 'Kategori yok' });
    });
    return { deleted: true };
  }

  // Piyasa fiyatları (kategori × şehir taban fiyatı — teklif tabanı)
  async marketPrices() {
    const rows = await this.prisma.marketPrice.findMany({
      orderBy: [{ category: 'asc' }, { city: 'asc' }],
    });
    return rows.map((m) => ({
      id: m.id,
      category: m.category,
      city: m.city,
      basePrice: Number(m.basePrice),
    }));
  }

  async setMarketPrice(input: { category: string; city?: string | undefined; basePrice: number }) {
    const city = input.city ?? '';
    const row = await this.prisma.marketPrice.upsert({
      where: { category_city: { category: input.category, city } },
      create: { category: input.category, city, basePrice: input.basePrice },
      update: { basePrice: input.basePrice },
    });
    return { id: row.id, category: row.category, city: row.city, basePrice: Number(row.basePrice) };
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
