import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PushService } from '../push/push.service';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  DAY_MS,
  commissionFromMinor,
  fromMinor,
  overdueDaysBetween,
  toMinor,
} from './commissions.calc';
import type { ClosePeriodInput } from './commissions.dto';
import { aynaFundedDiscount, rewardSubsidyCredit } from './reward-subsidy';

const DEFAULT_COMMISSION_RATE = 10; // komisyon %10 (uzman/salon → AYNA); parametrik (admin panel)

// K5 — GECİKME PENCERESİ. Eskiden vade + 7 GÜN sabitti; Gelir şartnamesi §0.1.3
// eski 7 günlük kısıtlı modu yürürlükten kaldırıyor ve 45. dakikada otomatik
// askıya alma istiyor. Kurucu kararı: hemen 45 dakikaya geçilsin.
//
// Süre CONFIG: şartname §22 bu maddenin uzman sözleşmesinde açık kabul
// gerektirdiğini söylüyor. Sözleşme gerekçesiyle pencereyi geçici olarak
// uzatmak gerekirse kod değişikliği gerekmesin diye admin ayarından okunuyor.
const GRACE_SETTING_KEY = 'rate.commission_grace_minutes';
const ENFORCE_FROM_KEY = 'policy.overdue_enforce_from';
const DEFAULT_GRACE_MINUTES = 45;
// §8.4 — AYNA'nın karşıladığı indirim net komisyonun en fazla bu oranı kadar olur.
const DEFAULT_SUBSIDY_CAP_PCT = 50;
// K3 — işlem başına faturada vade. Dönem faturasında vade dönem SONUNA göreydi;
// işlem başına faturada tamamlanma anına göre. K5 gecikme penceresi (45 dk) bu
// vadenin üstüne biner, o yüzden süre kod değişikliği gerektirmeden ayarlanabilir.
const DUE_DAYS_SETTING_KEY = 'rate.commission_due_days';
const DEFAULT_DUE_DAYS = 7;
// NOT: OVERDUE_RESTRICT_DAYS (vade + 7 gün) K5 ile kaldırıldı — süre artık
// GRACE_SETTING_KEY'den okunuyor (varsayılan 45 dakika).

@Injectable()
export class CommissionsService {
  private readonly log = new Logger(CommissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly push: PushService,
  ) {}

  private async rate(): Promise<number> {
    const s = await this.prisma.setting.findUnique({ where: { key: 'commission.rate' } });
    return s?.intValue ?? DEFAULT_COMMISSION_RATE;
  }

  // Gecikme kısıtlamasının YÜRÜRLÜK ANI. İlk çağrıda bir kez yazılır ve bir daha
  // değişmez; bundan önce vadesi dolmuş faturalar kısıtlama üretmez.
  //
  // Admin panelden bu değeri geriye çekerek eski borçları da kapsama alabilir —
  // ama bu bilinçli bir karar olmalı, dağıtımın yan etkisi değil.
  private async enforceFrom(now: Date): Promise<Date> {
    const row = await this.prisma.setting.findUnique({ where: { key: ENFORCE_FROM_KEY } });
    if (row?.strValue) {
      const d = new Date(row.strValue);
      if (!Number.isNaN(d.getTime())) return d;
    }
    await this.prisma.setting.upsert({
      where: { key: ENFORCE_FROM_KEY },
      create: { key: ENFORCE_FROM_KEY, strValue: now.toISOString() },
      update: {},
    });
    this.log.warn(
      `gecikme kısıtlaması yürürlüğe girdi: ${now.toISOString()} — bundan önce vadesi dolmuş faturalar kapsam dışı`,
    );
    return now;
  }

  // K5 — vade sonrası tanınan süre (dakika). 0 ise vade dolar dolmaz kısıtlanır.
  private async graceMinutes(): Promise<number> {
    const s = await this.prisma.setting.findUnique({ where: { key: GRACE_SETTING_KEY } });
    const v = s?.intValue;
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : DEFAULT_GRACE_MINUTES;
  }

  /**
   * §8.4 — sübvansiyon tavanı: AYNA'nın karşıladığı indirim, net komisyonun bu
   * oranını aşamaz. Sabit yazılmaz; admin config'den yönetilir.
   */
  private async subsidyCapRate(): Promise<number> {
    const s = await this.prisma.setting.findUnique({
      where: { key: 'rate.commission_subsidy_cap_pct' },
    });
    return (s?.intValue ?? DEFAULT_SUBSIDY_CAP_PCT) / 100;
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
  private async dueDays(): Promise<number> {
    const s = await this.prisma.setting.findUnique({ where: { key: DUE_DAYS_SETTING_KEY } });
    const v = s?.intValue;
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : DEFAULT_DUE_DAYS;
  }

  /**
   * K3 — İŞLEM BAŞINA KOMİSYON FATURASI.
   *
   * Kurucu kararı (31.08.2026): komisyon aylık toplu kesilmiyor; hizmet
   * tamamlandığı anda o randevunun faturası doğuyor ve uzman ödemeye
   * yönlendiriliyor. Eskiden fatura YALNIZ admin panelinden elle `closePeriod`
   * çalıştırılınca doğuyordu, üstelik uzmana hiçbir bildirim gitmiyordu —
   * "komisyon ödeme ekranına sokacak bir şey hiç yok" şikâyetinin sebebi buydu.
   *
   * ÇİFTE TAHSİLAT YASAĞI: `bookingId` benzersiz. İki eşzamanlı tamamlanma
   * çağrısı gelse bile ikinci `create` P2002 ile düşer ve sessizce atlanır.
   *
   * Hesap `closePeriod` ile AYNI: aynı oran anlık görüntüsü, aynı puan
   * mahsubu. Ayrışırsa aynı randevu iki yoldan farklı tutar üretirdi.
   */
  async invoiceForBookings(bookingIds: string[]): Promise<number> {
    if (bookingIds.length === 0) return 0;
    const bookings = await this.prisma.booking.findMany({
      // Komisyon YALNIZ online (AYNA aracılı) randevulardan — closePeriod ile aynı kural.
      where: { id: { in: bookingIds }, status: 'completed', userId: { not: null } },
      select: { id: true, proId: true, proName: true, price: true, completedAt: true },
    });
    if (bookings.length === 0) return 0;

    const [rate, subsidyCap, gun] = await Promise.all([
      this.rate(),
      this.subsidyCapRate(),
      this.dueDays(),
    ]);
    const payments = await this.prisma.payment.findMany({
      where: {
        bookingId: { in: bookings.map((b) => b.id) },
        status: 'paid',
        pointsUsed: { gt: 0 },
      },
      select: { bookingId: true, pointsUsed: true, fundingSource: true },
    });
    const indirim = new Map<string, { pointsUsed: number; fundingSource: string }[]>();
    for (const p of payments) {
      const arr = indirim.get(p.bookingId) ?? [];
      arr.push({ pointsUsed: p.pointsUsed, fundingSource: p.fundingSource });
      indirim.set(p.bookingId, arr);
    }

    let kesilen = 0;
    for (const b of bookings) {
      if (!b.proId) continue;
      const brut = commissionFromMinor(toMinor(Number(b.price)), rate);
      if (brut <= 0) continue;
      const mahsup = rewardSubsidyCredit(
        brut,
        aynaFundedDiscount(indirim.get(b.id) ?? []),
        subsidyCap,
      );
      const komisyon = fromMinor(toMinor(brut) - toMinor(mahsup));
      const an = b.completedAt ?? new Date();
      const ownerUserId = await this.ownerByProId(b.proId);
      try {
        await this.prisma.commissionInvoice.create({
          data: {
            bookingId: b.id,
            proId: b.proId,
            proName: b.proName,
            ownerUserId,
            // Tek randevuluk fatura: "dönem" o randevunun tamamlanma anıdır.
            periodStart: an,
            periodEnd: an,
            bookingsCount: 1,
            grossRevenue: Number(b.price),
            commissionAmount: komisyon,
            rewardSubsidyAmount: mahsup,
            commissionRate: rate,
            dueDate: new Date(an.getTime() + gun * DAY_MS),
            status: 'pending',
          },
        });
      } catch (e) {
        // P2002: bu randevu ZATEN faturalanmış (benzersiz bookingId) ya da aynı
        // uzmanın başka bir randevusu aynı damgayı almış olabilir — zamanlayıcı
        // `updateMany` ile 200 randevuyu TEK `now` ile kapatıyor, dolayısıyla
        // (proId, periodStart, periodEnd) üçlüsü çakışabiliyor. İkinci durumda
        // damgayı 1 ms kaydırıp tekrar deniyoruz; fatura kaybolmamalı.
        if ((e as { code?: string }).code !== 'P2002') throw e;
        const zaten = await this.prisma.commissionInvoice.findUnique({
          where: { bookingId: b.id },
        });
        if (zaten) continue; // gerçekten mükerrer → atla (idempotent)
        let yazildi = false;
        for (let i = 1; i <= 5 && !yazildi; i++) {
          try {
            await this.prisma.commissionInvoice.create({
              data: {
                bookingId: b.id,
                proId: b.proId,
                proName: b.proName,
                ownerUserId,
                periodStart: an,
                periodEnd: new Date(an.getTime() + i),
                bookingsCount: 1,
                grossRevenue: Number(b.price),
                commissionAmount: komisyon,
                rewardSubsidyAmount: mahsup,
                commissionRate: rate,
                dueDate: new Date(an.getTime() + gun * DAY_MS),
                status: 'pending',
              },
            });
            yazildi = true;
          } catch (e2) {
            if ((e2 as { code?: string }).code !== 'P2002') throw e2;
          }
        }
        if (!yazildi) {
          this.log.error(`komisyon faturası yazılamadı: booking=${b.id}`);
          continue;
        }
      }
      kesilen += 1;
      // Uzmanı ödemeye YÖNLENDİR — eskiden fatura sessizce doğuyor, uzman
      // ancak menüden kendi bakarsa görüyordu.
      if (ownerUserId) {
        void this.push
          .sendToUser(ownerUserId, {
            title: 'Komisyon faturası oluştu',
            body: `${b.proName} · ${komisyon} ₸ — dekontunu yükle`,
            data: { route: '/seller/commissions' },
          })
          .catch(() => undefined);
      }
      void this.audit('invoice.per_booking', b.id);
    }
    return kesilen;
  }

  async closePeriod(input: ClosePeriodInput, actorId?: string) {
    const start = new Date(input.periodStart);
    const end = new Date(input.periodEnd);
    const due = input.dueDate ? new Date(input.dueDate) : new Date(end.getTime() + 7 * DAY_MS);
    const rate = await this.rate();

    // Komisyon YALNIZ online (AYNA aracılı, userId dolu) randevulardan — offline walk-in'ler hariç.
    // (admin.commissions() ile AYNI kural → panel = fatura = admin tutarlı)
    //
    // Dönem TAMAMLANMA tarihine göre. Eskiden `createdAt` kullanılıyordu ve bu bir
    // GELİR SIZINTISIYDI: haziranda oluşup ağustosta tamamlanan randevu hiçbir
    // döneme düşmüyordu — haziran kapandığında henüz tamamlanmamış, ağustosta ise
    // createdAt penceresi dışındaydı. Yani hiç faturalanmıyordu.
    const tamamlanan = await this.prisma.booking.findMany({
      where: {
        status: 'completed',
        userId: { not: null },
        completedAt: { gte: start, lt: end },
      },
      select: { id: true, proId: true, proName: true, price: true },
    });

    // K3 — ÇİFTE TAHSİLAT YASAĞI. Komisyon artık işlem başına kesiliyor; dönem
    // kapanışı hâlâ elle çalıştırılabildiği için aynı randevu İKİ KEZ
    // faturalanabilirdi. Uzmandan iki kez tahsil etmek demek — para hatası.
    // Zaten faturalanmış randevular dönem hesabının tamamen dışında tutulur
    // (yalnız tutardan düşülmez; sayıya ve brüt gelire de girmez).
    const faturali = new Set(
      (
        await this.prisma.commissionInvoice.findMany({
          where: { bookingId: { in: tamamlanan.map((b) => b.id) } },
          select: { bookingId: true },
        })
      ).flatMap((r) => (r.bookingId ? [r.bookingId] : [])),
    );
    const bookings = tamamlanan.filter((b) => !faturali.has(b.id));

    // §8.5 — Bu dönemde puanla ödenen tutarlar ve KİMİN finanse ettiği.
    // Uzman, AYNA'nın dağıttığı puanı kendi cebinden karşılamamalı.
    const payments = await this.prisma.payment.findMany({
      where: {
        bookingId: { in: bookings.map((b) => b.id) },
        status: 'paid',
        pointsUsed: { gt: 0 },
      },
      select: { bookingId: true, pointsUsed: true, fundingSource: true },
    });
    const discountByBooking = new Map<string, { pointsUsed: number; fundingSource: string }[]>();
    for (const p of payments) {
      const arr = discountByBooking.get(p.bookingId) ?? [];
      arr.push({ pointsUsed: p.pointsUsed, fundingSource: p.fundingSource });
      discountByBooking.set(p.bookingId, arr);
    }

    // pro başına topla — TİYN (tam sayı kuruş) cinsinden.
    // `Number(price)` toplamak faturayı yeniden hesaplanamaz kılıyordu: float
    // artığı yuvarlama sınırının altına düşüp komisyonu 1 tiyn aşağı çekiyordu
    // (ölçüm: 4000 dönemin 150'sinde farklı tutar). Bkz. commissions.calc.
    const byPro = new Map<
      string,
      { proName: string; count: number; grossMinor: number; aynaFundedMinor: number }
    >();
    for (const b of bookings) {
      const key = b.proId ?? b.proName;
      const g = byPro.get(key) ?? {
        proName: b.proName,
        count: 0,
        grossMinor: 0,
        aynaFundedMinor: 0,
      };
      g.count += 1;
      // Matrah TAM fiyat kalır (§7): indirim matrahı değil, faturayı düşürür.
      g.grossMinor += toMinor(Number(b.price));
      g.aynaFundedMinor += toMinor(aynaFundedDiscount(discountByBooking.get(b.id) ?? []));
      byPro.set(key, g);
    }

    const subsidyCap = await this.subsidyCapRate();
    const created: unknown[] = [];
    for (const [proId, g] of byPro) {
      const commissionGross = commissionFromMinor(g.grossMinor, rate);
      if (commissionGross <= 0) continue;
      // §8.5 — AYNA kaynaklı indirim komisyondan mahsup edilir (tavanla sınırlı).
      const subsidy = rewardSubsidyCredit(
        commissionGross,
        fromMinor(g.aynaFundedMinor),
        subsidyCap,
      );
      const commission = fromMinor(toMinor(commissionGross) - toMinor(subsidy));
      const ownerUserId = await this.ownerByProId(proId);
      // İdempotentlik artık VERİTABANI kısıtına dayanıyor: (proId, periodStart,
      // periodEnd) benzersiz. Eskiden "önce oku sonra yaz" vardı ve eşzamanlı iki
      // kapanış çağrısı çift fatura üretebiliyordu — para sisteminde iki kez
      // borçlandırma demek.
      try {
        const inv = await this.prisma.commissionInvoice.create({
          data: {
            proId,
            proName: g.proName,
            ownerUserId,
            periodStart: start,
            periodEnd: end,
            bookingsCount: g.count,
            grossRevenue: fromMinor(g.grossMinor),
            commissionAmount: commission,
            rewardSubsidyAmount: subsidy,
            // §7.1 — oran ANLIK GÖRÜNTÜSÜ. Oran sonradan değişince geçmiş
            // faturanın tutarı açıklanamaz hâle gelirdi.
            commissionRate: rate,
            dueDate: due,
            status: 'pending',
          },
        });
        created.push(inv);
      } catch (e) {
        // P2002 = bu dönem için fatura zaten var → sessizce atla (idempotent).
        if ((e as { code?: string }).code !== 'P2002') throw e;
      }
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
    //
    // GERİYE DÖNÜK KISITLAMA YOK. Gecikme taraması bugüne kadar hiçbir
    // zamanlayıcı tarafından çağrılmıyordu; üretimde aylardır ödenmemiş fatura
    // varsa, zamanlayıcı ilk kez çalıştığında o uzmanların HEPSİ tek seferde
    // kısıtlanırdı. "45 dakika" kuralı yeni faturalar için konuldu, geçmişi
    // toplu cezalandırmak için değil.
    //
    // Bu yüzden kural, YÜRÜRLÜĞE GİRDİĞİ andan sonra vadesi dolan faturalara
    // uygulanıyor. Yürürlük anı ilk çalıştırmada bir kez yazılıyor.
    const enforceFrom = await this.enforceFrom(now);
    const cutoff = new Date(now.getTime() - grace * 60_000);
    const toRestrict = await this.prisma.commissionInvoice.findMany({
      where: {
        status: 'overdue',
        restrictedApplied: false,
        ownerUserId: { not: null },
        dueDate: { lt: cutoff, gte: enforceFrom },
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
