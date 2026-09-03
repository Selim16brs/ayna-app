import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
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
import {
  istekGovdesi as mobizonGovdesi,
  istekUcu as mobizonUcu,
  numarayiSadelestir,
  tekrarDenenir as mobizonTekrarDenenir,
  yanitiCoz as mobizonCoz,
} from './mobizon';

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
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Ağa çıkmadan önce beklenecek en uzun süre. */
  private static readonly ZAMAN_ASIMI_MS = 10_000;

  /**
   * Seçili sağlayıcı için EKSİK olan ortam değişkenleri.
   *
   * Boş dizi = yapılandırma tamam.
   */
  private eksikAyarlar(): string[] {
    const yok = (v: string | undefined) => !v || !v.trim();
    if (this.env.SMS_PROVIDER === 'smsc') {
      return (['SMSC_LOGIN', 'SMSC_PASSWORD'] as const).filter((a) => yok(this.env[a]));
    }
    if (this.env.SMS_PROVIDER === 'mobizon') {
      return (['MOBIZON_API_KEY'] as const).filter((a) => yok(this.env[a]));
    }
    return [];
  }

  /**
   * Açılışta yapılandırmayı DENETLER ama uygulamayı DÜŞÜRMEZ.
   *
   * ── BU DAVRANIŞ BİR HATANIN ÜRÜNÜ ───────────────────────────────────
   *
   * Önce denetim `env.ts` içindeydi ve eksik ayarda API HİÇ AÇILMIYORDU.
   * Gerekçesi doğruydu: yanlış yapılandırmayla sessizce çalışıp her OTP'yi
   * çöpe atmak en kötü sonuç. Ama çözüm ORANTISIZDI ve üretimde bunu
   * yaşadık: kurucu değişkeni `MOBIZON_API_KEY` yerine `api.mobizon.kz`
   * adıyla kaydetti ve TÜM PAZAR YERİ kapandı — randevular, harita,
   * mesajlar, ödemeler. SMS ayarındaki bir yazım hatası uygulamanın
   * tamamını durdurmamalı.
   *
   * Doğru ayrım şu: SMS'i sessizce düşürmemek ile uygulamayı düşürmek
   * aynı şey değil. Artık eksik ayar YALNIZ OTP akışını durduruyor;
   * geri kalan her şey çalışmaya devam ediyor ve sebep açılış kaydında
   * bağıra bağıra yazıyor.
   */
  onModuleInit(): void {
    const eksik = this.eksikAyarlar();
    if (eksik.length === 0) return;
    this.logger.error(
      `SMS YAPILANDIRMASI EKSİK — SMS_PROVIDER=${this.env.SMS_PROVIDER} ` +
        `ama şu değişken(ler) boş: ${eksik.join(', ')}. ` +
        'Doğrulama kodları GÖNDERİLEMEYECEK; uygulamanın geri kalanı çalışıyor.',
    );
  }

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

    const eksik = this.eksikAyarlar();
    if (eksik.length > 0) {
      // "Gönderildi" DEMİYORUZ: yapılandırma eksikken kod hiçbir yere
      // gitmiyor ve kullanıcı bunu öğrenmeli.
      const sebep = `yapılandırma eksik: ${eksik.join(', ')}`;
      this.logger.error(`SMS gönderilemedi (${son4(telefon)}): ${sebep}`);
      await this.kaydet(telefon, this.env.SMS_PROVIDER, { ok: false, kod: null, hata: sebep });
      return { gonderildi: false, sebep };
    }

    const saglayici = this.env.SMS_PROVIDER;
    const sonuc =
      saglayici === 'mobizon'
        ? await this.mobizonGonder(telefon, mesaj)
        : await this.smscGonder(telefon, mesaj);

    await this.kaydet(telefon, saglayici, sonuc);

    if (!sonuc.ok) {
      // Sebep SUNUCU kaydında; kullanıcıya sağlayıcı hatası gösterilmiyor.
      this.logger.error(`SMS gönderilemedi (${son4(telefon)}): ${sonuc.kod ?? '-'} ${sonuc.hata}`);
      return { gonderildi: false, sebep: sonuc.hata };
    }
    return { gonderildi: true };
  }

  /** SMSC.kz gönderimi. */
  private async smscGonder(telefon: string, mesaj: string) {
    const kimlik = {
      login: this.env.SMSC_LOGIN!,
      sifre: this.env.SMSC_PASSWORD!,
      ...(this.env.SMSC_SENDER ? { gonderen: this.env.SMSC_SENDER } : {}),
    };
    const govde = istekGovdesi(kimlik, telefonuBicimle(telefon), mesaj);

    let sonuc = yanitiCoz(await this.istek(SMSC_UC, govde));

    // Yalnız "çok sık istek" (kod 9) tekrar deneniyor. Bakiye yetersizken
    // tekrar denemek aynı hatayı üretir; döngüye girmek durumu kötüleştirir.
    if (!sonuc.ok && tekrarDenenir(sonuc.kod)) {
      await bekle(1200);
      sonuc = yanitiCoz(await this.istek(SMSC_UC, govde));
    }

    // Ağ seviyesinde düştüyse (sağlayıcı ucu erişilemiyor) yedek sunucu
    // deneniyor — SMSC kendi dokümanında bu adresi bunun için veriyor.
    if (!sonuc.ok && sonuc.kod === null && sonuc.hata.startsWith('ağ')) {
      sonuc = yanitiCoz(await this.istek(SMSC_YEDEK_UC, govde));
    }
    return sonuc;
  }

  /** Mobizon.kz gönderimi. */
  private async mobizonGonder(telefon: string, mesaj: string) {
    const kimlik = {
      anahtar: this.env.MOBIZON_API_KEY!,
      ...(this.env.MOBIZON_SENDER ? { gonderen: this.env.MOBIZON_SENDER } : {}),
    };
    // Mobizon "+" kabul etmiyor: yalnız rakam.
    const numara = numarayiSadelestir(telefonuBicimle(telefon));
    const uc = mobizonUcu(kimlik);
    const govde = mobizonGovdesi(kimlik, numara, mesaj);

    let sonuc = mobizonCoz(await this.istek(uc, govde));
    if (!sonuc.ok && mobizonTekrarDenenir(sonuc.kod)) {
      await bekle(1200);
      sonuc = mobizonCoz(await this.istek(uc, govde));
    }
    return sonuc;
  }

  /**
   * Tek HTTP denemesi. HAM JSON döner; çözümü sağlayıcının kendi çözücüsü
   * yapıyor. Ağ hatası, iki çözücünün de hata sayacağı bir zarfa çevriliyor.
   */
  private async istek(uc: string, govde: URLSearchParams) {
    try {
      const yanit = await fetch(uc, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: govde.toString(),
        signal: AbortSignal.timeout(SmsService.ZAMAN_ASIMI_MS),
      });
      if (!yanit.ok) return agHatasi(`HTTP ${yanit.status}`);
      return await yanit.json();
    } catch (e) {
      return agHatasi((e as Error).message);
    }
  }

  private async kaydet(
    telefon: string,
    saglayici: string,
    sonuc:
      | { ok: true; mesajId: string; parca: number }
      | { ok: false; kod: number | null; hata: string },
  ): Promise<void> {
    try {
      await this.prisma.smsLog.create({
        data: {
          phoneMasked: son4(telefon),
          provider: saglayici,
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

/**
 * Ağ hatasını, İKİ sağlayıcının da hata sayacağı bir zarfa çevirir.
 *
 * SMSC `error_code`a, Mobizon `code`a bakıyor. İkisini de koyuyoruz ki
 * hangi çözücüye giderse gitsin "başarı" diye okunmasın — sessizce
 * gönderilmiş sayılan bir SMS en kötü sonuç olurdu.
 */
function agHatasi(sebep: string) {
  // `error`/`error_code` SMSC'nin, `code`/`message` Mobizon'un baktığı
  // alanlar. Sebep İKİSİNDE de yazıyor ki hangi çözücü okursa okusun
  // kayıtta "bilinmeyen hata" değil gerçek sebep görünsün.
  return { error: `ağ: ${sebep}`, error_code: null, code: -1, message: `ağ: ${sebep}` };
}

function bekle(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
