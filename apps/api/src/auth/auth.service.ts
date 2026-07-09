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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async register(input: RegisterInput) {
    const key = this.env.FIELD_ENCRYPTION_KEY;
    const ph = phoneHash(input.phone, key);
    const existing = await this.prisma.user.findUnique({ where: { phoneHash: ph } });
    if (existing) {
      throw new ConflictException({ code: 'PHONE_TAKEN', message: 'Bu telefon zaten kayıtlı' });
    }
    if (input.email) {
      const byEmail = await this.prisma.user.findUnique({ where: { email: input.email } });
      if (byEmail) {
        throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Bu e-posta zaten kayıtlı' });
      }
    }
    const avatarUrl = await this.storage.put(input.photoDataUrl ?? null, 'avatars/reg');
    const user = await this.prisma.user.create({
      data: {
        phoneHash: ph,
        phoneEnc: Uint8Array.from(encryptField(normalizePhone(input.phone), key)),
        passwordHash: hashPassword(input.password),
        name: input.name,
        defaultLocale: 'tr',
        gender: input.gender ?? 'unspecified',
        ...(input.email ? { email: input.email } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(input.birthDateMs ? { birthDate: new Date(input.birthDateMs) } : {}),
        ...(input.city ? { city: input.city } : {}),
      },
    });
    // Hoş geldin bonusu (sadakat defterine ilk kayıt)
    await this.prisma.loyaltyEntry.create({
      data: {
        userId: user.id,
        kind: 'earn',
        reason: 'rewards.earn.welcome',
        detail: '',
        points: 200,
      },
    });
    return this.session(user);
  }

  async login(input: LoginInput) {
    const key = this.env.FIELD_ENCRYPTION_KEY;
    // 'admin' takma adı → yönetici e-postası (panel girişi kısayolu)
    const ident =
      input.identifier.trim().toLowerCase() === 'admin' ? 'admin@ayna.kz' : input.identifier;
    const user = ident.includes('@')
      ? await this.prisma.user.findUnique({ where: { email: ident } })
      : await this.prisma.user.findUnique({
          where: { phoneHash: phoneHash(ident, key) },
        });
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException({ code: 'BAD_CREDENTIALS', message: 'Bilgiler hatalı' });
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
  async setPrefs(userId: string, prefs: { favorites?: string[]; addresses?: unknown[] }) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    let cur: Record<string, unknown> = {};
    try {
      cur = JSON.parse(u?.prefsJson ?? '{}') as Record<string, unknown>;
    } catch {
      cur = {};
    }
    if (prefs.favorites) cur.favorites = prefs.favorites.slice(0, 200);
    if (prefs.addresses) cur.addresses = prefs.addresses.slice(0, 20);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { prefsJson: JSON.stringify(cur) },
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

  // §4.6 — OTP iste. Kod düz metin saklanmaz (HMAC). Mock SMS ile "gönderilir".
  async requestOtp(phone: string) {
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
    await this.prisma.otpCode.create({
      data: {
        phoneHash: ph,
        codeHash: hashOtp(code, key),
        expiresAt: new Date(Date.now() + OTP_TTL_SEC * 1000),
      },
    });

    // Mock SMS — gerçek sağlayıcı eklenene kadar konsola yazılır (PII log'lanmaz: telefon yok)
    await this.audit.record({ action: 'otp.request', resourceType: 'otp' });
    if (this.env.SMS_PROVIDER === 'mock') {
      // eslint-disable-next-line no-console
      console.log(`[mock-sms] OTP kodu: ${code}`);
    }

    // devCode YALNIZCA mock sağlayıcıda döner; üretimde asla istemciye inmez
    return {
      sent: true,
      expiresInSec: OTP_TTL_SEC,
      ...(this.env.SMS_PROVIDER === 'mock' ? { devCode: code } : {}),
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
    await this.audit.record({ action: 'otp.verify', resourceType: 'otp' });
    return { verified: true, phoneVerified: updated.count > 0 };
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
      gender: user.gender,
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
      phone: decryptField(Buffer.from(user.phoneEnc), this.env.FIELD_ENCRYPTION_KEY),
    };
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
