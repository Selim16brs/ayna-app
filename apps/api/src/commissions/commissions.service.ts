import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { DAY_MS, commissionFor, overdueDaysBetween } from './commissions.calc';
import type { ClosePeriodInput } from './commissions.dto';

const DEFAULT_COMMISSION_RATE = 10; // komisyon %10 (uzman/salon → AYNA); parametrik (admin panel)

// K5 — GECİKME PENCERESİ. Eskiden vade + 7 GÜN sabitti; Gelir şartnamesi §0.1.3
// eski 7 günlük kısıtlı modu yürürlükten kaldırıyor ve 45. dakikada otomatik
// askıya alma istiyor. Kurucu kararı: hemen 45 dakikaya geçilsin.
//
// Süre CONFIG: şartname §22 bu maddenin uzman sözleşmesinde açık kabul
// gerektirdiğini söylüyor. Sözleşme gerekçesiyle pencereyi geçici olarak
// uzatmak gerekirse kod değişikliği gerekmesin diye admin ayarından okunuyor.
const GRACE_SETTING_KEY = 'rate.commission_grace_minutes';
const DEFAULT_GRACE_MINUTES = 45;

@Injectable()
export class CommissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private async rate(): Promise<number> {
    const s = await this.prisma.setting.findUnique({ where: { key: 'commission.rate' } });
    return s?.intValue ?? DEFAULT_COMMISSION_RATE;
  }

  // K5 — vade sonrası tanınan süre (dakika). 0 ise vade dolar dolmaz kısıtlanır.
  private async graceMinutes(): Promise<number> {
    const s = await this.prisma.setting.findUnique({ where: { key: GRACE_SETTING_KEY } });
    const v = s?.intValue;
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : DEFAULT_GRACE_MINUTES;
  }

  // Aktör yoksa eylem ZAMANLAYICIDAN gelmiştir. Rolü 'admin' yazmak denetim
  // izini yanıltırdı: kimsenin yapmadığı bir işlem admin'e atfedilirdi.
  private async audit(action: string, resourceId: string, actorId?: string) {
    await this.prisma.auditLog.create({
      data: {
        action,
        resourceType: 'commission',
        resourceId,
        actorId: actorId ?? null,
        actorRole: actorId ? 'admin' : 'system',
      },
    });
  }

  // proId → salon sahibi hesabı (bildirim + kısıt için)
  private async ownerByProId(proId: string): Promise<string | null> {
    if (!proId) return null;
    const b = await this.prisma.business.findFirst({
      where: { professionalId: proId },
      select: { ownerUserId: true },
    });
    return b?.ownerUserId ?? null;
  }

  // ── §12.8 Dönem kapanışı — tamamlanan randevulardan pro başına fatura ────
  async closePeriod(input: ClosePeriodInput, actorId?: string) {
    const start = new Date(input.periodStart);
    const end = new Date(input.periodEnd);
    const due = input.dueDate ? new Date(input.dueDate) : new Date(end.getTime() + 7 * DAY_MS);
    const rate = await this.rate();

    // Komisyon YALNIZ online (AYNA aracılı, userId dolu) randevulardan — offline walk-in'ler hariç.
    // (admin.commissions() ile AYNI kural → panel = fatura = admin tutarlı)
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: 'completed',
        userId: { not: null },
        createdAt: { gte: start, lt: end },
      },
      select: { proId: true, proName: true, price: true },
    });

    // pro başına topla
    const byPro = new Map<string, { proName: string; count: number; gross: number }>();
    for (const b of bookings) {
      const key = b.proId ?? b.proName;
      const g = byPro.get(key) ?? { proName: b.proName, count: 0, gross: 0 };
      g.count += 1;
      g.gross += Number(b.price);
      byPro.set(key, g);
    }

    const created: unknown[] = [];
    for (const [proId, g] of byPro) {
      const commission = commissionFor(g.gross, rate);
      if (commission <= 0) continue;
      // İdempotent — aynı pro+dönem için fatura varsa atla
      const existing = await this.prisma.commissionInvoice.findFirst({
        where: { proId, periodStart: start, periodEnd: end },
      });
      if (existing) continue;
      const ownerUserId = await this.ownerByProId(proId);
      const inv = await this.prisma.commissionInvoice.create({
        data: {
          proId,
          proName: g.proName,
          ownerUserId,
          periodStart: start,
          periodEnd: end,
          bookingsCount: g.count,
          grossRevenue: g.gross,
          commissionAmount: commission,
          dueDate: due,
          status: 'pending',
        },
      });
      created.push(inv);
    }
    await this.audit('period.close', `${input.periodStart}_${input.periodEnd}`, actorId);
    return { created: created.length, dueDate: due, rate };
  }

  private map(inv: {
    id: string;
    proId: string;
    proName: string;
    ownerUserId: string | null;
    periodStart: Date;
    periodEnd: Date;
    bookingsCount: number;
    grossRevenue: unknown;
    commissionAmount: unknown;
    dueDate: Date;
    status: string;
    receiptUri: string | null;
    receiptAt: Date | null;
    collectedAt: Date | null;
    createdAt: Date;
  }) {
    const overdueDays =
      inv.status !== 'collected' ? overdueDaysBetween(inv.dueDate, new Date()) : 0;
    return {
      id: inv.id,
      proId: inv.proId,
      proName: inv.proName,
      periodStart: inv.periodStart,
      periodEnd: inv.periodEnd,
      bookingsCount: inv.bookingsCount,
      grossRevenue: Number(inv.grossRevenue),
      commissionAmount: Number(inv.commissionAmount),
      dueDate: inv.dueDate,
      status: inv.status,
      receiptUri: inv.receiptUri,
      receiptAt: inv.receiptAt,
      collectedAt: inv.collectedAt,
      overdueDays,
      currency: 'KZT',
    };
  }

  // ── Admin ───────────────────────────────────────────────────────────────
  async invoices() {
    const rows = await this.prisma.commissionInvoice.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((r) => this.map(r));
  }

  async collect(id: string, actorId?: string) {
    const inv = await this.prisma.commissionInvoice.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException({ code: 'INVOICE_NOT_FOUND', message: 'Fatura yok' });
    if (inv.status === 'collected') return this.map(inv);

    const updated = await this.prisma.commissionInvoice.update({
      where: { id },
      data: { status: 'collected', collectedAt: new Date() },
    });
    // Mevcut tahsilat defterine yaz (komisyon özet tutarları tutarlı kalsın)
    await this.prisma.commissionPayout.create({
      data: {
        proId: inv.proId,
        proName: inv.proName,
        amount: inv.commissionAmount,
        note: `Fatura tahsil edildi (${inv.periodStart.toISOString().slice(0, 10)})`,
      },
    });
    // Bu fatura yüzünden kısıtlıysa ve başka gecikmiş faturası kalmadıysa hesabı aç
    if (inv.ownerUserId && inv.restrictedApplied) {
      const remaining = await this.prisma.commissionInvoice.count({
        where: {
          ownerUserId: inv.ownerUserId,
          status: { not: 'collected' },
          restrictedApplied: true,
          id: { not: id },
        },
      });
      if (remaining === 0) {
        await this.prisma.user.update({
          where: { id: inv.ownerUserId },
          data: { restrictedAt: null, restrictReason: null },
        });
      }
    }
    await this.audit('invoice.collect', id, actorId);
    return this.map(updated);
  }

  // K5 — gecikme taraması: vade geçenleri overdue işaretle; tanınan süre
  // dolunca owner'ı kısıtla. Zamanlayıcıdan da admin panelinden de çağrılır.
  async runOverdue(actorId?: string) {
    const now = new Date();
    const grace = await this.graceMinutes();
    // 1) vade geçmiş pending → overdue
    const toOverdue = await this.prisma.commissionInvoice.updateMany({
      where: { status: 'pending', dueDate: { lt: now } },
      data: { status: 'overdue' },
    });
    // 2) vade + tanınan süre geçmiş, kısıt uygulanmamış, owner'lı faturalar → kısıtla
    const cutoff = new Date(now.getTime() - grace * 60_000);
    const toRestrict = await this.prisma.commissionInvoice.findMany({
      where: {
        status: 'overdue',
        restrictedApplied: false,
        ownerUserId: { not: null },
        dueDate: { lt: cutoff },
      },
    });
    let restricted = 0;
    for (const inv of toRestrict) {
      if (!inv.ownerUserId) continue;
      const u = await this.prisma.user.findUnique({ where: { id: inv.ownerUserId } });
      if (u && u.role !== 'admin') {
        await this.prisma.user.update({
          where: { id: inv.ownerUserId },
          data: {
            restrictedAt: u.restrictedAt ?? now,
            restrictReason: u.restrictReason ?? 'Komisyon ödemesi gecikti',
          },
        });
        restricted += 1;
      }
      await this.prisma.commissionInvoice.update({
        where: { id: inv.id },
        data: { restrictedApplied: true },
      });
    }
    // Zamanlayıcı bu işi 5 dakikada bir çağırıyor. Her turda audit yazmak,
    // hiçbir şey olmasa bile günde ~288 anlamsız kayıt demekti — denetim izi
    // gürültüye boğulur ve gerçek olaylar kaybolurdu. Yalnız BİR ŞEY OLDUĞUNDA
    // yaz; admin elle çalıştırdığında sonuç boş olsa da kaydı kalsın.
    if (actorId || toOverdue.count > 0 || restricted > 0) {
      await this.audit('overdue.run', `overdue:${toOverdue.count}_restrict:${restricted}`, actorId);
    }
    return { markedOverdue: toOverdue.count, restricted };
  }

  // ── Pro (salon/uzman) tarafı ──────────────────────────────────────────
  async myInvoices(userId: string) {
    const rows = await this.prisma.commissionInvoice.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.map(r));
  }

  async uploadReceipt(userId: string, id: string, receiptUriRaw: string) {
    const receiptUri = (await this.storage.put(receiptUriRaw, 'receipts')) ?? receiptUriRaw;
    const inv = await this.prisma.commissionInvoice.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException({ code: 'INVOICE_NOT_FOUND', message: 'Fatura yok' });
    if (inv.ownerUserId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Bu fatura sana ait değil' });
    }
    const updated = await this.prisma.commissionInvoice.update({
      where: { id },
      data: { receiptUri, receiptAt: new Date() },
    });
    return this.map(updated);
  }
}
