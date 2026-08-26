import {
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Booking } from '@prisma/client';
import { createHash } from 'node:crypto';
import { canTransition, depositFor, hasConflict, isBookingState } from '@ayna/domain';
import { grantCompletionRewards } from '../loyalty/completion-rewards';
import { loadDepositRules } from './deposit.rules';
import { holdDeadline, loadWindows, responseDeadline } from './booking-windows';
import { SLOT_HOLDING_STATUSES } from './slot-statuses';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { StorageService } from '../storage/storage.service';
import { commissionFor } from '../commissions/commissions.calc';
import { OffersService } from '../offers/offers.service';
import { slotAllowed } from '../offers/offers.rules';
import { canReschedule, cancelOutcome } from './bookings.policy';
import type { CreateBookingInput } from './bookings.dto';

// §3 — iptali yapan taraf. `system` zamanlayıcı/iç çağrı demek.
export type ActorRole = 'customer' | 'provider' | 'admin' | 'system';

// Slot işgal eden durumlar artık ortak dosyada (üç kod yolu aynı listeyi kullanır).
const ACTIVE_SLOT_STATUSES = SLOT_HOLDING_STATUSES;

// Mobil istemci dateLabel/inDays göndermez — startMs'ten Almatı duvar saatiyle türetilir.
function deriveDateLabel(startMs?: number | null): string {
  if (!startMs) return '';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Asia/Almaty',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .formatToParts(new Date(startMs))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.day}/${parts.month} ${parts.hour}:${parts.minute}`;
}

function deriveInDays(startMs?: number | null): number {
  if (!startMs) return 0;
  return Math.max(0, Math.round((startMs - Date.now()) / 86_400_000));
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly storage: StorageService,
    private readonly offers: OffersService,
  ) {}

  // Dekont akışı pushları: uzmanın hesabı Specialist.proId ↔ Booking.proId üzerinden bulunur
  private async expertUserIdFor(bookingId: string): Promise<string | null> {
    const b = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b?.proId) return null;
    const sp = await this.prisma.specialist.findFirst({ where: { proId: b.proId } });
    return sp?.userId ?? null;
  }

  // GİZLİLİK — filtresiz global liste kaldırıldı; kimliğe göre müşteri+sağlayıcı birleşimi.
  async listCombined(userId: string) {
    const [mine, provided] = await Promise.all([
      this.listForUser(userId),
      this.listForProvider(userId),
    ]);
    const byId = new Map<string, (typeof mine)[number]>();
    for (const b of [...mine, ...provided]) byId.set(b.id, b);
    return [...byId.values()];
  }

  // §A1 (ayna2) — otomatik bekleme listesi: iptal/no-show ile slot boşalınca aynı
  // uzmanın bekleme listesindeki müşterilere SIRAYLA push düşer; ilk randevuyu alan
  // kazanır (atomik slot kilidi yarışı güvenli çözer). Uzman hiçbir şey yapmaz.
  private async notifyWaitlist(freed: Booking) {
    if (!freed.proId) return;
    const waiters = await this.prisma.booking.findMany({
      where: {
        proId: freed.proId,
        status: 'waitlist',
        userId: { not: null },
        ...(freed.id ? { id: { not: freed.id } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });
    for (const w of waiters) {
      if (!w.userId) continue;
      void this.push
        .sendToUser(w.userId, {
          title: 'Bir yer açıldı! 🎉',
          body: `${freed.proName} için bir saat boşaldı — ilk onaylayan alır.`,
          data: { route: `/booking/schedule?proId=${freed.proId}` },
        })
        .catch(() => undefined);
    }
  }

  // §5.6 önkoşulu — kullanıcıya bağlı randevular (MÜŞTERİ olarak)
  async listForUser(userId: string) {
    const rows = await this.prisma.booking.findMany({
      where: { userId },
      orderBy: { inDays: 'asc' },
    });
    return rows.map(mapBooking);
  }

  // §9.4 — SAĞLAYICI olarak gelen randevular: uzman (Specialist.proId) veya salon
  // (Business.professionalId) → booking.proId eşleşmesi. Gelen 'Randevu Al' talepleri buradan görünür.
  async listForProvider(userId: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    let proId = sp?.proId ?? null;
    if (!proId) {
      const biz = await this.prisma.business.findFirst({ where: { ownerUserId: userId } });
      proId = biz?.professionalId ?? null;
    }
    // §10.2 — SALON-BAĞLI uzman: kendi keşif kaydı (proId) yoktur; salonun keşif kaydına gelip
    // KENDİSİNE atanan randevuları görür (uzmanName eşleşmesi). Salon sahibi tüm kadroyu görürken,
    // bağlı uzman yalnız kendi randevusunu görür — takvimi boş kalmaz.
    if (!proId && sp?.businessId) {
      const biz = await this.prisma.business.findUnique({ where: { id: sp.businessId } });
      const salonPro = biz?.professionalId ?? null;
      if (salonPro) {
        const me = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        // Adı olmayan uzman hiçbir kayıtla eşleşemez. Sorguyu NUL sentinel'iyle
        // çalıştırmak Postgres'te hata verir (text alanı NUL kabul etmez) —
        // sorguyu hiç açmadan boş dön.
        if (!me?.name) return [];
        const rows = await this.prisma.booking.findMany({
          where: { proId: salonPro, uzmanName: me.name },
          orderBy: { inDays: 'asc' },
        });
        return rows.map(mapBooking);
      }
    }
    if (!proId) return [];
    const rows = await this.prisma.booking.findMany({
      where: { proId },
      orderBy: { inDays: 'asc' },
    });
    // §7.3 — Güvenilir müşteri rozeti (yalnız POZİTİF): ≥3 tamamlanan + 0 no-show
    const uids = [...new Set(rows.map((b) => b.userId).filter((x): x is string => !!x))];
    const hist = uids.length
      ? await this.prisma.booking.findMany({
          where: { userId: { in: uids }, status: { in: ['completed', 'no_show'] } },
          select: { userId: true, status: true },
        })
      : [];
    const done = new Map<string, number>();
    const bad = new Set<string>();
    for (const h of hist) {
      if (!h.userId) continue;
      if (h.status === 'no_show') bad.add(h.userId);
      else done.set(h.userId, (done.get(h.userId) ?? 0) + 1);
    }
    return rows.map((b) => ({
      ...mapBooking(b),
      customerTrusted: !!b.userId && (done.get(b.userId) ?? 0) >= 3 && !bad.has(b.userId),
    }));
  }

  // §5 — CRM özet istatistiği. GİZLİLİK: sağlayıcı yalnız KENDİ randevularını görür
  // (önceden global sayıyordu — her uzman platform toplamını görüyordu).
  async stats(userId?: string) {
    let where = {};
    if (userId) {
      const sp = await this.prisma.specialist.findUnique({ where: { userId } });
      let proId = sp?.proId ?? null;
      if (!proId) {
        const biz = await this.prisma.business.findFirst({ where: { ownerUserId: userId } });
        proId = biz?.professionalId ?? null;
      }
      where = proId ? { proId } : { userId };
    }
    const rows = await this.prisma.booking.findMany({ where });
    const base = computeBookingStats(
      rows.map((b) => ({ status: b.status, price: Number(b.price), userId: b.userId })),
    );
    // §12.8 — ödenecek komisyon: online ciro × oran(%); oran admin parametresi (varsayılan %15)
    const s = await this.prisma.setting.findUnique({ where: { key: 'commission.rate' } });
    const commissionRate = s?.intValue ?? 10;
    const commission = commissionFor(base.commissionBase, commissionRate);
    return { ...base, commission, commissionRate };
  }

  async create(input: CreateBookingInput, userId?: string) {
    // §keşif Modül 2 — kampanyadan randevu: sunucu doğrular (aktif + hedef uzman +
    // gün/saat penceresi + kota) ve fiyatı KAMPANYA fiyatına sabitler (client'a güvenilmez).
    let offerPrice: number | null = null;
    if (input.offerId) {
      const offer = await this.offers.findActive(input.offerId);
      if (!offer) {
        throw new BadRequestException({
          code: 'OFFER_UNAVAILABLE',
          message: 'Kampanya sona erdi ya da kotası doldu',
        });
      }
      if (input.proId && offer.proId !== input.proId) {
        throw new BadRequestException({
          code: 'OFFER_MISMATCH',
          message: 'Kampanya bu uzmana ait değil',
        });
      }
      if (input.startMs && !slotAllowed(offer, input.startMs)) {
        throw new BadRequestException({
          code: 'OFFER_SLOT_INVALID',
          message: 'Seçilen saat kampanyanın geçerli gün/saat penceresi dışında',
        });
      }
      offerPrice = Number(offer.finalPrice);
    }

    // §5.3 — zaman pencereleri admin ayarından; kod içine gömülü değil.
    const windows = await loadWindows(this.prisma);
    // id istemciden gelir → upsert ile idempotent (tekrar gönderim güvenli)
    const data = {
      source: input.source,
      service: input.service,
      proId: input.proId ?? null,
      proName: input.proName,
      proImage: input.proImage,
      uzmanName: input.uzmanName ?? null,
      customerName: input.customerName ?? null,
      customerPhone: input.customerPhone ?? null,
      bySalon: input.bySalon ?? false,
      bookingKind: input.bookingKind ?? 'normal',
      groupSize: input.groupSize ?? null,
      dateLabel: input.dateLabel ?? deriveDateLabel(input.startMs),
      inDays: input.inDays ?? deriveInDays(input.startMs),
      startAt: input.startMs ? new Date(input.startMs) : null,
      durationMin: input.durationMin ?? null,
      price: offerPrice ?? input.price,
      status: input.status ?? 'confirmed',
      ...(input.offerId ? { offerId: input.offerId } : {}),
      // §4.1.3 — yanıt penceresi SUNUCUDA üretilir; mobil sayaç buna bakar
      ...((input.status ?? 'confirmed') === 'awaiting_provider'
        ? { responseDeadline: responseDeadline(windows) }
        : {}),
    };
    const existing = await this.prisma.booking.findUnique({ where: { id: input.id } });
    // Faz 4 (§15) — SALON, üye adına kayıt eklerken üyenin seçtiği yetki modu uygulanır:
    // view_availability_only → 403; create_requires_approval → uzman onayına ZORLA;
    // manage_calendar → doğrudan kesinleşebilir (fiyat/gelir görünürlüğü değişmez).
    if (!existing && input.bySalon && input.uzmanName && input.proId) {
      const biz = await this.prisma.business.findFirst({
        where: { professionalId: input.proId },
        select: { id: true },
      });
      let member: { calendarPermission: string } | null = null;
      if (biz) {
        const candidates = await this.prisma.specialist.findMany({
          where: { businessId: biz.id },
          select: { userId: true, calendarPermission: true },
        });
        const named = await this.prisma.user.findFirst({
          where: { id: { in: candidates.map((c) => c.userId) }, name: input.uzmanName },
          select: { id: true },
        });
        member = candidates.find((c) => c.userId === named?.id) ?? null;
      }
      const mode = member?.calendarPermission ?? 'create_requires_approval';
      if (mode === 'view_availability_only') {
        throw new ForbiddenException({
          code: 'CALENDAR_FORBIDDEN',
          message: 'Uzman, salonun adına kayıt eklemesine izin vermiyor',
        });
      }
      if (mode === 'create_requires_approval' && data.status === 'confirmed') {
        data.status = 'awaiting_provider';
        data.responseDeadline = responseDeadline(windows);
      }
      // manage_calendar → confirmed kalabilir; aşağıdaki çakışma kontrolü yine çalışır
    }
    // Faz 1/3 — OFFLINE-CONFIRMED kayıt: aynı uzmanın dolu slotuna yazılamaz.
    // Advisory lock ile serileşir; çakışmada 409 SLOT_CONFLICT (istemci kuyruğu conflict işler).
    const row = await this.prisma.$transaction(async (tx) => {
      if (
        !existing &&
        data.status === 'confirmed' &&
        input.proId &&
        input.startMs &&
        input.durationMin
      ) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.proId}))`;
        const candidate = {
          startMs: input.startMs,
          endMs: input.startMs + input.durationMin * 60_000,
        };
        const others = await tx.booking.findMany({
          where: {
            proId: input.proId,
            status: { in: ACTIVE_SLOT_STATUSES },
            startAt: { not: null },
          },
          select: { startAt: true, durationMin: true },
        });
        const busy = others
          .filter((o) => o.startAt && o.durationMin)
          .map((o) => ({
            startMs: o.startAt!.getTime(),
            endMs: o.startAt!.getTime() + (o.durationMin ?? 60) * 60_000,
          }));
        if (hasConflict(candidate, busy)) {
          throw new ConflictException({
            code: 'SLOT_CONFLICT',
            message: 'Bu saat başka bir randevuyla çakışıyor',
          });
        }
      }
      return tx.booking.upsert({
        where: { id: input.id },
        // userId yalnızca oluşturmada; sahibi sonradan değişmez (offline upsert'te bozulmaz)
        create: { id: input.id, ...data, ...(userId ? { userId } : {}) },
        update: data,
      });
    });
    // Kota yalnız İLK oluşturmada düşer (idempotent tekrar gönderim çift saymaz)
    if (input.offerId && !existing) await this.offers.incrementUsed(input.offerId);
    // MD_000 §4.1-1 — YENİ randevu talebi: sağlayıcıya uygulama kapalıyken de düşen
    // gerçek push (yalnız ilk oluşturmada; upsert tekrarında spam yok)
    if (!existing && row.status === 'awaiting_provider' && row.proId) {
      void this.notifyNewRequest(row).catch(() => undefined);
    }
    return mapBooking(row);
  }

  // Faz 1 — scheduler erişimi: süre aşımıyla boşalan slotta bekleme listesini tetikler
  notifyWaitlistFor(b: Booking) {
    return this.notifyWaitlist(b);
  }

  // Talebin muhatapları: bağımsız uzman (Specialist.proId) VE/VEYA salon sahibi
  // (Business.professionalId) + salonda belirli uzman seçildiyse o üye.
  private async notifyNewRequest(b: Booking) {
    const targets = new Set<string>();
    const sp = await this.prisma.specialist.findFirst({ where: { proId: b.proId! } });
    if (sp) targets.add(sp.userId);
    const biz = await this.prisma.business.findFirst({
      where: { professionalId: b.proId! },
    });
    if (biz?.ownerUserId) targets.add(biz.ownerUserId);
    if (biz && b.uzmanName) {
      const members = await this.prisma.specialist.findMany({
        where: { businessId: biz.id },
        select: { userId: true },
      });
      const named = await this.prisma.user.findMany({
        where: { id: { in: members.map((m) => m.userId) }, name: b.uzmanName },
        select: { id: true },
      });
      for (const u of named) targets.add(u.id);
    }
    for (const uid of targets) {
      void this.push
        .sendToUser(uid, {
          title: 'Yeni randevu talebi 📅',
          body: `${b.service} · ${b.dateLabel} — yanıt süresi sınırlı, hemen bak.`,
          data: { route: '/seller/agenda' },
        })
        .catch(() => undefined);
    }
  }

  // §6.C/§4.4 — iptal. Kapora yakma/iade kararını SUNUCU verir (client'a güvenilmez):
  // geç iptal (<3sa, kapora ödenmiş) → kapora yanar; serbest iptal → uzman iade eder.
  async cancel(id: string, reason?: string, actorId?: string) {
    // §3 — iptali KİM yaptı: bu uç her iki tarafa da açık, o yüzden rol
    // assertParty'nin çözdüğü sonuçtan alınıyor.
    const rol = await this.assertParty(id, actorId, 'either');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    const outcome = cancelOutcome(b.status, b.startAt?.getTime() ?? null, Date.now());
    const row = await this.transition(id, {
      status: outcome.status,
      cancelReason: reason ?? null,
      cancelledBy: rol,
      ...(outcome.forfeit ? { depositForfeited: true } : {}),
    });
    // §keşif Modül 2 — kampanya randevusu iptal → kota iadesi
    if (b.offerId) void this.offers.refundQuota(b.offerId);
    // §A1 — slot boşaldı: aynı uzmanın bekleme listesindekilere haber ver
    void this.notifyWaitlist(b);
    this.notifyParties(
      id,
      'Randevu iptal edildi',
      reason ? `Sebep: ${reason}` : 'Detay için randevuya dokun',
    );
    return row;
  }

  // §6.C — uzman/işletme randevuyu "gelmedi" işaretler (CRM tarafı).
  // Kural: randevu saatinin üzerinden EN AZ 1 saat geçmeden işaretlenemez (erken damga önlenir).
  async noShow(id: string, actorId?: string) {
    await this.assertParty(id, actorId, 'provider');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (b?.startAt && Date.now() < b.startAt.getTime() + 60 * 60 * 1000) {
      throw new BadRequestException({
        code: 'NO_SHOW_TOO_EARLY',
        message: 'Gelmedi işareti randevu saatinden 1 saat sonra açılır',
      });
    }
    // Faz 2 — kapora yakma HEMEN değil: teyit penceresi sonunda scheduler uygular
    // (müşteri itiraz ederse disputed'a düşer, finans donar).
    const cfgNs = await this.prisma.setting.findUnique({ where: { key: 'policy.confirm_hours' } });
    const row = await this.transition(id, {
      status: 'no_show',
      finalizeDeadline: new Date(Date.now() + (cfgNs?.intValue ?? 24) * 60 * 60 * 1000),
    });
    // §keşif Modül 2 — kampanya randevusu no-show → kota iadesi
    if (b?.offerId) void this.offers.refundQuota(b.offerId);
    // §A1 — slot boşaldı: bekleme listesine haber ver
    if (b) void this.notifyWaitlist(b);
    this.notifyParties(id, 'Randevu: gelmedi olarak işaretlendi', 'Kapora uzmanda kaldı (§4.4)');
    return row;
  }

  // §4.1.7 — uzman hizmeti tamamladı → randevu 'completed' (değerlendirme daveti uçları buna dayanır)
  // Faz 2 — uzman beyanı TEK TARAFLI kesinleşmez: completed_pending + müşteri teyit
  // penceresi (policy.confirm_hours, varsayılan 24). Pencere sonunda itiraz yoksa
  // scheduler otomatik kesinleştirir; itiraz varsa finansal durum donar (disputed).
  async complete(id: string, actorId?: string) {
    await this.assertParty(id, actorId, 'provider');
    const cfg = await this.prisma.setting.findUnique({ where: { key: 'policy.confirm_hours' } });
    const hours = cfg?.intValue ?? 24;
    const row = await this.transition(id, {
      status: 'completed_pending',
      finalizeDeadline: new Date(Date.now() + hours * 60 * 60 * 1000),
    });
    void this.prisma.booking.findUnique({ where: { id } }).then((b) => {
      if (b?.userId)
        void this.push.sendTemplate(b.userId, 'booking.completed_confirm', undefined, {
          route: `/booking/${id}`,
        });
    });
    return row;
  }

  // Faz 2 — müşteri teyidi: hemen kesinleştirir (+değerlendirme daveti)
  async confirmCompletion(id: string, actorId?: string) {
    await this.assertParty(id, actorId, 'owner');
    const row = await this.transition(id, { status: 'completed' });
    void this.prisma.booking.findUnique({ where: { id } }).then(async (b) => {
      if (!b?.userId) return;
      // K4.1 geri kazanım + D9 referans ödülü. Zamanlayıcı yolu da AYNI
      // fonksiyonu çağırır; çift yazım her ikisinde de engelleniyor.
      await grantCompletionRewards(this.prisma, [b]).catch(() => undefined);
      void this.push.sendToUser(b.userId, {
        title: 'Teşekkürler 💛',
        body: 'Deneyimini değerlendir — 30 saniye sürer',
        data: { route: `/review/new?id=${id}` },
      });
    });
    return row;
  }

  // K1 — DİNAMİK kapora: clamp(round100(fiyat × yüzde), min, max). Hesabın kendisi
  // `@ayna/domain` içinde saf fonksiyon; burada yalnız admin ayarları okunur.
  // İstemciden gelen hiçbir değere güvenilmez: fiyat sunucudaki kayıttan okunur.
  private async depositAmountFor(price: number): Promise<number> {
    return depositFor(Number(price), await loadDepositRules(this.prisma));
  }

  // §4.1/§4.2 — uzman onaylar → ATOMİK slot lock (çift-rezervasyon önlenir) → deposit_pending
  async approve(id: string, actorId?: string) {
    await this.assertParty(id, actorId, 'provider');
    // §5.3 — hold (dekont) penceresi admin ayarı; kod içine gömülü değil.
    const deadline = holdDeadline(await loadWindows(this.prisma));
    // Tek transaction içinde: çakışma kontrolü + durum güncelleme (atomik kilit)
    const row = await this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.findUnique({ where: { id } });
      if (!b)
        throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
      // Faz 1 — AYNI UZMANIN eşzamanlı onayları DB seviyesinde serileşir (advisory lock):
      // 20 paralel onaydan yalnız biri kazanır; kilit transaction bitince kendiliğinden düşer.
      if (b.proId) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${b.proId}))`;
      // Faz 5 (§18) — KİMLİĞİ DOĞRULANMAMIŞ uzman KAPORA ALAMAZ: onay kaporasız
      // doğrudan kesinleşir (ödeme sonrası yerinde). policy.require_kyc_for_deposit=0 kapatır.
      let depositAllowed = true;
      const kycPolicy = await tx.setting.findUnique({
        where: { key: 'policy.require_kyc_for_deposit' },
      });
      if ((kycPolicy?.intValue ?? 1) === 1 && b.proId) {
        const ownerId = await this.proOwnerUserId(b.proId);
        const owner = ownerId
          ? await tx.user.findUnique({ where: { id: ownerId }, select: { kycStatus: true } })
          : null;
        depositAllowed = owner?.kycStatus === 'approved';
      }
      const amount = depositAllowed ? await this.depositAmountFor(Number(b.price)) : 0;
      // Kesin zaman varsa aynı uzmanda çakışan aktif randevu var mı?
      if (b.startAt && b.durationMin && b.proId) {
        const candidate = {
          startMs: b.startAt.getTime(),
          endMs: b.startAt.getTime() + b.durationMin * 60_000,
        };
        const others = await tx.booking.findMany({
          where: {
            proId: b.proId,
            id: { not: id },
            status: { in: ACTIVE_SLOT_STATUSES },
            startAt: { not: null },
          },
          select: { startAt: true, durationMin: true },
        });
        const busy = others
          .filter((o) => o.startAt && o.durationMin)
          .map((o) => ({
            startMs: o.startAt!.getTime(),
            endMs: o.startAt!.getTime() + (o.durationMin ?? 0) * 60_000,
          }));
        if (hasConflict(candidate, busy)) {
          throw new ConflictException({
            code: 'SLOT_TAKEN',
            message: 'Bu saat başka bir randevuyla dolu',
          });
        }
      }
      return tx.booking.update({
        where: { id },
        data: {
          // §18 — kapora izni yoksa onay DOĞRUDAN kesinleşir (kaporasız; ödeme yerinde)
          status: depositAllowed ? 'deposit_pending' : 'confirmed',
          proposedDateLabel: null,
          depositAmount: amount,
          depositDeadline: depositAllowed ? deadline : null,
          respondedAt: new Date(), // §9.2 — ortalama yanıt süresi metriği
        },
      });
    });
    return mapBooking(row);
  }

  // §4.2 — kullanıcı kapora dekontunu yükler → uzman onayı bekler
  async submitDepositReceipt(id: string, receiptUriRaw: string, actorId?: string) {
    await this.assertParty(id, actorId, 'owner');
    // Faz 2 — AYNI DEKONT İKİ KEZ KULLANILAMAZ: içerik sha256'sı benzersiz saklanır
    const hash = createHash('sha256').update(receiptUriRaw).digest('hex');
    const reused = await this.prisma.booking.findFirst({
      where: { id: { not: id }, OR: [{ receiptHash: hash }, { refundReceiptHash: hash }] },
      select: { id: true },
    });
    if (reused) {
      throw new ConflictException({
        code: 'RECEIPT_REUSED',
        message: 'Bu dekont daha önce başka bir randevuda kullanılmış',
      });
    }
    const receiptUri = (await this.storage.put(receiptUriRaw, 'receipts')) ?? receiptUriRaw;
    const res = await this.transition(id, {
      status: 'deposit_submitted',
      depositReceiptUri: receiptUri,
      receiptHash: hash,
    });
    // §4.3 — uzmana gerçek push: dekont geldi, onayla
    void this.expertUserIdFor(id).then((uid) => {
      if (uid)
        void this.push.sendTemplate(uid, 'booking.receipt_arrived', undefined, {
          route: `/booking/${id}`,
        });
    });
    return res;
  }

  // §4.2 — uzman kaporayı onaylar → randevu KESİN
  async confirmDepositReceipt(id: string, actorId?: string) {
    await this.assertParty(id, actorId, 'provider');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    const res = await this.transition(id, { status: 'confirmed' });
    if (b?.userId)
      void this.push.sendToUser(b.userId, {
        title: 'Randevun kesinleşti 🎉',
        body: 'Depozito onaylandı — randevun artık kesin. Detaylara göz at.',
        data: { route: `/booking/${id}` },
      });
    return res;
  }

  // §4.4 — kullanıcı serbest iptal başlatır. SUNUCU pencereyi doğrular: client geç
  // iptali "serbest" diye göndermeye çalışsa bile <3sa ise kapora yakılır.
  async freeCancel(id: string, reason?: string, actorId?: string) {
    const rol = await this.assertParty(id, actorId, 'owner');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    const outcome = cancelOutcome(b.status, b.startAt?.getTime() ?? null, Date.now());
    const row = await this.transition(id, {
      status: outcome.status,
      cancelReason: reason ?? null,
      cancelledBy: rol,
      ...(outcome.forfeit ? { depositForfeited: true } : {}),
    });
    // §keşif Modül 2 — kampanya randevusu iptal → kota iadesi
    if (b.offerId) void this.offers.refundQuota(b.offerId);
    // §A1 — slot boşaldı: aynı uzmanın bekleme listesindekilere haber ver
    void this.notifyWaitlist(b);
    this.notifyParties(
      id,
      'Randevu iptal edildi',
      reason ? `Sebep: ${reason}` : 'Detay için randevuya dokun',
    );
    return row;
  }

  // §4.4 — uzman iade dekontunu yükler → kullanıcı onayı bekler
  async uploadRefundReceipt(id: string, receiptUriRaw: string, actorId?: string) {
    await this.assertParty(id, actorId, 'provider');
    const hash = createHash('sha256').update(receiptUriRaw).digest('hex');
    const reused = await this.prisma.booking.findFirst({
      where: { id: { not: id }, OR: [{ receiptHash: hash }, { refundReceiptHash: hash }] },
      select: { id: true },
    });
    if (reused) {
      throw new ConflictException({
        code: 'RECEIPT_REUSED',
        message: 'Bu dekont daha önce başka bir randevuda kullanılmış',
      });
    }
    const receiptUri = (await this.storage.put(receiptUriRaw, 'receipts')) ?? receiptUriRaw;
    return this.transition(id, {
      status: 'refund_submitted',
      refundReceiptUri: receiptUri,
      refundReceiptHash: hash,
    });
  }

  // §4.4 — kullanıcı iadeyi aldı → kayıt kapanır. Uzman no-show iade yükümlülüğü
  // yerine geldiyse kısıtlı mod kalkar (yalnız bu sebeple konmuşsa).
  async confirmRefund(id: string, actorId?: string) {
    await this.assertParty(id, actorId, 'owner');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    const res = await this.transition(id, { status: 'cancelled' });
    if (b?.providerNoShow && b.proId) {
      const ownerUserId = await this.proOwnerUserId(b.proId);
      if (ownerUserId) {
        await this.prisma.user.updateMany({
          where: { id: ownerUserId, restrictReason: 'provider_noshow_refund' },
          data: { restrictedAt: null, restrictReason: null },
        });
      }
    }
    return res;
  }

  // §4.4 — taraflar itiraz açar → admin anlaşmazlık kuyruğu
  async dispute(id: string, actorId?: string) {
    await this.assertParty(id, actorId, 'either');
    // Faz 2 — itiraz finansal sonucu DONDURUR: teyit penceresi iptal (scheduler dokunamaz)
    return this.transition(id, { status: 'disputed', finalizeDeadline: null });
  }

  // §4.4-b — UZMAN gelmedi: iade akışı + 1.000 ₸ uzmanın komisyon borcuna (ceza faturası).
  // (Kullanıcıya 1000 puan telafisi mobil earn ile verilir; burada komisyon borcu doğar.)
  // §4.4 — bir Professional'ın sahip User'ı: önce salon (Business.ownerUserId),
  // yoksa bağımsız uzman (Specialist.proId → userId). Böylece bağımsız uzman da kısıtlanır.
  private async proOwnerUserId(proId: string): Promise<string | null> {
    const biz = await this.prisma.business.findFirst({
      where: { professionalId: proId },
      select: { ownerUserId: true },
    });
    if (biz?.ownerUserId) return biz.ownerUserId;
    const sp = await this.prisma.specialist.findFirst({
      where: { proId },
      select: { userId: true },
    });
    return sp?.userId ?? null;
  }

  async providerNoShow(id: string, actorId?: string) {
    await this.assertParty(id, actorId, 'owner');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    const updated = await this.prisma.booking.update({
      where: { id },
      // §4.4-b — uzman gelmedi: iadeyi doğuran taraf UZMAN.
      data: { status: 'refund_pending', providerNoShow: true, cancelledBy: 'provider' },
    });
    if (b.proId) {
      // Uzman no-show cezası: bu randevunun GERÇEK kaporası kadar komisyon borcu doğar
      const amount =
        b.depositAmount != null
          ? Number(b.depositAmount)
          : await this.depositAmountFor(Number(b.price));
      const ownerUserId = await this.proOwnerUserId(b.proId);
      const now = new Date();
      await this.prisma.commissionInvoice.create({
        data: {
          proId: b.proId,
          proName: b.proName,
          ownerUserId: ownerUserId ?? null,
          periodStart: now,
          periodEnd: now,
          bookingsCount: 0,
          grossRevenue: 0,
          commissionAmount: amount, // no-show cezası uzmanın komisyon borcuna eklenir
          dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          status: 'pending',
        },
      });
      // §4.4 — ceza doğduğu an uzman hesabı KISITLI MODA düşer (salon VEYA bağımsız uzman).
      if (ownerUserId) {
        await this.prisma.user.update({
          where: { id: ownerUserId },
          data: { restrictedAt: now, restrictReason: 'provider_noshow_refund' },
        });
      }
    }
    return mapBooking(updated);
  }

  /**
   * §7.8 — BİR KEZ ADİL ERTELEME.
   *
   * Kodda müşterinin elinde yalnız İPTAL vardı: saatini değiştirmek isteyen
   * müşteri iptal etmek zorunda kalıyor, geç iptal penceresindeyse kaporasını
   * yakıyordu — hâlbuki hizmetten vazgeçmemişti.
   *
   * Kapora AKTARILIR (yeni tutar hesaplanmaz; fiyat değişmiyor). Yeni slot
   * diğer üç yolla aynı desende yeniden tutulur: advisory lock + çakışma
   * kontrolü, üstüne veritabanı slot kısıtı.
   */
  async reschedule(id: string, newStartMs: number, actorId?: string) {
    const rol = await this.assertParty(id, actorId, 'owner');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });

    const [limitRow, windowRow] = await Promise.all([
      this.prisma.setting.findUnique({ where: { key: 'policy.free_reschedules' } }),
      this.prisma.setting.findUnique({ where: { key: 'rate.cancel_window_h' } }),
    ]);
    const limit = limitRow?.intValue ?? 1;
    const windowMs = (windowRow?.intValue ?? 3) * 60 * 60 * 1000;

    const karar = canReschedule({
      status: b.status,
      startAtMs: b.startAt?.getTime() ?? null,
      nowMs: Date.now(),
      used: b.rescheduleCount,
      limit,
      windowMs,
    });
    if (!karar.ok) {
      throw new BadRequestException({
        code: karar.code,
        message:
          karar.code === 'RESCHEDULE_LIMIT'
            ? 'Bu randevu için ücretsiz erteleme hakkın doldu'
            : karar.code === 'RESCHEDULE_TOO_LATE'
              ? 'Randevuya çok az kaldı — erteleme penceresi kapandı'
              : 'Bu randevu ertelenemez',
      });
    }
    if (!Number.isFinite(newStartMs) || newStartMs <= Date.now()) {
      throw new BadRequestException({ code: 'BAD_SLOT', message: 'Geçmiş bir saat seçilemez' });
    }

    const sure = b.durationMin ?? 60;
    const row = await this.prisma.$transaction(async (tx) => {
      if (b.proId) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${b.proId}))`;
        const others = await tx.booking.findMany({
          where: {
            proId: b.proId,
            id: { not: id }, // kendi eski saati çakışma sayılmaz
            status: { in: ACTIVE_SLOT_STATUSES },
            startAt: { not: null },
          },
          select: { startAt: true, durationMin: true },
        });
        const busy = others
          .filter((o) => o.startAt)
          .map((o) => ({
            startMs: o.startAt!.getTime(),
            endMs: o.startAt!.getTime() + (o.durationMin ?? 60) * 60_000,
          }));
        if (hasConflict({ startMs: newStartMs, endMs: newStartMs + sure * 60_000 }, busy)) {
          throw new ConflictException({
            code: 'SLOT_CONFLICT',
            message: 'Bu saat başka bir randevuyla çakışıyor',
          });
        }
      }
      return tx.booking.update({
        where: { id },
        data: {
          startAt: new Date(newStartMs),
          dateLabel: deriveDateLabel(newStartMs),
          inDays: deriveInDays(newStartMs),
          proposedStartAt: null,
          // Kapora AYNEN kalır — yeni randevuya aktarılmış olur (§7.8).
          rescheduleCount: { increment: 1 },
        },
      });
    });

    await this.prisma.auditLog
      .create({
        data: {
          actorId: actorId ?? null,
          actorRole: rol,
          action: 'booking.reschedule',
          resourceType: 'booking',
          resourceId: id,
          safeDiff: { used: b.rescheduleCount + 1, limit },
        },
      })
      .catch(() => undefined);

    this.notifyParties(id, 'Randevu ertelendi', `Yeni saat: ${deriveDateLabel(newStartMs)}`);
    return mapBooking(row);
  }

  // §1.6 — uzman alternatif saat önerir (mobil epoch ms; proposedStartAt olarak saklanır)
  async propose(id: string, proposedStartMs: number, actorId?: string) {
    await this.assertParty(id, actorId, 'provider');
    return this.transition(id, {
      status: 'alternative_proposed',
      respondedAt: new Date(),
      proposedStartAt: new Date(proposedStartMs),
    });
  }

  // §1.6 — kullanıcı önerilen alternatifi kabul eder (başlangıç güncellenir, onaylanır)
  // ── §4.6 DEVRETME ────────────────────────────────────────────────────────
  //
  // Bu akışın TAMAMI istemcide yaşıyordu: salon randevuyu başka uzmana
  // devrediyor, müşteri onaylıyor ya da reddediyor — hiçbiri sunucuya
  // yazılmıyordu. Uygulama yeniden açılınca hydrate sunucudaki eski durumu geri
  // getiriyor ve işlemin tamamı KAYBOLUYORDU. Reddetme üstelik iade/iptal
  // ayrımını (yani PARA kararını) istemcide veriyordu.

  /** Salon/uzman randevuyu başka uzmana devreder → müşteri onayı beklenir. */
  async reassign(id: string, toUzmanName: string, toProId?: string, actorId?: string) {
    await this.assertParty(id, actorId, 'provider');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    return this.transition(id, {
      status: 'reassigned_pending',
      // Önceki uzmanın adı SAKLANIR: müşteri kimden kime devredildiğini görmeli.
      reassignedFrom: b.uzmanName ?? null,
      uzmanName: toUzmanName,
      ...(toProId ? { proId: toProId } : {}),
    });
  }

  /** Müşteri devri KABUL eder → randevu kesinleşir. */
  async acceptReassignment(id: string, actorId?: string) {
    await this.assertParty(id, actorId, 'owner');
    return this.transition(id, { status: 'confirmed', reassignedFrom: null });
  }

  /**
   * Müşteri devri REDDEDER.
   *
   * Kapora ASLA YANMAZ: değişiklik müşteriden değil sağlayıcıdan geldi. Kapora
   * ödenmişse iade sürecine, ödenmemişse düz iptale gider. (Normal iptal yolu
   * `cancelOutcome` ile geç iptal cezası uygulayabiliyor — burada uygulanamaz.)
   */
  async rejectReassignment(id: string, actorId?: string) {
    const rol = await this.assertParty(id, actorId, 'owner');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    const kaporaOdendi = b.depositReceiptUri != null || (b.depositAmount ?? 0) > 0;
    return this.transition(id, {
      status: kaporaOdendi ? 'refund_pending' : 'cancelled',
      cancelReason: 'booking.reassign.rejected',
      cancelledBy: rol,
      reassignedFrom: null,
      depositForfeited: false,
    });
  }

  async accept(id: string, actorId?: string) {
    await this.assertParty(id, actorId, 'owner');
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    return this.transition(id, {
      status: 'confirmed',
      startAt: b.proposedStartAt ?? b.startAt,
      proposedStartAt: null,
    });
  }

  // §1.6 — kullanıcı karşı öneri yapar (yeni başlangıç, tekrar uzman onayına döner)
  async counter(id: string, proposedStartMs: number, actorId?: string) {
    await this.assertParty(id, actorId, 'owner');
    return this.transition(id, {
      status: 'awaiting_provider',
      startAt: new Date(proposedStartMs),
      proposedStartAt: null,
    });
  }

  // §güvenlik — eylemi yapan, randevunun TARAFI olmalı (owner=müşteri, provider=uzman/salon).
  // actorId verilmediyse (iç çağrı) kontrol atlanır; admin rolü her eylemi yapabilir.
  // Yetkiyi doğrular VE aktörün rolünü döndürür. Rol zaten burada hesaplanıyor;
  // iptali kimin yaptığını kaydetmek için ikinci kez hesaplamak hem israf hem de
  // iki mantığın ayrışma riski olurdu.
  private async assertParty(
    bookingId: string,
    actorId: string | undefined,
    who: 'owner' | 'provider' | 'either',
  ): Promise<ActorRole> {
    this.lastActorId = actorId;
    if (!actorId) return 'system';
    const [b, actor] = await Promise.all([
      this.prisma.booking.findUnique({ where: { id: bookingId } }),
      this.prisma.user.findUnique({ where: { id: actorId } }),
    ]);
    if (!b)
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    if (actor?.role === 'admin') return 'admin';
    const isOwner = !!b.userId && b.userId === actorId;
    let isProvider = false;
    if (b.proId) {
      const uid = await this.expertUserIdFor(bookingId);
      isProvider = uid === actorId;
      if (!isProvider) {
        const biz = await this.prisma.business.findFirst({ where: { professionalId: b.proId } });
        isProvider = biz?.ownerUserId === actorId;
      }
      // §10.2 — salona-bağlı uzman KENDİSİNE atanan salon randevusunu yönetebilir
      // (salonun keşif kaydına gelen + uzmanName kendisine eşleşen). Salon sahibi de yönetir.
      if (!isProvider && b.uzmanName && actor?.name === b.uzmanName) {
        const sp = await this.prisma.specialist.findUnique({ where: { userId: actorId } });
        if (sp?.businessId) {
          const myBiz = await this.prisma.business.findUnique({ where: { id: sp.businessId } });
          isProvider = myBiz?.professionalId === b.proId;
        }
      }
    }
    const ok = who === 'owner' ? isOwner : who === 'provider' ? isProvider : isOwner || isProvider;
    if (!ok)
      throw new ForbiddenException({
        code: 'NOT_BOOKING_PARTY',
        message: 'Bu randevu üzerinde işlem yetkin yok',
      });
    return isOwner ? 'customer' : 'provider';
  }

  private async transition(id: string, data: Record<string, unknown>) {
    const existing = await this.prisma.booking.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Randevu bulunamadı' });
    }
    // §4 — durum makinesi. Eskiden burada bir KARA LİSTE vardı: yalnız kapalı
    // durumlardan çıkış engelleniyordu, dolayısıyla `deposit_pending → completed`
    // gibi kapora adımını tümden atlayan geçişler serbestti. Artık BEYAZ LİSTE
    // (`@ayna/domain`): izin verilmeyen her geçiş reddedilir.
    // Çift POST idempotent kabul edilir: aynı hedef → mevcut kayıt döner.
    const target = typeof data.status === 'string' ? data.status : null;
    if (target) {
      if (existing.status === target) return mapBooking(existing); // idempotent tekrar
      if (!isBookingState(target)) {
        throw new BadRequestException({
          code: 'INVALID_TRANSITION',
          message: `Bilinmeyen randevu durumu: ${target}`,
        });
      }
      if (!canTransition(existing.status, target)) {
        throw new BadRequestException({
          code: 'INVALID_TRANSITION',
          message: `Randevu '${existing.status}' durumundan '${target}' durumuna geçemez`,
        });
      }
    }
    // §12.8 — tamamlanma ANI kaydedilir; komisyon dönemi buna göre belirlenir.
    // Tek geçiş noktası burası olduğu için hiçbir yol bunu atlayamaz.
    if (target === 'completed' && !existing.completedAt) data.completedAt = new Date();
    // §3 — iptal anı tek yerde damgalanır. `refund_pending` de bir iptal yolu:
    // iade akışı iptalle başlıyor, `cancelled` yalnız iade tamamlanınca geliyor.
    if ((target === 'cancelled' || target === 'refund_pending') && !existing.cancelledAt) {
      data.cancelledAt = new Date();
    }
    const row = await this.prisma.booking.update({ where: { id }, data });
    // §12 — kritik eylem audit log'u (kim, ne zaman, hangi geçiş)
    if (target)
      void this.prisma.auditLog
        .create({
          data: {
            action: `booking.${target}`,
            resourceType: 'booking',
            resourceId: id,
            actorId: this.lastActorId ?? null,
            actorRole: this.lastActorId ? 'party' : 'system',
          },
        })
        .catch(() => undefined);
    return mapBooking(row);
  }

  // assertParty'den geçen son aktör — transition audit'i için (istek başına tek akış)
  private lastActorId: string | undefined;

  // Durum geçişlerinde İKİ TARAFA push (sahip müşteri + uzman) — kapalıyken de haber gitsin
  private notifyParties(bookingId: string, title: string, body: string): void {
    void this.prisma.booking.findUnique({ where: { id: bookingId } }).then((b) => {
      if (!b) return;
      const data = { route: `/booking/${bookingId}` };
      if (b.userId) void this.push.sendToUser(b.userId, { title, body, data });
      void this.expertUserIdFor(bookingId).then((uid) => {
        if (uid && uid !== b.userId) void this.push.sendToUser(uid, { title, body, data });
      });
    });
  }
}

function mapBooking(b: Booking) {
  return {
    id: b.id,
    source: b.source,
    service: b.service,
    proId: b.proId ?? '',
    proName: b.proName,
    proImage: b.proImage,
    uzmanName: b.uzmanName ?? undefined,
    customerName: b.customerName ?? undefined,
    bookingKind: b.bookingKind,
    groupSize: b.groupSize ?? undefined,
    dateLabel: b.dateLabel,
    proposedDateLabel: b.proposedDateLabel ?? undefined,
    inDays: b.inDays,
    startMs: b.startAt?.getTime() ?? undefined,
    proposedStartMs: b.proposedStartAt?.getTime() ?? undefined,
    durationMin: b.durationMin ?? undefined,
    price: Number(b.price),
    status: b.status,
    cancelReason: b.cancelReason ?? undefined,
    // §3 — iptali kim yaptı. İstemci "sen iptal ettin" ile "uzman iptal etti"
    // ayrımını artık tahmin etmek yerine okuyor.
    cancelledBy: b.cancelledBy ?? undefined,
    cancelledAt: b.cancelledAt?.getTime() ?? undefined,
    // §4.1-4.4 — depozito/iade alanları (mobil Appointment alan adlarıyla hizalı)
    depositAmount: b.depositAmount ?? undefined,
    receiptUri: b.depositReceiptUri ?? undefined, // mobil `receiptUri` bekler (hydrate uyumu)
    refundReceiptUri: b.refundReceiptUri ?? undefined,
    // mobil Appointment.depositDeadline = UTC ms bekler (ISO string geri sayımı bozar)
    depositDeadline: b.depositDeadline?.getTime() ?? undefined,
    depositForfeited: b.depositForfeited,
    providerNoShow: b.providerNoShow,
    // §10 — salon offline alanları (hydrate'te kaybolmaz) + kampanya bağı + yanıt metrikleri
    customerPhone: b.customerPhone ?? undefined,
    bySalon: b.bySalon,
    offerId: b.offerId ?? undefined,
    responseDeadline: b.responseDeadline?.getTime() ?? undefined,
    respondedAt: b.respondedAt?.getTime() ?? undefined,
    reviewed: b.reviewed,
  };
}

// §5 — saf istatistik hesabı (DB'den bağımsız; test edilebilir)
export function computeBookingStats(
  rows: { status: string; price: number; userId?: string | null }[],
) {
  const count = (s: string) => rows.filter((b) => b.status === s).length;
  const completedRows = rows.filter((b) => b.status === 'completed');
  const revenue = completedRows.reduce((sum, b) => sum + b.price, 0);
  // §gelir modeli — komisyon TABANI yalnız online (AYNA aracılı, userId dolu) randevular; offline hariç.
  const commissionBase = completedRows
    .filter((b) => b.userId != null)
    .reduce((sum, b) => sum + b.price, 0);
  const noShow = count('no_show');
  const cancelled = count('cancelled');
  const upcoming = rows.filter((b) =>
    ['confirmed', 'pending', 'awaiting_provider', 'alternative_proposed'].includes(b.status),
  ).length;
  const realized = completedRows.length + noShow; // tamamlanan + gelmeyen
  const noShowRate = realized ? Math.round((noShow / realized) * 100) : 0;
  return {
    total: rows.length,
    completed: completedRows.length,
    cancelled,
    noShow,
    noShowRate,
    upcoming,
    revenue,
    commissionBase,
    currency: 'KZT' as const,
  };
}
