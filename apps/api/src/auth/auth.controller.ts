import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AccountDataService } from './account-data.service';
import { AuthService } from './auth.service';
import {
  type LoginInput,
  loginSchema,
  type OtpRequestInput,
  otpRequestSchema,
  type OtpVerifyInput,
  otpVerifySchema,
  type RegisterInput,
  registerSchema,
  type ResetPasswordInput,
  resetPasswordSchema,
} from './auth.dto';
import { type AuthedRequest, JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly accountData: AccountDataService,
  ) {}

  @Post('register')
  register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterInput) {
    return this.auth.register(body);
  }

  // Brute-force önleme: IP başına dakikada 10 giriş denemesi
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    return this.auth.login(body);
  }

  // Profil fotoğrafı güncelle (data URL; null = kaldır)
  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  setAvatar(@Req() req: AuthedRequest, @Body() body: { photoDataUrl?: string | null }) {
    const v =
      typeof body?.photoDataUrl === 'string' ? body.photoDataUrl.slice(0, 12_000_000) : null;
    return this.auth.setAvatar(req.user!.id, v);
  }

  // Kesik portre güncelle (data URL; null = kaldır)
  @Post('me/cutout')
  @UseGuards(JwtAuthGuard)
  setCutout(@Req() req: AuthedRequest, @Body() body: { cutoutDataUrl?: string | null }) {
    const v =
      typeof body?.cutoutDataUrl === 'string' ? body.cutoutDataUrl.slice(0, 12_000_000) : null;
    return this.auth.setCutout(req.user!.id, v);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AuthedRequest) {
    return this.auth.me(req.user!.id);
  }

  // §4 — müşteri adı/şehri. Bu uç YOKTU; düzenleme yalnız cihazda kalıyor ve
  // uygulama yeniden açılınca sunucudaki eski değer geri geliyordu.
  @Post('me/profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(@Req() req: AuthedRequest, @Body() body: { name?: string; city?: string }) {
    return this.auth.updateProfile(req.user!.id, {
      ...(typeof body?.name === 'string' ? { name: body.name } : {}),
      ...(typeof body?.city === 'string' ? { city: body.city } : {}),
    });
  }

  // §5.6 — favoriler + adresler hesapta (cihaz değişse de kaybolmaz)
  @Post('me/prefs')
  @UseGuards(JwtAuthGuard)
  setPrefs(
    @Req() req: AuthedRequest,
    @Body() body: { favorites?: string[]; addresses?: unknown[]; locale?: string },
  ) {
    return this.auth.setPrefs(req.user!.id, {
      ...(Array.isArray(body?.favorites)
        ? {
            favorites: body.favorites
              .filter((x) => typeof x === 'string')
              .map((x) => x.slice(0, 60)),
          }
        : {}),
      ...(Array.isArray(body?.addresses) ? { addresses: body.addresses } : {}),
      ...(typeof body?.locale === 'string' ? { locale: body.locale } : {}),
    });
  }

  /**
   * Verilerimi indir — kullanıcının KENDİ verisinin tamamı (JSON).
   * Gizlilik ekranında düğme vardı ama sunucu tarafı hiç yazılmamıştı.
   */
  @Get('me/export')
  @UseGuards(JwtAuthGuard)
  exportMyData(@Req() req: AuthedRequest) {
    return this.accountData.exportAll(req.user!.id);
  }

  /**
   * Hesabımı sil — GERİ ALINAMAZ.
   *
   * `confirm: 'SIL'` şart: tek dokunuşla ya da yanlış istekle tetiklenmesin.
   * Silme politikası account-data.service.ts başında yazılı.
   */
  @Post('me/delete')
  @UseGuards(JwtAuthGuard)
  deleteMyAccount(@Req() req: AuthedRequest, @Body() body: { confirm?: string }) {
    if (body?.confirm !== 'SIL') {
      throw new BadRequestException({
        code: 'DELETE_NOT_CONFIRMED',
        message: 'Silme onaylanmadı',
      });
    }
    return this.accountData.deleteAccount(req.user!.id);
  }

  // §4.6 — OTP iste / doğrula (mock SMS). Sıkı limit: SMS maliyet bombardımanı +
  // kod brute-force önleme (gerçek SMS sağlayıcı bağlanınca da hazır).
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('otp/request')
  otpRequest(@Body(new ZodValidationPipe(otpRequestSchema)) body: OtpRequestInput) {
    return this.auth.requestOtp(body.phone);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('otp/verify')
  otpVerify(@Body(new ZodValidationPipe(otpVerifySchema)) body: OtpVerifyInput) {
    return this.auth.verifyOtp(body.phone, body.code);
  }

  // §3.3 — Şifre sıfırlama: OTP ile doğrulanan telefona yeni parola
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('reset-password')
  resetPassword(@Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput) {
    return this.auth.resetPassword(body.phone, body.code, body.newPassword);
  }
}
