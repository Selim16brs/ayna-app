import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type { Env } from '@ayna/config/env';
import { ENV } from '../config/config.module';
import { hashPassword, verifyPassword } from '../common/crypto';
import { PrismaService } from '../prisma/prisma.service';

/** Panel girişinin kullandığı yönetici kimliği (auth.service'teki 'admin' takma adı buraya çözülür). */
/*
 * Kurucu: "bizim ayna.kz diye bir domainimiz yok. mail adresimiz
 * info@ayna.salon ve websitemiz www.ayna.salon."
 *
 * `admin@ayna.kz` OLMAYAN bir alan adıydı. Giriş için sorun değildi (adres
 * yalnız kimlik olarak kullanılıyor, posta gitmiyor) ama şifre sıfırlama
 * ya da bildirim ihtiyacı doğduğunda hiçbir yere ulaşmayacaktı — ve panelde
 * gerçekmiş gibi görünüyordu.
 *
 * Mevcut kayıt `pre-push/09-yonetici-alan-adi.sql` ile taşınıyor; burada
 * yalnız sabit değişiyor.
 */
const ADMIN_EMAIL = 'admin@ayna.salon';
/** Yönetici şifresinin en az uzunluğu. */
const EN_AZ_UZUNLUK = 12;

/**
 * YÖNETİCİ ŞİFRESİ KURTARMA — yalnız ortam değişkeniyle.
 *
 * Panel girişi kilitlendiğinde hesabı kurtarmanın tek yolu üretim
 * veritabanına doğrudan bağlanmaktı. Bu servis, `ADMIN_BOOTSTRAP_PASSWORD`
 * ayarlıysa açılışta yönetici hesabını kurar ya da şifresini o değere çeker.
 *
 * NEDEN UÇ DEĞİL DE ORTAM DEĞİŞKENİ: bir HTTP ucu, ne kadar korunursa
 * korunsun, dışarıdan denenebilir bir yüzey açar. Ortam değişkenini
 * ayarlayabilen kişi zaten sunucunun sahibidir — yeni bir yüzey açılmaz.
 *
 * Şifre HİÇBİR ZAMAN log'a yazılmaz; yalnız işlemin yapıldığı kaydedilir.
 */
@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async onModuleInit(): Promise<void> {
    const sifre = this.env.ADMIN_BOOTSTRAP_PASSWORD;
    if (!sifre) return;

    /*
     * EN AZ 12 KARAKTER — ama uygulamayı DÜŞÜRMEDEN.
     *
     * Bu kural şemadaydı ve kısa şifre `loadEnv`i düşürüp API'yi hiç
     * açtırmıyordu. Kurucu zaten panele giremediği için buraya geliyor;
     * bir yazım hatasının tüm pazar yerini kapatması kabul edilemez.
     *
     * Kural duruyor (zayıf yönetici şifresi ciddi bir risk) ama bedelini
     * yalnız sıfırlama ödüyor: atlanıyor ve sebep kayda yazılıyor.
     */
    if (sifre.length < EN_AZ_UZUNLUK) {
      this.logger.error(
        `ADMIN_BOOTSTRAP_PASSWORD en az ${EN_AZ_UZUNLUK} karakter olmalı — ` +
          `${sifre.length} karakter verildi. Yönetici şifresi DEĞİŞTİRİLMEDİ.`,
      );
      return;
    }

    try {
      const mevcut = await this.prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

      if (mevcut) {
        // Zaten aynı şifreyse dokunma: her açılışta hash'i yeniden yazmak
        // gereksiz ve denetim kaydını gürültüye boğar.
        if (verifyPassword(sifre, mevcut.passwordHash)) return;
        await this.prisma.user.update({
          where: { id: mevcut.id },
          data: {
            passwordHash: hashPassword(sifre),
            // Hesap silinmiş/askıya alınmışsa kurtarma işe yaramazdı.
            status: 'active',
            role: 'admin',
          },
        });
        await this.kaydet(mevcut.id, 'reset');
        return;
      }

      // Hesap hiç yoksa oluştur. phoneHash TEKİL ve zorunlu; yönetici telefonla
      // giriş yapmadığı için çakışmayan bir sabit kullanılır.
      const olusan = await this.prisma.user.create({
        data: {
          phoneHash: 'admin:bootstrap',
          phoneEnc: Uint8Array.from([]),
          passwordHash: hashPassword(sifre),
          name: 'AYNA Admin',
          email: ADMIN_EMAIL,
          role: 'admin',
          defaultLocale: 'tr',
        },
      });
      await this.kaydet(olusan.id, 'create');
    } catch {
      // Kurtarma başarısızsa API yine de AÇILMALI: aksi hâlde tek bir hatalı
      // değişken tüm servisi yere indirirdi.
      console.warn('[admin-bootstrap] yönetici kurtarma başarısız');
    }
  }

  private async kaydet(userId: string, tur: 'create' | 'reset') {
    // ŞİFRE YAZILMAZ — yalnız ne yapıldığı.
    await this.prisma.auditLog
      .create({
        data: {
          actorId: null,
          actorRole: 'system',
          action: 'admin.bootstrap',
          resourceType: 'user',
          resourceId: userId,
          safeDiff: { mode: tur },
        },
      })
      .catch(() => undefined);
    // eslint-disable-next-line no-console
    console.log(
      `[admin-bootstrap] yönetici hesabı ${tur === 'create' ? 'oluşturuldu' : 'sıfırlandı'}`,
    );
  }
}
