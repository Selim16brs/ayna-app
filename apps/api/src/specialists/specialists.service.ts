import { SLOT_HOLDING_STATUSES } from '../bookings/slot-statuses';
import {
  cakisanRandevular,
  type BookingWindow,
  type DayHours,
  aynaOnayli,
  uzmanKayitli,
} from '@ayna/domain';

// Asia/Almaty = UTC+5, yaz saati YOK. Sunucu UTC saklıyor; uzman yerel saate
// göre çalışıyor, ham UTC ile karşılaştırmak günü kaydırırdı.
const ALMATY_OFFSET_MS = 5 * 60 * 60_000;
import { sectorsFromServiceIds } from '@ayna/domain';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Specialist, User } from '@prisma/client';
import type { Env } from '@ayna/config/env';
import { ENV } from '../config/config.module';
import {
  deviceHash,
  encryptField,
  hashPassword,
  normalizePhone,
  phoneHash,
  signJwt,
} from '../common/crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { StorageService } from '../storage/storage.service';
import type { RegisterSpecialistInput } from './specialists.dto';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomCode(len = 4): string {
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += CODE_CHARS[bytes[i]! % CODE_CHARS.length];
  return out;
}

@Injectable()
export class SpecialistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly storage: StorageService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  // §3.3 — Uzman kaydı. Salona bağlıysa işletme doğrulama kodu şart.
  async register(input: RegisterSpecialistInput) {
    let businessId: string | null = null;

    if (input.kind === 'salon_bound') {
      if (!input.businessId || !input.code) {
        throw new BadRequestException({ code: 'CODE_REQUIRED', message: 'Doğrulama kodu gerekli' });
      }
      const c = await this.prisma.businessInviteCode.findUnique({ where: { code: input.code } });
      const valid = c && c.businessId === input.businessId && c.status === 'active';
      if (!valid) {
        if (c && c.businessId === input.businessId) {
          await this.prisma.businessInviteCode.update({
            where: { id: c.id },
            data: { attempts: { increment: 1 } },
          });
        }
        throw new BadRequestException({
          code: 'INVALID_CODE',
          message: 'Kod geçersiz. Bir işletmeye bağlı değilseniz bireysel kayıt açın.',
        });
      }
      businessId = input.businessId;
    }

    // §uzman onboarding — kayıtlı ИП uzman: 12 haneli IIN + mükerrer kontrol (Seviye-1)
    const iin = input.entityType === 'ip' ? (input.iin ?? '') : '';
    if (input.entityType === 'ip' && /^\d{12}$/.test(iin)) {
      const dup = await this.prisma.specialist.findFirst({ where: { iin } });
      if (dup) {
        throw new ConflictException({
          code: 'IIN_TAKEN',
          message: 'Bu IIN zaten kayıtlı',
        });
      }
    }

    const key = this.env.FIELD_ENCRYPTION_KEY;
    const ph = phoneHash(input.phone, key);
    if (await this.prisma.user.findUnique({ where: { phoneHash: ph } })) {
      throw new ConflictException({ code: 'PHONE_TAKEN', message: 'Bu telefon zaten kayıtlı' });
    }
    // §4.4 — kalıcı engel 2. katman: aynı cihaz parmak iziyle engellenmiş (suspended) hesap varsa yeni kayıt engellenir
    const dh = input.deviceFp ? deviceHash(input.deviceFp, key) : null;
    if (dh) {
      const banned = await this.prisma.user.findFirst({
        where: { deviceHash: dh, status: 'suspended' },
      });
      if (banned) {
        throw new ForbiddenException({
          code: 'DEVICE_BANNED',
          message: 'Bu cihaz kalıcı olarak engellenmiş. Destek ile iletişime geçin.',
        });
      }
    }
    if (input.email && (await this.prisma.user.findUnique({ where: { email: input.email } }))) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Bu e-posta zaten kayıtlı' });
    }

    const user = await this.prisma.user.create({
      data: {
        phoneHash: ph,
        phoneEnc: Uint8Array.from(encryptField(normalizePhone(input.phone), key)),
        passwordHash: hashPassword(input.password),
        name: input.name,
        role: 'professional',
        ...(input.photoDataUrl ? { avatarUrl: input.photoDataUrl } : {}),
        ...(input.birthDateMs ? { birthDate: new Date(input.birthDateMs) } : {}),
        defaultLocale: 'tr',
        ...(input.email ? { email: input.email } : {}),
        ...(input.city ? { city: input.city } : {}),
        ...(dh ? { deviceHash: dh } : {}),
      },
    });

    const specialist = await this.prisma.specialist.create({
      data: {
        userId: user.id,
        businessId,
        kind: input.kind,
        bio: input.bio ?? '',
        certificates: input.certificates,
        featured: input.certificates.length > 0, // sertifika → öne çıkma (§3.3)
        entityType: input.entityType,
        iin,
      },
    });

    if (input.kind === 'salon_bound' && input.code) {
      await this.prisma.businessInviteCode.update({
        where: { code: input.code },
        data: { status: 'used', usedByUserId: user.id },
      });
    }

    // §7 — bağımsız uzman keşif kataloğunda da yer alır; yorumları bu Professional'a bağlanır.
    // (salon_bound uzman tek başına listelenmez — salonun kaydı üzerinden görünür)
    const hizmetler = (input.services ?? []).slice(0, 60);
    if (input.kind === 'independent') {
      try {
        const pro = await this.prisma.professional.create({
          data: {
            name: input.name,
            specialty: (input.bio ?? '').slice(0, 60) || input.name,
            sector: input.sector ?? 'hair',
            // Alan seti hizmet listesinden türetilir; boşsa ana alana düşülür
            // ki uzman en azından kendi ana alanında bulunabilsin.
            sectors: sectorsFromServiceIds(hizmetler.map((x) => x.id)).length
              ? sectorsFromServiceIds(hizmetler.map((x) => x.id))
              : [input.sector ?? 'hair'],
            // §9.5 — kayıtta girilen gerçek hizmet/fiyat/süre listesi. Buraya
            // yazılmadığı için profil sektörün varsayılan menüsünü uyduruyordu.
            servicesJson: JSON.stringify(hizmetler),
            kind: 'independent',
            city: input.city ?? '', // §5.1.4 — harita/arama şehir eşleşmesi
            district: input.city ?? '',
            /*
             * GERÇEK KONUM. Yazılmadığı için `proCoords` şehir merkezi
             * etrafına uydurma bir dağılım üretiyordu ve "yakınımdakiler"
             * alakasız sonuçlar veriyordu.
             */
            ...(input.lat != null ? { lat: input.lat } : {}),
            ...(input.lng != null ? { lng: input.lng } : {}),
            imageUrl: '',
          },
        });
        await this.prisma.specialist.update({
          where: { id: specialist.id },
          data: { proId: pro.id },
        });
      } catch {
        // keşif kaydı oluşturulamazsa kayıt yine de tamamlanır (proId null kalır)
      }
    }

    return { token: this.token(user), specialist: mapSpecialist(specialist) };
  }

  // §7 — uzmanın KENDİ işlerine yazılan yorumları (proId = keşif karşılığı ile eşleşen görünür ratings).
  async myReviews(userId: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    if (!sp?.proId) return { linked: false, average: null, count: 0, reviews: [] };
    const rows = await this.prisma.rating.findMany({
      where: { subjectId: sp.proId, raterRole: 'user', visible: true },
      orderBy: { createdAt: 'desc' },
    });
    const count = rows.length;
    const average = count
      ? Math.round((rows.reduce((s, r) => s + r.score, 0) / count) * 10) / 10
      : null;
    return {
      linked: true,
      average,
      count,
      reviews: rows.map((r) => ({
        id: r.id,
        score: r.score,
        comment: r.comment,
        serviceTag: r.serviceTag,
        authorLabel: r.authorLabel,
        reply: r.reply,
        createdAt: r.createdAt,
      })),
    };
  }

  // §7.2 — uzman yalnız KENDİ yorumuna tek yanıt yazabilir (silemez).
  async replyReview(userId: string, ratingId: string, text: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    // geçersiz/hatalı UUID → Prisma fırlatır; kullanıcıya 404 olarak dönelim (500 değil)
    const r = await this.prisma.rating.findUnique({ where: { id: ratingId } }).catch(() => null);
    if (!r) throw new NotFoundException({ code: 'RATING_NOT_FOUND', message: 'Yorum bulunamadı' });
    if (!sp?.proId || r.subjectId !== sp.proId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Bu yorum sana ait değil' });
    }
    if (!r.visible) {
      throw new BadRequestException({
        code: 'RATING_NOT_VISIBLE',
        message: 'Henüz açılmamış yoruma yanıt verilemez',
      });
    }
    const updated = await this.prisma.rating.update({
      where: { id: ratingId },
      data: { reply: text, repliedAt: new Date() },
    });
    return { id: updated.id, reply: updated.reply, repliedAt: updated.repliedAt };
  }

  // §7.2 — uzman KENDİ yorumuna itiraz eder → admin kuyruğuna düşer; yorum GÖRÜNÜR kalır (otomatik gizleme YOK).
  async disputeReview(userId: string, ratingId: string, reason: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    const r = await this.prisma.rating.findUnique({ where: { id: ratingId } }).catch(() => null);
    if (!r) throw new NotFoundException({ code: 'RATING_NOT_FOUND', message: 'Yorum bulunamadı' });
    if (!sp?.proId || r.subjectId !== sp.proId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Bu yorum sana ait değil' });
    }
    const updated = await this.prisma.rating.update({
      where: { id: ratingId },
      // visible DEĞİŞMEZ — yorum inceleme boyunca görünür kalır (§7.2)
      data: { disputed: true, disputeReason: reason || null, disputedAt: new Date() },
    });
    return { id: updated.id, disputed: updated.disputed };
  }

  private token(user: User): string {
    return signJwt(
      { sub: user.id, role: user.role },
      this.env.JWT_ACCESS_SECRET,
      this.env.JWT_ACCESS_TTL,
    );
  }

  // §CRM — BUGÜN doğum günü olan MÜŞTERİLER (uzmana randevu bağı olan gerçek kişiler)
  async birthdaysToday(expertUserId: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId: expertUserId } });
    if (!sp?.proId) return [];
    const bookings = await this.prisma.booking.findMany({
      where: { proId: sp.proId, userId: { not: null } },
      select: { userId: true },
    });
    const ids = [...new Set(bookings.map((b) => b.userId).filter((x): x is string => !!x))];
    if (ids.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids }, birthDate: { not: null } },
      select: { id: true, name: true, birthDate: true },
    });
    const now = new Date(Date.now() + 5 * 60 * 60 * 1000); // Almatı günü
    const m = now.getUTCMonth();
    const d = now.getUTCDate();
    return users
      .filter((u) => u.birthDate!.getUTCMonth() === m && u.birthDate!.getUTCDate() === d)
      .map((u) => ({ id: u.id, name: u.name }));
  }

  // §9.5 — KAYITLI bağımsız uzman sonradan salona katılır (kod ile). Business.professionalId
  // bağı kurulur; salon uzmanı kadrosunda görür (§10.1). Zaten salondaysa reddedilir.
  async joinBusinessByCode(userId: string, code: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    if (!sp)
      throw new BadRequestException({ code: 'NOT_SPECIALIST', message: 'Uzman kaydı bulunamadı' });
    if (sp.businessId)
      throw new BadRequestException({
        code: 'ALREADY_IN_BUSINESS',
        message: 'Zaten bir salona bağlısın',
      });
    const c = await this.prisma.businessInviteCode.findUnique({ where: { code: code.trim() } });
    if (!c || c.status !== 'active') {
      if (c)
        await this.prisma.businessInviteCode.update({
          where: { id: c.id },
          data: { attempts: { increment: 1 } },
        });
      throw new BadRequestException({
        code: 'INVALID_CODE',
        message: 'Kod geçersiz ya da kullanılmış',
      });
    }
    await this.prisma.$transaction([
      this.prisma.specialist.update({
        where: { userId },
        data: { businessId: c.businessId, kind: 'salon_bound' },
      }),
      this.prisma.businessInviteCode.update({ where: { id: c.id }, data: { status: 'used' } }),
    ]);
    const biz = await this.prisma.business.findUnique({ where: { id: c.businessId } });
    // Salona bildirim (yeni kadro üyesi)
    if (biz?.ownerUserId)
      void this.push
        .sendToUser(biz.ownerUserId, {
          title: 'Yeni kadro üyesi',
          body: 'Bir uzman salonuna katıldı',
          data: { route: '/salon/staff' },
        })
        .catch(() => undefined);
    return { ok: true, businessName: biz?.name ?? '' };
  }

  // §6.1 — uzman galerisi (portfolyo): hesap verisi; public profil de bundan beslenir
  async myPortfolio(expertUserId: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId: expertUserId } });
    if (!sp?.proId) return { photos: [] };
    const pro = await this.prisma.professional.findUnique({ where: { id: sp.proId } });
    return { photos: pro?.portfolio ?? [] };
  }

  async setMyPortfolio(expertUserId: string, photos: string[]) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId: expertUserId } });
    if (!sp?.proId) return { photos: [] };
    const pro = await this.prisma.professional.update({
      where: { id: sp.proId },
      data: { portfolio: photos.slice(0, 20) },
    });
    return { photos: pro.portfolio };
  }

  // §11 — hesabın katalog karşılığı: uzman (Specialist.proId) ya da salon (Business.professionalId)
  private async proIdFor(userId: string): Promise<string | null> {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    if (sp?.proId) return sp.proId;
    const biz = await this.prisma.business.findFirst({ where: { ownerUserId: userId } });
    return biz?.professionalId ?? null;
  }

  // §11 — Platinum promosyonları: profil sayfasında yayınlanır (Keşfet vitrini DEĞİL — o admin'in)
  async myPromotions(userId: string) {
    const proId = await this.proIdFor(userId);
    if (!proId) return { promotions: [] };
    const pro = await this.prisma.professional.findUnique({ where: { id: proId } });
    return { promotions: safeParse(pro?.promoJson) };
  }

  async setMyPromotions(userId: string, promotions: unknown[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.membershipTier !== 'platinum') {
      throw new ForbiddenException({
        code: 'PLATINUM_REQUIRED',
        message: 'Promosyon oluşturma yalnız Platinum üyelikte',
      });
    }
    const proId = await this.proIdFor(userId);
    if (!proId) return { promotions: [] };
    const pro = await this.prisma.professional.update({
      where: { id: proId },
      data: { promoJson: JSON.stringify(promotions.slice(0, 10)) },
    });
    return { promotions: safeParse(pro.promoJson) };
  }

  // §9.5 — uzmanın hizmet/fiyat listesi + çalışma saatleri HESAPTA (public profil bunlardan beslenir)
  async myServices(userId: string) {
    const proId = await this.proIdFor(userId);
    if (!proId) return { services: [] };
    const pro = await this.prisma.professional.findUnique({ where: { id: proId } });
    return { services: safeParse(pro?.servicesJson) };
  }

  async setMyServices(userId: string, services: unknown[]) {
    const proId = await this.proIdFor(userId);
    if (!proId) return { services: [] };
    const kesilmis = services.slice(0, 60);
    // Alan seti hizmet listesiyle BİRLİKTE güncellenir. Ayrı tutulsaydı,
    // uzman tırnak hizmetlerini silince tırnak aramasında görünmeye devam
    // ederdi (ya da tersi: yeni alan eklese aramada hiç çıkmazdı).
    const sectors = sectorsFromServiceIds(kesilmis.map((x) => (x as { id?: unknown })?.id));
    const pro = await this.prisma.professional.update({
      where: { id: proId },
      data: {
        servicesJson: JSON.stringify(kesilmis),
        ...(sectors.length ? { sectors } : {}),
      },
    });
    return { services: safeParse(pro.servicesJson) };
  }

  // Faz 4 (§15) — salon-takvim yetki modu: UZMAN seçer; değişiklik salona bildirilir + audit
  async getCalendarPermission(userId: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    return { mode: sp?.calendarPermission ?? 'create_requires_approval' };
  }

  async setCalendarPermission(userId: string, mode: string) {
    const allowed = ['view_availability_only', 'create_requires_approval', 'manage_calendar'];
    if (!allowed.includes(mode)) {
      throw new BadRequestException({ code: 'INVALID_MODE', message: 'Geçersiz yetki modu' });
    }
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    if (!sp) throw new NotFoundException({ code: 'SPECIALIST_NOT_FOUND', message: 'Uzman yok' });
    await this.prisma.specialist.update({
      where: { id: sp.id },
      data: { calendarPermission: mode as never },
    });
    await this.prisma.auditLog
      .create({
        data: {
          action: 'specialist.calendar_permission',
          resourceType: 'specialist',
          resourceId: sp.id,
          actorId: userId,
          actorRole: 'professional',
          safeDiff: { mode },
        },
      })
      .catch(() => undefined);
    // İki tarafa bildirim: salona push (uzmanın adı + yeni mod)
    if (sp.businessId) {
      const biz = await this.prisma.business.findUnique({ where: { id: sp.businessId } });
      if (biz?.ownerUserId) {
        void this.push
          .sendToUser(biz.ownerUserId, {
            title: 'Takvim yetkisi güncellendi',
            body: `${(await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name ?? 'Uzman'} salon-takvim iznini değiştirdi.`,
            data: { route: '/salon/staff' },
          })
          .catch(() => undefined);
      }
    }
    return { mode };
  }

  async myHours(userId: string) {
    const proId = await this.proIdFor(userId);
    if (!proId) return { hours: [] };
    const pro = await this.prisma.professional.findUnique({ where: { id: proId } });
    return { hours: safeParse(pro?.hoursJson) };
  }

  /**
   * §9.5 — çalışma saatleri. ADMIN ONAYINA GİTMEZ: uzmanın kendi takvimi.
   *
   * Ama kapatılan bir aralıkta ONAYLANMIŞ müşteri randevusu varsa sessizce
   * kaydedilmez: müşteri o saate göre plan yaptı. Çakışanlar yanıtla birlikte
   * döner; uzman uyarıyı görüp yine de devam etmeyi seçebilir (randevular
   * geçerli kalır — gelmemesi hâlinde §4.4-b "uzman gelmedi" cezası işler).
   */
  async setMyHours(userId: string, hours: unknown[]) {
    const proId = await this.proIdFor(userId);
    if (!proId) return { hours: [], conflicts: [] };
    const gunler = hours.slice(0, 7) as DayHours[];

    // Yalnız GELECEK ve slotu tutan randevular. Geçmişi uyarmak anlamsız.
    const simdi = new Date();
    const aktif = await this.prisma.booking.findMany({
      where: {
        proId,
        startAt: { gt: simdi },
        status: { in: SLOT_HOLDING_STATUSES },
      },
      select: { id: true, startAt: true, durationMin: true, customerName: true, dateLabel: true },
      take: 200,
    });

    const pencereler: BookingWindow[] = aktif
      .filter((b) => b.startAt != null)
      .map((b) => {
        // Almatı yerel gün/saati — sunucu UTC saklıyor, uzman yerel saate göre
        // çalışıyor. Ham UTC ile karşılaştırmak günü kaydırırdı.
        const yerel = new Date(b.startAt!.getTime() + ALMATY_OFFSET_MS);
        return {
          id: b.id,
          wd: yerel.getUTCDay(),
          startMin: yerel.getUTCHours() * 60 + yerel.getUTCMinutes(),
          durationMin: b.durationMin ?? 60,
        };
      });

    const cakisanlar = cakisanRandevular(gunler, pencereler);
    const detay = new Map(aktif.map((b) => [b.id, b]));

    const pro = await this.prisma.professional.update({
      where: { id: proId },
      data: { hoursJson: JSON.stringify(gunler) },
    });

    return {
      hours: safeParse(pro.hoursJson),
      // Müşteri ADI dönmez — uzman zaten randevu ekranında görüyor; burada
      // gereksiz PII taşımayız.
      conflicts: cakisanlar.map((c) => ({
        id: c.id,
        dateLabel: detay.get(c.id)?.dateLabel ?? '',
      })),
    };
  }

  async myClosedDays(userId: string) {
    const proId = await this.proIdFor(userId);
    if (!proId) return { days: [] };
    const pro = await this.prisma.professional.findUnique({ where: { id: proId } });
    return { days: safeParse(pro?.closedDaysJson) };
  }

  async setMyClosedDays(userId: string, days: unknown[]) {
    const proId = await this.proIdFor(userId);
    if (!proId) return { days: [] };
    const pro = await this.prisma.professional.update({
      where: { id: proId },
      data: {
        closedDaysJson: JSON.stringify(days.filter((x) => typeof x === 'number').slice(0, 120)),
      },
    });
    return { days: safeParse(pro.closedDaysJson) };
  }

  async setCertificates(userId: string, certificates: string[]) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    if (!sp) return { certificates: [] };
    const stored = await this.storage.putMany(certificates, 'certificates');
    const row = await this.prisma.specialist.update({
      where: { userId },
      data: { certificates: stored },
    });
    return { certificates: row.certificates };
  }

  // §uzman onboarding Faz 4 — Instagram sahiplik doğrulama: kullanıcı adı → AYN-XXXX kodu.
  // Uzman bunu bio'suna ekler; admin kontrol edip social rozetini işaretler (salon paralel).
  async setSocialVerifyCode(userId: string, username: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    if (!sp) throw new BadRequestException({ code: 'NOT_SPECIALIST', message: 'Uzman kaydı yok' });
    const handle = username.trim().replace(/^@/, '').slice(0, 40);
    if (!handle)
      throw new BadRequestException({
        code: 'USERNAME_REQUIRED',
        message: 'Kullanıcı adı gerekli',
      });
    const code = `AYN-${randomCode(4)}`;
    const updated = await this.prisma.specialist.update({
      where: { userId },
      data: {
        socialInstagram: handle,
        socialVerifyCode: code,
        socialVerified: false, // yeni kod → doğrulama sıfırlanır, admin yeniden onaylar
      },
    });
    return { username: updated.socialInstagram, code: updated.socialVerifyCode };
  }

  // §uzman onboarding — uzmanın kendi doğrulama durumu (panel/profil için)
  async myVerification(userId: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { kycStatus: true },
    });
    const identity = user?.kycStatus === 'approved';
    const cert = sp?.certVerified ?? false;
    const social = sp?.socialVerified ?? false;
    // `business` HESAPLANIYOR ama rozete katılmıyordu — kayıtlı ИП uzman
    // müşteri profilinde rozetini görürken bu ekranda "Henüz AYNA Onaylı
    // değilsin" okuyordu. Kural artık katalogla aynı kaynaktan.
    const business = uzmanKayitli(sp?.entityType, sp?.iin);
    return {
      verification: { identity, cert, social, business },
      aynaVerified: aynaOnayli(
        'expert',
        {
          identity,
          cert,
          social,
          business,
          bin: false,
          address: false,
        },
        business,
      ),
      entityType: sp?.entityType ?? 'freelance',
      hasIin: /^\d{12}$/.test(sp?.iin ?? ''),
      socialInstagram: sp?.socialInstagram ?? '',
      socialVerifyCode: sp?.socialVerifyCode ?? '',
      kycStatus: user?.kycStatus ?? 'none',
    };
  }

  // §CRM — kutlama: müşteriye push doğum günü mesajı (uzman adına)
  async celebrate(expertUserId: string, customerId: string) {
    const expert = await this.prisma.user.findUnique({
      where: { id: expertUserId },
      select: { name: true },
    });
    void this.push.sendToUser(customerId, {
      title: 'İyi ki doğdun! 🎂',
      body: `${expert?.name ?? 'Uzmanın'} doğum gününü kutluyor — nice mutlu, güzel yıllara! ✨`,
      data: { route: '/notifications' },
    });
    return { ok: true };
  }
}

function mapSpecialist(s: Specialist) {
  return {
    id: s.id,
    kind: s.kind,
    businessId: s.businessId ?? undefined,
    bio: s.bio,
    featured: s.featured,
    entityType: s.entityType,
    // IIN public'te ASLA açık dönmez — yalnız varlık bilgisi
    hasIin: /^\d{12}$/.test(s.iin),
  };
}

function safeParse(raw?: string): unknown[] {
  try {
    const arr = JSON.parse(raw ?? '[]') as unknown;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
