import { grantPoints } from '../loyalty/loyalty.grant';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import type { Env } from '@ayna/config/env';
import { ENV } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { SmsService } from '../sms/sms.service';
import {
  decryptField,
  encryptField,
  generateOtp,
  hashOtp,
  hashPassword,
  normalizePhone,
  phoneHash,
  signJwt,
  verifyPassword,
} from '../common/crypto';
import type { LoginInput, RegisterInput } from './auth.dto';

// §4.6 OTP politikası
const OTP_TTL_SEC = 300; // 5 dk geçerli
const OTP_MAX_ATTEMPTS = 5; // kod başına yanlış deneme
const OTP_RESEND_COOLDOWN_SEC = 30; // yeni kod isteme aralığı
/** Kayıt, bu süre içinde yapılmış bir doğrulamayı devralır. */
const KAYIT_DOGRULAMA_PENCERESI_SEC = 30 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly sms: SmsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /**
   * TELEFON / E-POSTA MÜSAİT Mİ — kayıt SIRASINDA sorulan hafif kontrol.
   *
   * Kurucu: "kayıt işleminde ekran geçişi olmadan önce eğer girilen
   * bilgilerde (mesela eksik bilgi ya da daha önce kayıtlı numara gibi)
   * hata varsa o anda hata gösterilmeli."
   *
   * Çakışma yalnız `register`da anlaşılıyordu: kullanıcı beş adımı
   * doldurup en sonda "bu telefon zaten kayıtlı" duvarına çarpıyor ve
   * baştan başlıyordu.
   *
   * ── NE SIZDIRIYOR, NE SIZDIRMIYOR ──────────────────────────────────
   *
   * Cevap yalnız "müsait mi" — hesap adı, rolü, ne zaman açıldığı gibi
   * hiçbir bilgi dönmüyor. Numaranın kayıtlı olup olmadığı zaten kayıt
   * denemesiyle de öğrenilebilen bir bilgi; burada erken söylemek yeni
   * bir sızıntı açmıyor. Uç yine de HIZ SINIRLI (bkz. controller):
   * numara taramasına açık bırakılmıyor.
   */
  async musaitMi(input: { phone?: string | undefined; email?: string | undefined }): Promise<{
    phoneTaken: boolean;
    emailTaken: boolean;
  }> {
    const key = this.env.FIELD_ENCRYPTION_KEY;
    let phoneTaken = false;
    let emailTaken = false;
    const tel = input.phone?.trim();
    if (tel && tel.length >= 7) {
      const v = await this.prisma.user.findUnique({
        where: { phoneHash: phoneHash(tel, key) },
        select: { status: true },
      });
      // Silinmiş hesap telefonu SERBEST bırakıyor — `register` de öyle
      // davranıyor. Burada "dolu" deseydik kullanıcı aslında kayıt
      // olabileceği numarayla engellenirdi.
      phoneTaken = !!v && v.status !== 'deleted';
    }
    const eposta = input.email?.trim().toLowerCase();
    if (eposta && eposta.includes('@')) {
      const v = await this.prisma.user.findUnique({
        where: { email: eposta },
        select: { status: true },
      });
      emailTaken = !!v && v.status !== 'deleted';
    }
    return { phoneTaken, emailTaken };
  }

  async register(input: RegisterInput) {
    const key = this.env.FIELD_ENCRYPTION_KEY;
    const ph = phoneHash(input.phone, key);
    const existing = await this.prisma.user.findUnique({ where: { phoneHash: ph } });
    if (existing) {
      // Silinmiş hesap telefonu SERBEST bırakır (yeniden kayıt olabilsin); değilse çakışma.
      if (existing.status === 'deleted') {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { phoneHash: `deleted:${existing.id}`, email: null },
        });
      } else {
        throw new ConflictException({ code: 'PHONE_TAKEN', message: 'Bu telefon zaten kayıtlı' });
      }
    }
    if (input.email) {
      const byEmail = await this.prisma.user.findUnique({ where: { email: input.email } });
      if (byEmail) {
        if (byEmail.status === 'deleted') {
          await this.prisma.user.update({ where: { id: byEmail.id }, data: { email: null } });
        } else {
          throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Bu e-posta zaten kayıtlı' });
        }
      }
    }
    const avatarUrl = await this.storage.put(input.photoDataUrl ?? null, 'avatars/reg');
    /*
     * KAYIT ÖNCESİ DOĞRULAMA DEVRALINIYOR.
     *
     * Akış: kullanıcı numarasını OTP ile doğruluyor, SONRA hesabı
     * oluşturuluyor. Doğrulama anında hesap HENÜZ YOK, bu yüzden
     * `verifyOtp`in `updateMany`i hiçbir satırı güncelleyemiyordu ve
     * doğrulama kayboluyordu — canlıda 97 kullanıcının 96'sı
     * "doğrulanmamış" görünüyordu, oysa hepsi kayıt olurken doğrulamıştı.
     *
     * Tüketilmiş (yani BAŞARIYLA doğrulanmış) ve TAZE bir kod varsa yeni
     * hesap doğrulanmış başlıyor. Süre sınırı var: aylar önceki bir
     * doğrulamayı bugünkü kayda saymak, kanıtı olmayan bir şeyi kanıtlı
     * göstermek olurdu.
     */
    const dogrulanmis = await this.prisma.otpCode.findFirst({
      where: {
        phoneHash: ph,
        consumedAt: { gt: new Date(Date.now() - KAYIT_DOGRULAMA_PENCERESI_SEC * 1000) },
      },
    });

    const user = await this.prisma.user.create({
      data: {
        phoneHash: ph,
        phoneEnc: Uint8Array.from(encryptField(normalizePhone(input.phone), key)),
        passwordHash: hashPassword(input.password),
        name: input.name,
        defaultLocale: 'tr',
        gender: input.gender ?? 'unspecified',
        // Kayıt öncesi doğrulanmışsa hesap doğrulanmış başlıyor.
        ...(dogrulanmis ? { phoneVerified: true } : {}),
        ...(input.email ? { email: input.email } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(input.birthDateMs ? { birthDate: new Date(input.birthDateMs) } : {}),
        ...(input.city ? { city: input.city } : {}),
      },
    });
    /*
     * ── HOŞ GELDİN BONUSU DOĞRULAMADAN SONRA ──────────────────────────
     *
     * Kurucu: "ilk açılış hediye puanı da bu doğrulamalardan sonra
     * (admin onayı ya da telefon doğrulama) müşteri hanesine işlenir."
     *
     * Bonus KAYIT ANINDA yazılıyordu: doğrulanmamış bir numarayla açılan
     * her hesap 200 puan kazanıyordu. Aynı kişi numarayı doğrulamadan
     * defalarca hesap açıp puan biriktirebilirdi.
     *
     * Kayıt öncesi numarasını zaten doğrulamış olan (`dogrulanmis`)
     * kullanıcı bonusu HEMEN alıyor — beklemesi için bir sebep yok.
     * Diğerleri doğruladıkları anda (`verifyOtp`) alıyor.
     */
    if (dogrulanmis) await this.hosGeldinBonusu(user.id);
    return this.session(user);
  }

  /**
   * HOŞ GELDİN BONUSU — ömürde BİR KEZ.
   *
   * Defterde aynı sebeple bir satır varsa yeniden yazmıyor: kullanıcı
   * numarasını her yeniden doğruladığında 200 puan daha kazanamaz.
   */
  private async hosGeldinBonusu(userId: string): Promise<void> {
    const varMi = await this.prisma.loyaltyEntry.findFirst({
      where: { userId, reason: 'rewards.earn.welcome' },
      select: { id: true },
    });
    if (varMi) return;
    await grantPoints(this.prisma, { userId, reason: 'rewards.earn.welcome', points: 200 });
  }

  async login(input: LoginInput) {
    const key = this.env.FIELD_ENCRYPTION_KEY;
    // 'admin' takma adı → yönetici e-postası (panel girişi kısayolu)
    const ident =
      input.identifier.trim().toLowerCase() === 'admin' ? 'admin@ayna.salon' : input.identifier;
    const user = ident.includes('@')
      ? await this.prisma.user.findUnique({ where: { email: ident } })
      : await this.prisma.user.findUnique({
          where: { phoneHash: phoneHash(ident, key) },
        });
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException({ code: 'BAD_CREDENTIALS', message: 'Bilgiler hatalı' });
    }
    // Silinmiş hesap giriş yapamaz (kimlik ifşası olmasın diye BAD_CREDENTIALS ile aynı);
    // askıya alınmış hesap ayrı sinyalle bilgilendirilir.
    if (user.status === 'deleted') {
      throw new UnauthorizedException({ code: 'BAD_CREDENTIALS', message: 'Bilgiler hatalı' });
    }
    if (user.status === 'suspended') {
      throw new UnauthorizedException({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Hesap askıya alındı',
      });
    }
    // §3.2 — İşletme admin onayı olmadan giriş yapamaz
    if (user.role === 'salon') {
      const business = await this.prisma.business.findFirst({ where: { ownerUserId: user.id } });
      if (business && business.status !== 'approved') {
        throw new UnauthorizedException({
          code: business.status === 'pending' ? 'BUSINESS_PENDING' : 'BUSINESS_REJECTED',
          message:
            business.status === 'pending'
              ? 'İşletme hesabınız admin onayı bekliyor'
              : `İşletme kaydı reddedildi: ${business.rejectReason ?? ''}`,
        });
      }
    }
    return this.session(user);
  }

  // Profil fotoğrafı güncelle (data URL) — profil düzenle ekranından
  async setAvatar(userId: string, photoDataUrl: string | null) {
    const url = await this.storage.put(photoDataUrl, `avatars/${userId}`);
    const u = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: url },
    });
    return this.safe(u);
  }

  // §5.1.1 — kesik portreyi hesaba yaz (bir kez üretilir, hep hesapla gezer)
  // §5.6 — favoriler + adresler hesapta yaşar (cihaz/yeniden giriş kaybetmez)
  /**
   * §4 — müşteri kendi adını/şehrini günceller.
   *
   * Böyle bir uç YOKTU: mobil `updateMyProfile` yalnız yerel store'u
   * güncelliyordu. Kullanıcı adını değiştiriyor, kaydediyor, uygulamayı
   * yeniden açtığında SUNUCUDAKİ ESKİ AD geri geliyordu — düzenleme
   * kaybolmuş gibi görünüyordu.
   */
  async updateProfile(userId: string, patch: { name?: string; city?: string }) {
    const data: { name?: string; city?: string } = {};
    // Boş ada izin verilmez: Keşfet ve randevu kartları isimle çiziliyor.
    const name = patch.name?.trim();
    if (name) data.name = name.slice(0, 80);
    const city = patch.city?.trim();
    if (city !== undefined) data.city = city.slice(0, 60);
    if (Object.keys(data).length === 0) return this.me(userId);

    const updated = await this.prisma.user.update({ where: { id: userId }, data });
    await this.prisma.auditLog
      .create({
        data: {
          actorId: userId,
          actorRole: 'user',
          action: 'profile.update',
          resourceType: 'user',
          resourceId: userId,
          // PII yazılmaz — yalnız HANGİ alanların değiştiği.
          safeDiff: { fields: Object.keys(data) },
        },
      })
      .catch(() => undefined);
    return this.safe(updated);
  }

  async setPrefs(
    userId: string,
    prefs: { favorites?: string[]; addresses?: unknown[]; locale?: string },
  ) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    let cur: Record<string, unknown> = {};
    try {
      cur = JSON.parse(u?.prefsJson ?? '{}') as Record<string, unknown>;
    } catch {
      cur = {};
    }
    if (prefs.favorites) cur.favorites = prefs.favorites.slice(0, 200);
    if (prefs.addresses) cur.addresses = prefs.addresses.slice(0, 20);
    // Faz 6 (§29) — push yerelleştirme: dil tercihi kolonda (sunucu bildirim üretiminde kullanır)
    const locale = ['tr', 'kk', 'ru'].includes(prefs.locale ?? '') ? prefs.locale : undefined;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { prefsJson: JSON.stringify(cur), ...(locale ? { defaultLocale: locale } : {}) },
    });
    return this.safe(updated);
  }

  async setCutout(userId: string, cutoutDataUrl: string | null) {
    const url = await this.storage.put(cutoutDataUrl, `cutouts/${userId}`);
    const u = await this.prisma.user.update({
      where: { id: userId },
      data: { cutoutUrl: url },
    });
    return this.safe(u);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException({ code: 'NO_USER', message: 'Kullanıcı yok' });
    return this.safe(user);
  }

  // §4.6 — OTP iste. Kod düz metin saklanmaz (HMAC); SMS ile GERÇEKTEN gider.
  async requestOtp(phone: string, locale?: string) {
    const key = this.env.FIELD_ENCRYPTION_KEY;
    const ph = phoneHash(phone, key);

    // Yeniden gönderim soğuma süresi (spam önleme)
    const last = await this.prisma.otpCode.findFirst({
      where: { phoneHash: ph },
      orderBy: { createdAt: 'desc' },
    });
    if (last) {
      const ageSec = (Date.now() - last.createdAt.getTime()) / 1000;
      if (ageSec < OTP_RESEND_COOLDOWN_SEC) {
        throw new HttpException(
          { code: 'OTP_RATE_LIMIT', message: 'Çok sık kod istendi, biraz bekle' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Önceki kullanılmamış kodları geçersiz kıl (tek aktif kod)
    await this.prisma.otpCode.updateMany({
      where: { phoneHash: ph, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const code = generateOtp();
    const kayit = await this.prisma.otpCode.create({
      data: {
        phoneHash: ph,
        codeHash: hashOtp(code, key),
        expiresAt: new Date(Date.now() + OTP_TTL_SEC * 1000),
      },
    });

    await this.audit.record({ action: 'otp.request', resourceType: 'otp' });

    /*
     * ── GÖNDERİM: "sent" ARTIK GERÇEĞİ ANLATIYOR ────────────────────────
     *
     * Burası eskiden hiçbir şey göndermeden `{sent: true}` diyordu. Mock'ta
     * zararsızdı; gerçek sağlayıcı bağlanınca YALAN olurdu — bakiye
     * bittiğinde kullanıcı hiç gelmeyecek bir kodu bekler, kimse sebebini
     * bilmezdi.
     *
     * Kurucu: "sistem hiçbir şeyi kendiliğinden uydurmamalı."
     *
     * KOD SİLİNİYOR: gönderim düşerse üretilen kayıt kalmıyor. İki sebep —
     * (1) kimseye ulaşmamış bir kod veritabanında durmamalı, (2) daha
     * önemlisi SOĞUMA SÜRESİ "son kayıt"a bakıyor; kayıt kalsaydı kullanıcı
     * BİZİM hatamız yüzünden 30 saniye kilitlenirdi. Şimdi hemen yeniden
     * deneyebiliyor.
     */
    const gonderim = await this.sms.kodGonder(phone, code, locale ?? 'tr');
    if (!gonderim.gonderildi) {
      await this.prisma.otpCode.delete({ where: { id: kayit.id } }).catch(() => undefined);
      throw new HttpException(
        { code: 'SMS_SEND_FAILED', message: 'Kod gönderilemedi, birazdan tekrar dene' },
        HttpStatus.BAD_GATEWAY,
      );
    }
    // GÜVENLİK (P0): OTP kodu yanıtta/logda YALNIZ açık bayrakla döner (varsayılan KAPALI).
    // Eski davranış (mock modda herkese devCode) üretimde HESAP ELE GEÇİRME açığıydı:
    // herhangi bir telefonun sıfırlama kodu response'tan okunabiliyordu.
    const debugCodes = this.env.SMS_PROVIDER === 'mock' && this.env.OTP_DEBUG_CODES;
    if (debugCodes) {
      // eslint-disable-next-line no-console
      console.log(`[mock-sms] OTP kodu: ${code}`);
    }
    return {
      sent: true,
      expiresInSec: OTP_TTL_SEC,
      ...(debugCodes ? { devCode: code } : {}),
    };
  }

  // §4.6 — OTP doğrula. Süre + deneme limiti; başarıda kullanıcı phoneVerified olur.
  async verifyOtp(phone: string, code: string) {
    const key = this.env.FIELD_ENCRYPTION_KEY;
    const ph = phoneHash(phone, key);

    const otp = await this.prisma.otpCode.findFirst({
      where: { phoneHash: ph, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) {
      throw new BadRequestException({
        code: 'OTP_INVALID',
        message: 'Kod geçersiz veya süresi doldu',
      });
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException({ code: 'OTP_INVALID', message: 'Çok fazla yanlış deneme' });
    }
    if (otp.codeHash !== hashOtp(code, key)) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException({
        code: 'OTP_INVALID',
        message: 'Kod geçersiz veya süresi doldu',
      });
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });
    // Kayıtlı kullanıcı varsa telefonunu doğrulanmış işaretle
    const updated = await this.prisma.user.updateMany({
      where: { phoneHash: ph },
      data: { phoneVerified: true },
    });
    /*
     * DOĞRULAMA TAMAMLANDI → hoş geldin bonusu şimdi işleniyor.
     * Kayıt anında verilseydi doğrulanmamış numaralarla açılan hesaplar
     * puan biriktirirdi.
     */
    if (updated.count > 0) {
      const kisi = await this.prisma.user.findUnique({
        where: { phoneHash: ph },
        select: { id: true },
      });
      if (kisi) await this.hosGeldinBonusu(kisi.id);
    }
    await this.audit.record({ action: 'otp.verify', resourceType: 'otp' });
    return { verified: true, phoneVerified: updated.count > 0 };
  }

  // §3.3 — Şifre sıfırlama. Mobil akış: otp/request → otp/verify (kodu TÜKETİR) →
  // reset-password AYNI kodla gelir. Bu yüzden eşleşen kod, tüketilmişse de son 10 dk
  // içinde tüketildiyse kabul edilir (tek pencere; kod yeniden kullanılamaz hale gelir).
  async resetPassword(phone: string, code: string, newPassword: string) {
    const key = this.env.FIELD_ENCRYPTION_KEY;
    const ph = phoneHash(phone, key);
    const codeHash = hashOtp(code, key);

    const recentWindow = new Date(Date.now() - 10 * 60 * 1000);
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        phoneHash: ph,
        codeHash,
        // attempts MAX'a çekilerek tüketildiği için aynı kodla 2. sıfırlama da engellenir
        attempts: { lt: OTP_MAX_ATTEMPTS },
        OR: [
          { consumedAt: null, expiresAt: { gt: new Date() } },
          { consumedAt: { gt: recentWindow } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) {
      throw new BadRequestException({
        code: 'OTP_INVALID',
        message: 'Kod geçersiz veya süresi doldu',
      });
    }

    const user = await this.prisma.user.findUnique({ where: { phoneHash: ph } });
    if (!user || user.status === 'deleted') {
      throw new BadRequestException({
        code: 'PHONE_NOT_FOUND',
        message: 'Bu telefonla kayıtlı hesap bulunamadı',
      });
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(newPassword), phoneVerified: true },
      }),
      // Kod bu işlemle kesin tüketilir; aynı kodla ikinci sıfırlama yapılamaz
      this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { consumedAt: otp.consumedAt ?? new Date(), attempts: OTP_MAX_ATTEMPTS },
      }),
    ]);
    await this.audit.record({
      action: 'auth.password_reset',
      resourceType: 'user',
      resourceId: user.id,
    });
    return { ok: true };
  }

  private session(user: User) {
    // Mobilde token YENİLEME akışı yok → kısa TTL (env'de 900=15dk) giriş sonrası tüm işlemleri
    // UNAUTHENTICATED'e düşürüyordu. En az 30 gün garanti et (Railway env override edemesin).
    const ttl = Math.max(this.env.JWT_ACCESS_TTL, 30 * 24 * 60 * 60);
    const token = signJwt({ sub: user.id, role: user.role }, this.env.JWT_ACCESS_SECRET, ttl);
    return { token, user: this.safe(user) };
  }

  private safe(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email ?? undefined,
      city: user.city ?? undefined,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null, // profil foto (data URL) — tüm cihazlarda aynı
      cutoutUrl: user.cutoutUrl ?? null, // kesik portre — girişte geri yüklenir (kredi yakmadan)
      phoneVerified: user.phoneVerified,
      // Randevu kapısı: doğrulama YA DA yönetici onayı.
      adminApproved: user.adminApproved,
      gender: user.gender,
      /*
       * ÜYELİK BAŞLANGICI — pasaportta gösteriliyor.
       *
       * Ekranda sabit `2024` yazıyordu: hesabı ne zaman açtığından
       * bağımsız, herkese aynı yıl. Kullanıcı kendi hesabı hakkında
       * YANLIŞ bir bilgi okuyordu.
       */
      memberSince: user.createdAt.toISOString(),
      // §11 — üyelik katmanı + bitiş (mobil premium/platinum bunu okur; admin onayıyla set edilir)
      membershipTier: user.membershipTier,
      membershipUntil: user.membershipUntil ? user.membershipUntil.toISOString() : null,
      // §5.6 — favoriler + adresler (hesap verisi; mobil açılışta bunlarla eşitler)
      prefs: parsePrefs(user.prefsJson),
      // EK Z.3 — ağır KYC durumu (none|pending|approved|rejected); "doğrulanmış uzman" rozeti
      kycStatus: user.kycStatus,
      // women-only: kadın olarak kayıtlı doğrulanmış üye
      womenVerified: user.gender === 'female',
      // §12.3 — kısıtlı mod (admin ceza takip); app yeni talep oluşturmayı engeller
      restricted: !!user.restrictedAt,
      // 7 gün penceresinde kalan gün (0 = süre doldu / kısıt yok) — kullanıcı bilgilendirme
      restrictedDaysLeft: user.restrictedAt
        ? Math.max(
            0,
            7 - Math.floor((Date.now() - user.restrictedAt.getTime()) / (24 * 60 * 60 * 1000)),
          )
        : 0,
      // Eski FIELD_ENCRYPTION_KEY ile şifrelenmiş telefon YENİ anahtarla çözülemez → çökme yerine boş.
      phone: this.safePhone(user.phoneEnc),
    };
  }

  private safePhone(enc: Uint8Array): string {
    try {
      return decryptField(Buffer.from(enc), this.env.FIELD_ENCRYPTION_KEY);
    } catch {
      return ''; // anahtar döndüyse eski kayıt çözülemez — uygulama çalışmaya devam eder
    }
  }
}

// prefsJson güvenli çözümü (bozuk veri oturum açmayı düşürmesin)
function parsePrefs(raw: string): { favorites: string[]; addresses: unknown[] } {
  try {
    const p = JSON.parse(raw) as { favorites?: unknown; addresses?: unknown };
    return {
      favorites: Array.isArray(p.favorites) ? (p.favorites as string[]) : [],
      addresses: Array.isArray(p.addresses) ? p.addresses : [],
    };
  } catch {
    return { favorites: [], addresses: [] };
  }
}
