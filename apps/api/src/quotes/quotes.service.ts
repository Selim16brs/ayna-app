import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import type { CreateQuoteRequestInput, SelectQuoteInput, SubmitQuoteInput } from './quotes.dto';

// §5.2 Faz A — reverse marketplace ÇEKİRDEK akışı buluttan:
// talep aç → aynı şehirdeki uzmanlara push → uzman teklif verir → sahibine push →
// kullanıcı seçer → randevu (deposit_pending) + kapanış pushları.
// Yanıt şekilleri mobil DemandRequest/DemandOffer ile birebir hizalı (ms sayıları).

type QuoteRow = {
  id: string;
  requestId: string | null;
  professionalId: string | null;
  userId: string | null;
  price: unknown;
  discountPercent: number;
  discountReason: string;
  etaMin: number;
  note: string | null;
  slotsJson: string;
  createdAt: Date;
  professional: {
    id: string;
    name: string;
    imageUrl: string;
    rating: unknown;
    reviewCount: number;
  } | null;
};

// §9.3 — yaklaşık mesafe (deterministik; gerçek adres asla kullanılmaz — privacy)
function estKm(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return 1 + (Math.abs(h) % 9);
}

function almatyLabel(ms: number): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Asia/Almaty',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  private mapOffer(q: QuoteRow, expertNames: Map<string, string>) {
    const pro = q.professional;
    let slots: number[] = [];
    try {
      const parsed: unknown = JSON.parse(q.slotsJson);
      if (Array.isArray(parsed)) slots = parsed.filter((x): x is number => typeof x === 'number');
    } catch {
      slots = [];
    }
    return {
      id: q.id,
      proId: pro?.id ?? q.userId ?? q.id,
      proName: pro?.name ?? (q.userId ? (expertNames.get(q.userId) ?? 'Uzman') : 'Uzman'),
      proImage: pro?.imageUrl ?? '',
      rating: pro ? Number(pro.rating) : 0,
      reviewCount: pro?.reviewCount ?? 0,
      distanceKm: estKm(q.id),
      price: Number(q.price),
      // §A2 — ⚡Fırsat rozeti (indirim >0 ise müşteri kartında görünür)
      discountPercent: q.discountPercent,
      discountReason: q.discountReason,
      etaMin: q.etaMin,
      ...(q.note ? { note: q.note } : {}),
      slots,
      // Seçim → randevu bağlamak için (mobil bunu backend'e geri yollar)
      expertUserId: q.userId,
    };
  }

  private mapRequest(
    r: {
      id: string;
      mode: string;
      city: string;
      note: string | null;
      photoUrl: string | null;
      budget: unknown;
      collectMin: number;
      serviceId: string | null;
      createdAt: Date;
      expiresAt: Date | null;
      status: string;
      bookingId: string | null;
      selectedQuoteId: string | null;
      category: { code: string };
    },
    quotes: QuoteRow[],
    expertNames: Map<string, string>,
  ) {
    const expiresMs = r.expiresAt?.getTime() ?? r.createdAt.getTime() + r.collectMin * 60_000;
    const status =
      r.status === 'closed' && r.bookingId
        ? 'booked'
        : expiresMs < Date.now() && r.status === 'open'
          ? 'expired'
          : r.status === 'closed'
            ? 'expired'
            : 'collecting';
    return {
      id: r.id,
      mode: r.mode as 'photo' | 'describe',
      category: r.category.code,
      city: r.city,
      ...(r.note ? { note: r.note } : {}),
      ...(r.photoUrl ? { photoUrl: r.photoUrl } : {}),
      ...(r.budget != null ? { budget: Number(r.budget) } : {}),
      collectMin: r.collectMin,
      ...(r.serviceId ? { serviceId: r.serviceId } : {}),
      preferredSlots: ((): number[] => {
        try {
          const v: unknown = JSON.parse(
            (r as { preferredSlotsJson?: string }).preferredSlotsJson ?? '[]',
          );
          return Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : [];
        } catch {
          return [];
        }
      })(),
      createdAt: r.createdAt.getTime(),
      expiresAt: expiresMs,
      status,
      offers: quotes.map((q) => this.mapOffer(q, expertNames)),
      ...(r.selectedQuoteId ? { bookedOfferId: r.selectedQuoteId } : {}),
      ...(r.bookingId ? { bookingId: r.bookingId } : {}),
    };
  }

  private async expertNamesFor(quotes: QuoteRow[]): Promise<Map<string, string>> {
    const ids = [...new Set(quotes.map((q) => q.userId).filter((x): x is string => !!x))];
    if (ids.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    return new Map(users.map((u) => [u.id, u.name]));
  }

  // ── Talep aç (müşteri) ────────────────────────────────────────────────
  async create(userId: string, input: CreateQuoteRequestInput) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'NO_USER', message: 'Kullanıcı yok' });
    const category = await this.prisma.serviceCategory.findUnique({
      where: { code: input.category },
    });
    if (!category)
      throw new BadRequestException({ code: 'BAD_CATEGORY', message: 'Kategori bulunamadı' });

    const now = Date.now();
    const row = await this.prisma.quoteRequest.create({
      data: {
        userId,
        categoryId: category.id,
        mode: input.mode,
        city: user.city ?? '',
        note: input.note ?? null,
        photoUrl: input.photoDataUrl ?? null,
        budget: input.budget ?? null,
        collectMin: input.collectMin,
        expiresAt: new Date(now + input.collectMin * 60_000),
        serviceId: input.serviceId ?? null,
        preferredSlotsJson: JSON.stringify(input.preferredSlots ?? []),
      },
      include: { category: { select: { code: true } } },
    });

    // §5.2 — bildirim hedeflemesi: aynı şehirdeki uzman/salon hesaplarına push (fire-and-forget).
    void this.notifyCityExperts(user.city ?? '', userId, row.id, category.code);

    return this.mapRequest({ ...row, selectedQuoteId: null }, [], new Map());
  }

  private async notifyCityExperts(
    city: string,
    ownerId: string,
    requestId: string,
    categoryCode: string,
  ) {
    try {
      const experts = await this.prisma.user.findMany({
        where: {
          role: { in: ['professional', 'salon'] },
          id: { not: ownerId },
          ...(city ? { city } : {}),
        },
        select: { id: true },
      });
      await Promise.all(
        experts.map((e) =>
          this.push.sendToUser(e.id, {
            title: 'Yeni talep var ✨',
            body: `Şehrinde yeni bir ${categoryCode} talebi açıldı — teklifini gönder.`,
            data: { route: '/seller/requests', requestId },
          }),
        ),
      );
    } catch {
      // bildirim akışı talebi asla bozmaz
    }
  }

  // ── Açık talepler (uzman/salon havuzu — §9.3 şehir filtresi) ──────────
  async openForExpert(expertUserId: string) {
    const me = await this.prisma.user.findUnique({ where: { id: expertUserId } });
    if (!me) throw new NotFoundException({ code: 'NO_USER', message: 'Kullanıcı yok' });
    // §B5 (ayna2) — uzmanın SESSİZCE engellediği müşterilerin talepleri havuza düşmez
    // (platform banından bağımsız kişisel tercih; UserBlock DM engeliyle ortak tablo)
    const blocked = await this.prisma.userBlock.findMany({
      where: { blockerId: expertUserId },
      select: { blockedId: true },
    });
    const blockedIds = blocked.map((b) => b.blockedId);
    const rows = await this.prisma.quoteRequest.findMany({
      where: {
        status: 'open',
        expiresAt: { gt: new Date() },
        userId: { not: expertUserId, ...(blockedIds.length ? { notIn: blockedIds } : {}) },
        ...(me.city ? { city: me.city } : {}),
      },
      orderBy: { expiresAt: 'asc' },
      take: 100,
      include: {
        category: { select: { code: true } },
        quotes: {
          include: {
            professional: {
              select: { id: true, name: true, imageUrl: true, rating: true, reviewCount: true },
            },
          },
        },
      },
    });
    const allQuotes = rows.flatMap((r) => r.quotes as unknown as QuoteRow[]);
    const names = await this.expertNamesFor(allQuotes);
    // Uzman havuz görünümü: talep sahibi kimliği YOK (privacy); kendi teklifi işaretli.
    return rows.map((r) => ({
      ...this.mapRequest(r, r.quotes as unknown as QuoteRow[], names),
      myQuoteId: r.quotes.find((q) => q.userId === expertUserId)?.id ?? null,
    }));
  }

  // ── Taleplerim (müşteri) ──────────────────────────────────────────────
  async mine(userId: string) {
    const rows = await this.prisma.quoteRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        category: { select: { code: true } },
        quotes: {
          orderBy: { createdAt: 'asc' },
          include: {
            professional: {
              select: { id: true, name: true, imageUrl: true, rating: true, reviewCount: true },
            },
          },
        },
      },
    });
    const allQuotes = rows.flatMap((r) => r.quotes as unknown as QuoteRow[]);
    const names = await this.expertNamesFor(allQuotes);
    return rows.map((r) => this.mapRequest(r, r.quotes as unknown as QuoteRow[], names));
  }

  // ── Teklif ver (uzman/salon) ──────────────────────────────────────────
  async submit(requestId: string, expertUserId: string, input: SubmitQuoteInput) {
    const req = await this.prisma.quoteRequest.findUnique({
      where: { id: requestId },
      include: { category: { select: { code: true } } },
    });
    if (!req) throw new NotFoundException({ code: 'NO_REQUEST', message: 'Talep bulunamadı' });
    const expired = (req.expiresAt?.getTime() ?? 0) < Date.now();
    if (req.status !== 'open' || expired)
      throw new BadRequestException({ code: 'REQUEST_CLOSED', message: 'Talep kapandı' });
    if (req.userId === expertUserId)
      throw new BadRequestException({
        code: 'OWN_REQUEST',
        message: 'Kendi talebine teklif veremezsin',
      });

    // Uzmanın keşif kataloğu bağı (bağımsız uzmanda dolu) — profil/puan gösterimi için
    const specialist = await this.prisma.specialist.findUnique({
      where: { userId: expertUserId },
    });
    const proId = specialist?.proId ?? null;

    const quote = await this.prisma.quote.upsert({
      where: { requestId_userId: { requestId, userId: expertUserId } },
      create: {
        requestId,
        userId: expertUserId,
        professionalId: proId,
        price: input.price,
        discountPercent: input.discountPercent,
        discountReason: input.discountReason ?? '',
        etaMin: input.etaMin,
        note: input.note ?? null,
        slotsJson: JSON.stringify(input.slots),
      },
      update: {
        price: input.price,
        discountPercent: input.discountPercent,
        discountReason: input.discountReason ?? '',
        etaMin: input.etaMin,
        note: input.note ?? null,
        slotsJson: JSON.stringify(input.slots),
      },
    });

    // Talep sahibine push — doğrudan gelen teklifler sayfasına (deep-link kuralı)
    if (req.userId) {
      void this.push.sendToUser(req.userId, {
        title: 'Yeni teklifin var 💌',
        body: 'Talebine bir uzman teklif gönderdi. Teklifleri incele.',
        data: { route: `/quote/results?id=${requestId}` },
      });
    }
    return { id: quote.id, ok: true };
  }

  // ── Teklifi seç → randevu (müşteri) ───────────────────────────────────
  async select(requestId: string, ownerId: string, input: SelectQuoteInput) {
    const req = await this.prisma.quoteRequest.findUnique({
      where: { id: requestId },
      include: {
        category: { select: { code: true } },
        quotes: {
          include: {
            professional: {
              select: { id: true, name: true, imageUrl: true, rating: true, reviewCount: true },
            },
          },
        },
      },
    });
    if (!req) throw new NotFoundException({ code: 'NO_REQUEST', message: 'Talep bulunamadı' });
    if (req.userId !== ownerId)
      throw new ForbiddenException({ code: 'NOT_OWNER', message: 'Bu talep sana ait değil' });
    if (req.status !== 'open')
      throw new BadRequestException({ code: 'ALREADY_CLOSED', message: 'Talep zaten kapandı' });
    const quote = req.quotes.find((q) => q.id === input.quoteId);
    if (!quote) throw new NotFoundException({ code: 'NO_QUOTE', message: 'Teklif bulunamadı' });

    const names = await this.expertNamesFor([quote as unknown as QuoteRow]);
    const offer = this.mapOffer(quote as unknown as QuoteRow, names);

    // §4.3 — teklif zaten uzmanın kabulü → randevu doğrudan DEPOZİTO adımına doğar.
    const depositRow = await this.prisma.setting.findUnique({ where: { key: 'rate.deposit_kzt' } });
    const deposit = depositRow?.intValue || 1000;
    const bookingId = `bk_q_${randomUUID().slice(0, 8)}`;
    const inDays = Math.max(0, Math.round((input.slotMs - Date.now()) / 86_400_000));
    await this.prisma.booking.create({
      data: {
        id: bookingId,
        userId: ownerId,
        source: req.mode === 'photo' ? 'photo_quote' : 'demand',
        service: `${req.category.code} (teklif)`,
        proId: offer.proId,
        proName: offer.proName,
        proImage: offer.proImage,
        dateLabel: almatyLabel(input.slotMs),
        inDays,
        startAt: new Date(input.slotMs),
        durationMin: quote.etaMin,
        price: Number(quote.price),
        status: 'deposit_pending',
        depositAmount: deposit,
      },
    });
    await this.prisma.quoteRequest.update({
      where: { id: requestId },
      data: { status: 'closed', bookingId, selectedQuoteId: quote.id },
    });

    // Kazanan uzmana push — takvimine düştü
    if (quote.userId) {
      void this.push.sendToUser(quote.userId, {
        title: 'Teklifin seçildi 🎉',
        body: `${almatyLabel(input.slotMs)} için randevu oluştu. Takvimini kontrol et.`,
        data: { route: '/seller/agenda' },
      });
    }
    // §5.2 — seçilmeyen uzmanlara nazik kapanış
    for (const q of req.quotes) {
      if (q.id !== quote.id && q.userId) {
        void this.push.sendToUser(q.userId, {
          title: 'Talep kapandı',
          body: 'Bu talepte başka bir teklif seçildi — ilgin için teşekkürler 💛',
          data: { route: '/seller/requests' },
        });
      }
    }
    return { bookingId, ok: true };
  }
}
