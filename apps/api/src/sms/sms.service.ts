import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Env } from '@ayna/config/env';
import { ENV } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';
import {
  SMSC_UC,
  SMSC_YEDEK_UC,
  istekGovdesi,
  otpMesaji,
  telefonuBicimle,
  tekrarDenenir,
  yanitiCoz,
} from './smsc';

/**
 * SMS GÖNDERİM KATMANI — SMSC.kz.
 *
 * ── EN ÖNEMLİ KURAL: "GÖNDERİLDİ" GERÇEĞİ ANLATIR ───────────────────────
 *
 * Bu servis başarısızlığı YUTMUYOR. Eskiden `requestOtp` her koşulda
 * `{sent: true}` diyordu; sağlayıcı bağlanınca bu bir YALAN olurdu —
 * bakiye bittiğinde kullanıcı hiç gelmeyecek bir kodu beklerdi ve kimse
 * sebebini bilmezdi.
 *
 * Kurucu: "sistem hiçbir şeyi kendiliğinden uydurmamalı, her şey %100
 * doğru çalışmalı." Gönderilmeyen SMS'e "gönderildi" demek tam olarak
 * uydurmaktır. Artık sonuç ne ise o dönüyor.
 *
 * ── KAYIT ───────────────────────────────────────────────────────────────
 *
 * Her deneme `sms_log`a yazılıyor: başarısızlık görünür olmalı ki bakiye
 * bittiğinde ya da gönderen adı reddedildiğinde fark edilsin.
 *
 * KAYDA GİRMEYEN İKİ ŞEY:
 *   · MESAJ METNİ — içinde OTP kodu var. `otp_codes` kodu yalnız HMAC
 *     olarak tutuyor; metni saklamak o korumayı boşa çıkarırdı.
 *   · TAM NUMARA — kişisel veri (§privacy-by-design). Yalnız son dört hane
 *     saklanıyor; destek için "hangi numara" sorusuna yetiyor, kimlik
 *     çıkarmaya yetmiyor.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Ağa çıkmadan önce beklenecek en uzun süre. */
  private static readonly ZAMAN_ASIMI_MS = 10_000;

  /**
   * Doğrulama kodunu gönderir.
   *
   * Fırlatmıyor: çağıran taraf (auth) başarısızlığı kullanıcıya anlatılır
   * bir hataya çevirmek zorunda, yakalanmamış bir istisna 500 üretirdi.
   */
  async kodGonder(
    telefon: string,
    kod: string,
    dil: string,
  ): Promise<{ gonderildi: boolean; sebep?: string }> {
    const mesaj = otpMesaji(kod, dil);

    if (this.env.SMS_PROVIDER === 'mock') {
      // Yerel geliştirme. Kod YALNIZ burada görünür; üretimde bu dal
      // çalışmaz çünkü Railway'de SMS_PROVIDER=smsc.
      this.logger.log(`[mock-sms] ${son4(telefon)} → ${mesaj}`);
      return { gonderildi: true };
    }

    const kimlik = {
      login: this.env.SMSC_LOGIN!,
      sifre: this.env.SMSC_PASSWORD!,
      ...(this.env.SMSC_SENDER ? { gonderen: this.env.SMSC_SENDER } : {}),
    };
    const numara = telefonuBicimle(telefon);
    const govde = istekGovdesi(kimlik, numara, mesaj);

    let sonuc = await this.istek(SMSC_UC, govde);

    // Yalnız "çok sık istek" (kod 9) tekrar deneniyor. Bakiye yetersizken
    // tekrar denemek aynı hatayı üretir; döngüye girmek durumu kötüleştirir.
    if (!sonuc.ok && tekrarDenenir(sonuc.kod)) {
      await bekle(1200);
      sonuc = await this.istek(SMSC_UC, govde);
    }

    // Ağ seviyesinde düştüyse (sağlayıcı ucu erişilemiyor) yedek sunucu
    // deneniyor — SMSC kendi dokümanında bu adresi bunun için veriyor.
    if (!sonuc.ok && sonuc.kod === null && sonuc.hata.startsWith('ağ')) {
      sonuc = await this.istek(SMSC_YEDEK_UC, govde);
    }

    await this.kaydet(telefon, sonuc);

    if (!sonuc.ok) {
      // Sebep SUNUCU kaydında; kullanıcıya sağlayıcı hatası gösterilmiyor.
      this.logger.error(`SMS gönderilemedi (${son4(telefon)}): ${sonuc.kod ?? '-'} ${sonuc.hata}`);
      return { gonderildi: false, sebep: sonuc.hata };
    }
    return { gonderildi: true };
  }

  /** Tek HTTP denemesi. Ağ hataları da `SmscSonuc`a çevriliyor. */
  private async istek(uc: string, govde: URLSearchParams) {
    try {
      const yanit = await fetch(uc, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: govde.toString(),
        signal: AbortSignal.timeout(SmsService.ZAMAN_ASIMI_MS),
      });
      if (!yanit.ok) {
        return { ok: false as const, kod: null, hata: `ağ: HTTP ${yanit.status}` };
      }
      return yanitiCoz(await yanit.json());
    } catch (e) {
      return { ok: false as const, kod: null, hata: `ağ: ${(e as Error).message}` };
    }
  }

  private async kaydet(
    telefon: string,
    sonuc: Awaited<ReturnType<SmsService['istek']>>,
  ): Promise<void> {
    try {
      await this.prisma.smsLog.create({
        data: {
          phoneMasked: son4(telefon),
          provider: 'smsc',
          status: sonuc.ok ? 'SENT' : 'FAILED',
          providerMessageId: sonuc.ok ? sonuc.mesajId : null,
          segments: sonuc.ok ? sonuc.parca : 0,
          errorCode: sonuc.ok ? null : sonuc.kod,
          error: sonuc.ok ? null : sonuc.hata,
        },
      });
    } catch (e) {
      // Kayıt tutulamaması GÖNDERİMİ düşürmemeli: kullanıcı kodu almışsa
      // muhasebe hatası yüzünden giriş engellenmez.
      this.logger.warn(`sms_log yazılamadı: ${(e as Error).message}`);
    }
  }
}

/** Numaranın yalnız son dört hanesi — kayıtta tam numara tutulmuyor. */
function son4(telefon: string): string {
  const r = (telefon ?? '').replace(/[^0-9]/g, '');
  return r.length >= 4 ? `…${r.slice(-4)}` : '…';
}

function bekle(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
