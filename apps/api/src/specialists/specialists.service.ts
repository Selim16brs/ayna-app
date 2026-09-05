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
import { hizmetSatirininKimligi, sectorsFromServiceIds } from '@ayna/domain';
import { ReguleUyariService } from '../catalog/regule-uyari.service';
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
import { BasariService } from '../basari/basari.service';
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
    private readonly regule: ReguleUyariService,
    @Inject(ENV) private readonly env: Env,
    /*
     * Başarı hesabı ORTAK serviste. EN SONA eklendi: aradaki bir yere
     * koysaydım mevcut testlerin argüman sırası sessizce kayardı —
     * `regule` yerine `basari` geçirilir ve hata çok sonra çıkardı.
     */
    private readonly basari: BasariService,
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

    /*
     * ── HER UZMANIN KEŞİF KARTI VAR ────────────────────────────────────
     *
     * Kurucu: "uzman hizmetler eklediği halde müşteri tarafından uzman
     * profiline bakıldığında görünmüyor. haritada da çıkmıyor. yakınındaki
     * uzmanlar diye bir alan da olmalı."
     *
     * Kart YALNIZ bağımsız uzmana açılıyordu; salona bağlanan uzmanın
     * `proId`si null kalıyordu. Sonuçları zincirleme:
     *   · `setMyServices` sessizce boş dönüyordu — uzman hizmet ekliyor,
     *     kaydediliyor sanıyor, hiçbir yere yazılmıyordu.
     *   · Profili açılmıyordu (kart yok).
     *   · Haritada görünmüyordu (koordinat taşıyacak satır yok).
     *   · Yorumları ve başarı yüzdesi de bağlanamıyordu.
     *
     * Artık her uzmanın kendi kartı var. Salona bağlı uzman salonun
     * kadrosunda da görünmeye devam ediyor; harita zaten aynı adrestekileri
     * tek iğnede topluyor.
     */
    /*
     * Kayıt satırları da normalleşiyor: kataloğa bağlanmayan, adsız ya da
     * fiyatsız satır SAKLANMIYOR. Bağsız hizmet aramada ve arz hesabında
     * görünmez; uzman yazdığını sanır, müşteri hiç bulamaz.
     */
    const hizmetler = hizmetSatirlariniNormalle(input.services ?? []).slice(0, 60);
    {
      try {
        const pro = await this.prisma.professional.create({
          data: {
            name: input.name,
            /*
             * UZMANLIK ALANI OLARAK KENDİ ADI YAZILMIYOR.
             *
             * Canlıda görülen (05.09.2026): "Darina Serbu" adlı uzmanın
             * uzmanlık alanı da "Darina Serbu". Kartta ad iki kez, üstelik
             * uzmanlık diye. Biyografi yazmamış olmak bir uzmanlık üretmez;
             * boş bırakılıyor ve ekran kendi çevrilmiş yedeğine düşüyor.
             */
            specialty: (input.bio ?? '').slice(0, 60),
            sector: input.sector ?? 'hair',
            // Alan seti hizmet listesinden türetilir; boşsa ana alana düşülür
            // ki uzman en azından kendi ana alanında bulunabilsin.
            // Kimlik `@ayna/domain`den okunuyor — kayıt, güncelleme ve
            // "Yakında" hesabı üçü de aynı yerden. Elle `x.id` okunsaydı
            // biri değiştiğinde ötekiler sessizce ayrışırdı.
            sectors: sectorsFromServiceIds(hizmetler.map((x) => hizmetSatirininKimligi(x) ?? ''))
              .length
              ? sectorsFromServiceIds(hizmetler.map((x) => hizmetSatirininKimligi(x) ?? ''))
              : [input.sector ?? 'hair'],
            // §9.5 — kayıtta girilen gerçek hizmet/fiyat/süre listesi. Buraya
            // yazılmadığı için profil sektörün varsayılan menüsünü uyduruyordu.
            servicesJson: JSON.stringify(hizmetler),
            // Kart TÜRÜ her zaman bireysel: salona bağlı olmak, kişinin
            // kendisinin bir salon olduğu anlamına gelmiyor.
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
        // Brief §5 — kayıt anında da taranıyor. Yalnız "Hizmetlerim"
        // ekranında taransaydı, kayıtta regüle hizmet yazan ve bir daha
        // o ekrana girmeyen uzman hiç görünmezdi.
        await this.regule.tara(pro.id, hizmetler);
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
        .sendTemplate(biz.ownerUserId, 'staff.joined', undefined, { route: '/salon/staff' })
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

  /**
   * BAŞARI YÜZDESİ — uzman puan toplamıyor, başarıyla ölçülüyor.
   *
   * Hesap ORTAK SERVİSTE: müşterinin gördüğü listeyle AYNI kod yolu.
   * Burada ayrıca hesaplasaydım (ilk sürümde öyleydi) panel cevap
   * süresini ölçüp liste ölçmediği için aynı uzman iki farklı yüzde
   * gösterirdi.
   */
  /**
   * KONUM DURUMU — "haritada görünüyor muyum".
   *
   * Kurucu: uzman panelinde adres alanı ve haritada iğne olmalı. Ekran
   * VARDI (Menü → Konum) ama uzman oraya girmediği sürece haritada
   * görünmediğini HİÇ öğrenmiyordu: eksik bir şey olduğunu söyleyen bir
   * yer yoktu.
   *
   * Koordinat keşif kartında; performans yükünde döndürmek yerine ayrı
   * uç: kart okumasını her ekranda tekrarlamamak için.
   */
  async myLocation(userId: string) {
    const proId = await this.proIdFor(userId);
    if (!proId) return { hasLocation: false, address: '' };
    const p = await this.prisma.professional.findUnique({
      where: { id: proId },
      select: { lat: true, lng: true, district: true, city: true },
    });
    return {
      hasLocation: p?.lat != null && p?.lng != null,
      address: [p?.district, p?.city].filter(Boolean).join(' · '),
    };
  }

  async myPerformance(userId: string) {
    const proId = await this.proIdFor(userId);
    const sonuc = await this.basari.tek(proId);
    // Paylaşım tercihi de dönüyor: panel anahtarın durumunu göstersin.
    const pro = proId
      ? await this.prisma.professional.findUnique({
          where: { id: proId },
          select: { showSuccess: true },
        })
      : null;
    return { ...sonuc, showSuccess: pro?.showSuccess ?? true };
  }

  /**
   * Başarı yüzdesinin müşteriye gösterilip gösterilmeyeceği.
   *
   * Keşif KARTINDA tutuluyor: liste sorgusu zaten o satırı okuyor,
   * ayrı bir tabloya koysaydım her satır için ikinci bir okuma gerekirdi.
   */
  async setShowSuccess(userId: string, show: boolean) {
    const proId = await this.proIdFor(userId);
    if (!proId) return { showSuccess: show };
    const p = await this.prisma.professional.update({
      where: { id: proId },
      data: { showSuccess: show },
      select: { showSuccess: true },
    });
    return p;
  }

  /** Uzmanın kendi keşif kartının kimliği — "müşteri gözüyle gör" için. */
  async myProId(userId: string): Promise<{ proId: string | null }> {
    return { proId: (await this.proIdFor(userId)) ?? null };
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
    /*
     * ── PROMOSYON GÖRSELİ DEPOYA ───────────────────────────────────────
     *
     * Uygulama görseli `data:image/jpeg;base64,...` olarak gönderiyor.
     * Ham base64'ü `promo_json` içine yazmak satırı MEGABAYTLARA şişirir
     * ve o satır işletme profilinin HER okumasında taşınır: promosyonu
     * olan bir uzmanın profili herkese yavaş açılırdı.
     *
     * Görsel depoya taşınıp yerine adresi saklanıyor. Depo
     * yapılandırılmamışsa `put` geleni olduğu gibi döndürüyor ve akış
     * yine çalışıyor.
     */
    const temiz: unknown[] = [];
    for (const ham of promotions.slice(0, 10)) {
      if (typeof ham !== 'object' || ham === null) continue;
      const p = { ...(ham as Record<string, unknown>) };
      if (typeof p.imageUri === 'string' && p.imageUri.startsWith('data:')) {
        p.imageUri = (await this.storage.put(p.imageUri, 'promos')) ?? p.imageUri;
      }
      temiz.push(p);
    }
    const pro = await this.prisma.professional.update({
      where: { id: proId },
      data: { promoJson: JSON.stringify(temiz) },
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

  /**
   * KENDİ KONUMUNU HARİTADAN GÜNCELLER.
   *
   * Konum kayıtta zorunlu oldu ama MEVCUT kayıtlarda yok (canlıda 25/25
   * boş). Onların da düzeltebilmesi gerekiyor; aksi hâlde eski uzmanlar
   * "yakınımdakiler" sıralamasında sonsuza kadar dışarıda kalırdı.
   *
   * Admin onayı YOK: konum iletişim bilgisi değil (§profil-anında).
   */
  async setMyLocation(
    userId: string,
    konum: {
      lat: number;
      lng: number;
      address?: string | undefined;
      district?: string | undefined;
      city?: string | undefined;
    },
  ) {
    const proId = await this.proIdFor(userId);
    if (!proId) return { ok: false as const };
    const pro = await this.prisma.professional.update({
      where: { id: proId },
      data: {
        lat: konum.lat,
        lng: konum.lng,
        // Adres alanları yalnız DOLU gelirse yazılıyor: haritadan ters
        // geocode boş dönerse mevcut kaydı silmemeli.
        ...(konum.district?.trim() ? { district: konum.district.trim() } : {}),
        ...(konum.city?.trim() ? { city: konum.city.trim() } : {}),
      },
      select: { lat: true, lng: true, city: true, district: true },
    });
    await this.prisma.auditLog
      .create({
        data: {
          action: 'specialist.location',
          resourceType: 'professional',
          resourceId: proId,
          actorId: userId,
          actorRole: 'professional',
          safeDiff: { lat: konum.lat, lng: konum.lng },
        },
      })
      .catch(() => undefined);
    return { ok: true as const, ...pro };
  }

  async setMyServices(userId: string, services: unknown[]) {
    const proId = await this.proIdFor(userId);
    /*
     * ── SESSİZ BAŞARISIZLIK YOK ────────────────────────────────────────
     *
     * Burası `{ services: [] }` dönüyordu: keşif kartı olmayan uzman
     * hizmetlerini kaydediyor, ekran "kaydedildi" diyor ve hiçbir yere
     * yazılmıyordu. Kurucu bunu "hizmet ekliyorum ama müşteri görmüyor"
     * diye bildirdi — hata aylarca sessizdi.
     *
     * Artık açık bir hata: uygulama kullanıcıya söyleyebiliyor, ve
     * kaydın neden eksik olduğu kayıtlarda görünüyor.
     */
    if (!proId) {
      throw new NotFoundException({
        code: 'NO_DISCOVERY_CARD',
        message: 'Keşif kaydın yok — hizmetler kaydedilemedi',
      });
    }
    const kesilmis = hizmetSatirlariniNormalle(services).slice(0, 60);
    // Alan seti hizmet listesiyle BİRLİKTE güncellenir. Ayrı tutulsaydı,
    // uzman tırnak hizmetlerini silince tırnak aramasında görünmeye devam
    // ederdi (ya da tersi: yeni alan eklese aramada hiç çıkmazdı).
    /*
     * Alan seti de kimliği AYNI yerden okuyor. Burada `x.id` elle
     * okunuyordu; "Yakında" hesabı `serviceId` okuyordu ve ikisi sessizce
     * ayrışmıştı. Tek kaynak, ayrışacak bir şey bırakmıyor.
     */
    const sectors = sectorsFromServiceIds(kesilmis.map((x) => hizmetSatirininKimligi(x) ?? ''));
    /*
     * ANA ALAN, HİZMET VERİLEN ALANLARDAN BİRİ OLMAK ZORUNDA.
     *
     * `sectors` her hizmet güncellemesinde yeniden türetiliyordu ama tekil
     * `sector` sütunu kayıt anındaki değerde KALIYORDU. Canlıda görülen
     * (05.09.2026): sector "makeup", sectors ["hair","nails"] — uzman
     * makyaj yapmıyor, ama ana alanı makyaj görünüyor. Kartta uzmanlık
     * etiketi oradan okunduğu için müşteriye YANLIŞ ALAN yazılıyordu.
     *
     * Ana alan hâlâ hizmet verilen alanlardan biriyse dokunulmuyor —
     * uzmanın kendi seçimi korunur. Değilse ilk gerçek alana çekiliyor.
     */
    const mevcut = await this.prisma.professional.findUnique({
      where: { id: proId },
      select: { sector: true },
    });
    const anaAlanGecerli = !!mevcut?.sector && sectors.includes(mevcut.sector);
    const pro = await this.prisma.professional.update({
      where: { id: proId },
      data: {
        servicesJson: JSON.stringify(kesilmis),
        ...(sectors.length ? { sectors } : {}),
        ...(sectors.length && !anaAlanGecerli ? { sector: sectors[0]! } : {}),
      },
    });
    /*
     * Brief §5 — regüle hizmet taraması. Hizmet ZATEN kaydedildi; tarama
     * yalnız yöneticiye uyarı bırakıyor. Sırası önemli: kayıt önce,
     * tarama sonra. Tersi olsaydı tarama hatası kaydı düşürebilirdi.
     */
    await this.regule.tara(proId, kesilmis);
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
          .sendTemplate(biz.ownerUserId, 'calendar.permission_changed', undefined, {
            route: '/salon/staff',
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

  /**
   * SERTİFİKALARI OKU.
   *
   * Kurucu: kayıtta girilen bilgiler profilde görünmüyordu. Sertifikalar
   * bu sınıfın son örneğiydi: kayıtta gönderiliyor, veritabanına
   * yazılıyor ama GERİ OKUYACAK UÇ YOKTU — yalnız yazma vardı. Uzman
   * profilini açtığında sertifika alanını boş görüyor, hepsini yeniden
   * yüklemesi gerekiyordu.
   */
  async myCertificates(userId: string) {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    return { certificates: sp?.certificates ?? [] };
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
    void this.push.sendTemplate(
      customerId,
      'birthday',
      { pro: expert?.name?.trim() || 'AYNA' },
      { route: '/notifications' },
    );
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

/**
 * HİZMET SATIRLARINI NORMALLEŞTİRİR — brief §4.1.
 *
 * Brief: "Seçilen her alt hizmet altında uzman kendi hizmetlerini manuel
 * ekler: serbest ad + fiyat + süre." Bağ (`serviceId`) ZORUNLU.
 *
 * KATALOĞA BAĞLANMAYAN SATIR SAKLANMIYOR. Bağsız hizmet aramada, talep
 * eşleşmesinde ve "Yakında" hesabında görünmez: uzman yazdığını sanar,
 * müşteri hiç bulamaz. Sessizce kaydetmek, çalışmayan bir şeyi
 * çalışıyormuş gibi göstermek olurdu.
 *
 * Adsız ya da fiyatsız satır da atılıyor: müşteriye adsız bir hizmet ya
 * da 0 ₸ göstermek yarım bir kaydı gerçek bir teklif gibi sunmaktır.
 *
 * Kimlik `serviceId` alanında yazılıyor — eski kayıtlar `id`de taşıyordu
 * ve `hizmetSatirininKimligi` ikisini de okuyor.
 */
export function hizmetSatirlariniNormalle(
  ham: readonly unknown[],
): { serviceId: string; name: string; price: number; durationMin: number }[] {
  const out: { serviceId: string; name: string; price: number; durationMin: number }[] = [];
  for (const satir of ham) {
    const serviceId = hizmetSatirininKimligi(satir);
    if (!serviceId) continue;
    const r = satir as { name?: unknown; price?: unknown; durationMin?: unknown };
    const name = typeof r.name === 'string' ? r.name.trim().slice(0, 120) : '';
    const price = Number(r.price);
    const durationMin = Number(r.durationMin);
    if (!name || !Number.isFinite(price) || price <= 0) continue;
    out.push({
      serviceId,
      name,
      price: Math.round(price),
      // Süre eksikse hizmet düşürülmüyor: fiyat ve ad varsa teklif
      // gerçek. Randevu ekranının bir sayıya ihtiyacı var, 60 dk makul.
      durationMin: Number.isFinite(durationMin) && durationMin > 0 ? Math.round(durationMin) : 60,
    });
  }
  return out;
}

function safeParse(raw?: string): unknown[] {
  try {
    const arr = JSON.parse(raw ?? '[]') as unknown;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
