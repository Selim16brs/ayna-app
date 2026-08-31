import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PushService } from '../push/push.service';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { commissionFromMinor, fromMinor, overdueDaysBetween, toMinor } from './commissions.calc';
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
// Son uyarı penceresi: vade dolduktan sonra tanınan EK süre. Bu süre de
// biterse hesap askıya alınır.
const DEFAULT_GRACE_MINUTES = 15;
// §8.4 — AYNA'nın karşıladığı indirim net komisyonun en fazla bu oranı kadar olur.
const DEFAULT_SUBSIDY_CAP_PCT = 50;
// Askıya alınan hesabın yeniden açılması için ödenecek tutar = borç × bu kat.
// Kurucu kuralı: "ödemediği komisyon bedelini X2 olacak şekilde ödeme yapmalı".
const REACTIVATION_MULTIPLIER = 2;

/** Askıdaki hesabın yeniden açılması için ödemesi gereken tutar. */
export function reactivationAmount(unpaidCommission: number): number {
  return Math.max(0, Math.round(unpaidCommission * REACTIVATION_MULTIPLIER * 100) / 100);
}
// K3 — işlem başına faturada vade. Dönem faturasında vade dönem SONUNA göreydi;
// işlem başına faturada tamamlanma anına göre. K5 gecikme penceresi (45 dk) bu
// vadenin üstüne biner, o yüzden süre kod değişikliği gerektirmeden ayarlanabilir.
// TAHSİLAT KURALI (kurucu, 31.08.2026) — tek kural, başka komisyon yolu yok:
//
//   1. Uzman parayı müşteriden alır.
//   2. 45 DAKİKA içinde açılan ekrandan AYNA komisyonunu öder.
//   3. 45. dakikada SON UYARI: 15 dakikan kaldı, ödemezsen hesabın askıya alınır.
//   4. Toplam 60 dakika dolduğunda hesap ASKIYA ALINIR.
//   5. Yeniden açmak için ödenmeyen komisyonun İKİ KATI ödenir — ve bu
//      kullanıcıya ÖNCEDEN bildirilir (askıya alınmadan önce, uyarı metninde).
//
// K3'ü (işlem başına fatura) yazarken vadeyi 7 GÜN yapmıştım; eski aylık dönem
// modeline bakarak seçtim ve E5'i kontrol etmedim. Dakikalarla ölçülen bir
// kuralı güne çevirmek onu tümden işlevsiz bırakıyordu.
const DUE_MINUTES_SETTING_KEY = 'rate.commission_due_minutes';
const DEFAULT_DUE_MINUTES = 45;
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
  private async dueMinutes(): Promise<number> {
    const s = await this.prisma.setting.findUnique({ where: { key: DUE_MINUTES_SETTING_KEY } });
    const v = s?.intValue;
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : DEFAULT_DUE_MINUTES;
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

    const [rate, subsidyCap, dakika] = await Promise.all([
      this.rate(),
      this.subsidyCapRate(),
      this.dueMinutes(),
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
            dueDate: new Date(an.getTime() + dakika * 60_000),
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
                dueDate: new Date(an.getTime() + dakika * 60_000),
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

  // TEK KURAL — dönem kapanışı KALDIRILDI (31.08.2026, kurucu talimatı:
  // "para akışı ile ilgili birden fazla kural olamaz").
  //
  // Aynı komisyon için iki model yaşıyordu ve VADELERİ FARKLIYDI:
  //   · işlem başına   → tamamlanma + 30 dk (E5)
  //   · dönem kapanışı → dönem sonu + 7 gün
  //
  // İkisi birlikte durduğu için aynı randevunun iki kez faturalanmasını
  // engelleyen bir koruma yazmak zorunda kalmıştım; o koruma zaten bu ikiliğin
  // BELİRTİSİYDİ. Model tek olunca ihtiyaç da ortadan kalkıyor.
  //
  // Geçmiş dönem faturaları veritabanında DURUYOR; yalnız yeni dönem faturası
  // üretme yolu kapandı. `runOverdue` ve `collect` hepsi için çalışmaya devam
  // eder — tahsilat ve gecikme tek yoldan yürür.

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
    // 1) vade geçmiş pending → overdue (+ son uyarı)
    const grace = await this.graceMinutes();
    // Uyarı gönderilecekleri ÖNCE oku: updateMany kaç satır değiştiğini söyler
    // ama HANGİLERİ olduğunu söylemez, dolayısıyla kime uyarı gideceği bilinmez.
    const uyarilacak = await this.prisma.commissionInvoice.findMany({
      where: { status: 'pending', dueDate: { lt: now } },
      select: { id: true, ownerUserId: true, commissionAmount: true, proName: true },
    });
    const toOverdue = await this.prisma.commissionInvoice.updateMany({
      where: { status: 'pending', dueDate: { lt: now } },
      data: { status: 'overdue' },
    });

    // SON UYARI — kuralın 3. adımı. Askıya alma sessizce olmamalı: uzman hem
    // kalan süreyi hem de ödemezse ne olacağını ÖNCEDEN bilmeli. Yeniden
    // açılış bedeli (borcun 2 katı) da burada söyleniyor; askıya alındıktan
    // sonra öğrenmek "önceden bildirilmeli" kuralını çiğnerdi.
    for (const inv of uyarilacak) {
      if (!inv.ownerUserId) continue;
      const borc = Number(inv.commissionAmount);
      void this.push
        .sendToUser(inv.ownerUserId, {
          title: 'Son uyarı — komisyon ödemesi',
          body: `${grace} dakika içinde ${borc} ₸ ödemezsen hesabın askıya alınır. Yeniden açmak için ${reactivationAmount(borc)} ₸ gerekir.`,
          data: { route: '/seller/commissions' },
        })
        .catch(() => undefined);
    }
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
        // Askıya alındığı da BİLDİRİLİR — hesabın neden çalışmadığını ve nasıl
        // açılacağını uzman ekranda arayarak bulmak zorunda kalmamalı.
        const borc = Number(inv.commissionAmount);
        void this.push
          .sendToUser(inv.ownerUserId, {
            title: 'Hesabın askıya alındı',
            body: `Komisyon ödenmedi. Yeniden açmak için ${reactivationAmount(borc)} ₸ ödemen gerekiyor.`,
            data: { route: '/seller/commissions' },
          })
          .catch(() => undefined);
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
