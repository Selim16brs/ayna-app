import { timingSafeEqual } from 'node:crypto';
import { Controller, ForbiddenException, Get, Headers, Post } from '@nestjs/common';
import { MailScheduler } from './mail.scheduler';

/**
 * ZAMANLAYICI TETİKLEYİCİSİ.
 *
 * Paylaşılan bir sırla korunuyor ve sır SABİT ZAMANDA karşılaştırılıyor —
 * `===` kullansaydık yanıt süresi farkından sır karakter karakter tahmin
 * edilebilirdi.
 *
 * `MAIL_CRON_SECRET` tanımlı DEĞİLSE uç hiç çalışmıyor: açık bırakmak,
 * kendi gönderim itibarımıza doğrultulmuş bir spam tetiği demek. Varsayılanı
 * "kapalı" tutmak, varsayılanı "açık" tutmaktan iyi.
 *
 * GET ve POST aynı işi yapıyor: çoğu zamanlayıcı (Railway, Vercel, cron-job)
 * düz GET atıyor ve yalnız POST açsaydık uç sessizce 401 döndürürdü —
 * dağıtımı temiz görünen, hiç koşmayan bir cron. POST elle tetikleme için.
 *
 * Tekrarlı çağrı güvenli: her şablon `email_log`da tekilleştirildiği için
 * ikinci koşu ikinci postayı göndermiyor.
 */
@Controller('cron/mail')
export class MailController {
  constructor(private readonly scheduler: MailScheduler) {}

  private yetkiliMi(header: string | undefined): boolean {
    const sir = process.env.MAIL_CRON_SECRET;
    if (!sir) return false;
    const gelen = (header ?? '').replace(/^Bearer\s+/i, '');
    const a = Buffer.from(gelen);
    const b = Buffer.from(sir);
    // Uzunluk farkı `timingSafeEqual`i fırlatır; önce eşitlenmeli.
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  private async kosu(header: string | undefined) {
    if (!this.yetkiliMi(header)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yetkisiz' });
    }
    return this.scheduler.calistir();
  }

  @Get()
  get(@Headers('authorization') auth?: string) {
    return this.kosu(auth);
  }

  @Post()
  post(@Headers('authorization') auth?: string) {
    return this.kosu(auth);
  }
}
