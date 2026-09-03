import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Env } from '@ayna/config/env';
import { ENV } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';
import { decryptField, encryptField, hashOtp, normalizePhone, phoneHash } from '../common/crypto';

/**
 * PROFİL DEĞİŞİKLİĞİ — çoğu ANINDA, iletişim bilgisi ONAYLA.
 *
 * Kurucu: "uzmanların telefon ve mailleri dışındaki şeyleri profillerinde
 * değiştirdiklerinde admin paneline onay almasına gerek yok."
 *
 * Eskiden HER değişiklik kuyruğa düşüyordu: uzman tanıtım yazısındaki bir
 * harfi düzeltmek için bile admin onayı bekliyordu. Sonuç, kurucunun başka
 * bir yerde gördüğü tabloyla aynı: kimse profilini doldurmuyor.
 *
 * ONAYDA KALANLAR — telefon ve e-posta. Bunlar kimlik doğrulama ve iletişim
 * kanalı: sessizce değişirse hesap devri ya da müşteriyi platform dışına
 * çekme yolu açılır. Salonun "iletişim telefonu" da buna dahil.
 */
@Injectable()
export class ProfileChangesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private notFound(): never {
    throw new NotFoundException({ code: 'NOT_FOUND', message: 'Talep bulunamadı' });
  }

  /**
   * Onay gerektiren alanlar. Geri kalan HER ŞEY anında uygulanıyor.
   *
   * `salonProfile.contact` iç içe: salon formundaki iletişim telefonu.
   */
  private static readonly ONAY_GEREKEN = new Set(['phone', 'email']);
  private static readonly ONAY_GEREKEN_SALON = new Set(['contact']);

  /** Değişiklikleri "hemen uygulanacak" ve "onay bekleyecek" diye ayırır. */
  private ayir(changes: Record<string, unknown>): {
    hemen: Record<string, unknown>;
    bekleyen: Record<string, unknown>;
  } {
    const hemen: Record<string, unknown> = {};
    const bekleyen: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(changes)) {
      if (ProfileChangesService.ONAY_GEREKEN.has(k)) {
        bekleyen[k] = v;
        continue;
      }
      if (k === 'salonProfile' && v && typeof v === 'object') {
        // Salon profili tek nesne geliyor; iletişim telefonu içinden ayrılıyor
        // ki geri kalan alanlar (tanıtım, adres, fotoğraflar) beklemesin.
        const salon: Record<string, unknown> = {};
        const salonBekleyen: Record<string, unknown> = {};
        for (const [sk, sv] of Object.entries(v as Record<string, unknown>)) {
          if (ProfileChangesService.ONAY_GEREKEN_SALON.has(sk)) salonBekleyen[sk] = sv;
          else salon[sk] = sv;
        }
        if (Object.keys(salon).length) hemen['salonProfile'] = salon;
        if (Object.keys(salonBekleyen).length) bekleyen['salonProfile'] = salonBekleyen;
        continue;
      }
      hemen[k] = v;
    }
    return { hemen, bekleyen };
  }

  /** Sunucuda karşılığı olan alanları yazar. */
  private async uygula(userId: string, hemen: Record<string, unknown>) {
    if (typeof hemen['name'] === 'string' && (hemen['name'] as string).trim()) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { name: (hemen['name'] as string).trim() },
      });
    }
  }

  /* ── TELEFON DEĞİŞİKLİĞİ ─────────────────────────────────────────────
   *
   * Kurucu: "kullanıcının telefon numarasını değiştirme özelliği komple
   * kapalı. kullanıcı değişiklik gönderebilmesi lazım ve adminden onay
   * alması gerekir."
   *
   * Haklıydı ve durum sandığından kötüydü: telefon `ONAY_GEREKEN`
   * listesindeydi ama `approve()` YALNIZ `name` yazıyordu. Yani bir talep
   * onaylansa bile numara değişmiyor, kayıt "approved" görünüyordu.
   * Onaylanmış ama uygulanmamış değişiklik, sistemin olmayan bir şeyi
   * olmuş göstermesi demek.
   *
   * ── YENİ NUMARA NEDEN SMS İLE DOĞRULANIYOR ────────────────────────────
   *
   * Admin onayı TEK BAŞINA yetmez. Admin formda yazan numaranın gerçekten
   * o kişiye ait olduğunu göremez; başkasının numarasını yazan biri onayı
   * geçerse o hesabı ele geçirir (telefon giriş kimliği — §4.6).
   *
   * O yüzden iki kapı var ve ikisi farklı şeye bakıyor:
   *   · SMS kodu — numara GERÇEKTEN başvuranın mı?
   *   · Admin    — bu değişiklik UYGUN mu? (numara değiştirip
   *                değerlendirmelerden ya da yasaktan kaçmak buradan durur)
   */

  /** OTP'yi doğrular ve TÜKETİR. Geçersizse istisna atar. */
  private async kodDogrula(telefon: string, kod: string): Promise<void> {
    const key = this.env.FIELD_ENCRYPTION_KEY;
    const ph = phoneHash(telefon, key);
    const otp = await this.prisma.otpCode.findFirst({
      where: { phoneHash: ph, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.codeHash !== hashOtp(kod, key)) {
      throw new BadRequestException({
        code: 'OTP_INVALID',
        message: 'Kod geçersiz veya süresi doldu',
      });
    }
    // Kod TÜKETİLİYOR: aynı kodla ikinci bir talep açılamasın.
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });
  }

  /** Numara başkasına ait mi? */
  private async telefonSahibi(ph: string, haricUserId: string) {
    const sahip = await this.prisma.user.findUnique({ where: { phoneHash: ph } });
    return sahip && sahip.id !== haricUserId && sahip.status !== 'deleted' ? sahip : null;
  }

  /**
   * Kullanıcı yeni numarasını SMS koduyla doğrular; talep admin onayına düşer.
   */
  async telefonTalebi(userId: string, telefon: string, kod: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) this.notFound();

    const key = this.env.FIELD_ENCRYPTION_KEY;
    const duz = normalizePhone(telefon);
    const ph = phoneHash(duz, key);

    // Aynı numara — talep açmanın anlamı yok, admin'i boş yere meşgul eder.
    if (ph === user!.phoneHash) {
      throw new BadRequestException({
        code: 'PHONE_SAME',
        message: 'Bu zaten senin numaran',
      });
    }
    // Başkasına aitse BURADA duruyor. Onaya bırakılsaydı admin farkında
    // olmadan iki hesabı çakıştırabilirdi.
    if (await this.telefonSahibi(ph, userId)) {
      throw new ConflictException({ code: 'PHONE_TAKEN', message: 'Bu telefon zaten kayıtlı' });
    }

    await this.kodDogrula(duz, kod);

    await this.prisma.profileChangeRequest.updateMany({
      where: { userId, status: 'pending' },
      data: { status: 'rejected', reviewedAt: new Date() },
    });
    const request = await this.prisma.profileChangeRequest.create({
      data: {
        userId,
        userName: user!.name,
        role: user!.role,
        /*
         * Numara AÇIK METİN OLARAK saklanmıyor. `phoneEnc` şifreli (User
         * tablosundaki ile aynı yöntem), `phone` ise yalnız son dört hane.
         * Admin listesi tam numarayı çözerek gösteriyor — karar verebilmek
         * için görmesi gerekiyor — ama veritabanında düz numara durmuyor.
         */
        changes: {
          phone: `…${duz.slice(-4)}`,
          phoneEnc: encryptField(duz, key).toString('hex'),
          phoneVerified: true,
        },
        status: 'pending',
      },
    });
    await this.audit('profile_change.phone_requested', request.id, userId);
    return { pending: ['phone'], request };
  }

  /** Onaylanan numarayı kullanıcıya yazar. */
  private async telefonuUygula(userId: string, phoneEncHex: string): Promise<void> {
    const key = this.env.FIELD_ENCRYPTION_KEY;
    const duz = decryptField(Buffer.from(phoneEncHex, 'hex'), key);
    const ph = phoneHash(duz, key);

    /*
     * TALEPTEN BU YANA numarayı başkası kaydettirmiş olabilir. Burada
     * tekrar bakılıyor: `phoneHash` benzersiz, kontrolsüz yazmak veritabanı
     * hatasıyla onayı yarıda bırakır ve admin ne olduğunu anlamaz.
     */
    if (await this.telefonSahibi(ph, userId)) {
      throw new ConflictException({
        code: 'PHONE_TAKEN',
        message: 'Bu telefon araya başka bir hesap tarafından alınmış',
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phoneHash: ph,
        phoneEnc: Uint8Array.from(encryptField(duz, key)),
        // Kod zaten doğrulandı; yeni numara doğrulanmış sayılıyor.
        phoneVerified: true,
      },
    });
  }

  private async audit(action: string, resourceId: string, actorId?: string) {
    await this.prisma.auditLog.create({
      data: {
        action,
        resourceType: 'profile_change',
        resourceId,
        actorId: actorId ?? null,
        actorRole: 'admin',
      },
    });
  }

  // ── Mobil (salon/uzman) ──────────────────────────────────────────────
  /**
   * Değişikliği alır: iletişim bilgisi dışındakileri ANINDA uygular,
   * yalnız telefon/e-posta için onay talebi açar.
   *
   * Dönüş, çağıran tarafın doğru mesajı verebilmesi için ne uygulandığını
   * ve ne beklediğini söylüyor — "onaya gitti" demek, hiçbir şey beklemezken
   * yanlış olurdu.
   */
  async submit(userId: string, changes: Record<string, unknown>) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) this.notFound();

    const { hemen, bekleyen } = this.ayir(changes);

    if (Object.keys(hemen).length) {
      await this.uygula(userId, hemen);
      await this.audit('profile_change.applied', userId, userId);
    }

    if (!Object.keys(bekleyen).length) {
      // Bekleyen bir şey yoksa KUYRUĞA HİÇ GİRMİYOR: eski davranışta boş
      // talepler admin panelini dolduruyordu.
      return { applied: Object.keys(hemen), pending: [] as string[], request: null };
    }

    // Yalnız en güncel talep bekler.
    await this.prisma.profileChangeRequest.updateMany({
      where: { userId, status: 'pending' },
      data: { status: 'rejected', reviewedAt: new Date() },
    });
    const request = await this.prisma.profileChangeRequest.create({
      data: {
        userId,
        userName: user!.name,
        role: user!.role,
        changes: bekleyen as object,
        status: 'pending',
      },
    });
    return { applied: Object.keys(hemen), pending: Object.keys(bekleyen), request };
  }

  // Kullanıcının son talebi (mobil onay durumunu + onaylı değişikliği okur)
  mine(userId: string) {
    return this.prisma.profileChangeRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Admin ────────────────────────────────────────────────────────────
  /**
   * Onay kuyruğu.
   *
   * Telefon taleplerinde numara şifreli saklanıyor; admin karar verebilmek
   * için TAM numarayı görmek zorunda, o yüzden burada çözülüyor. Şifreli
   * hâli (`phoneEnc`) yanıttan ÇIKARILIYOR — panele gitmesinin bir faydası
   * yok, sızma yüzeyini büyütmenin dışında.
   */
  async list(status?: string) {
    const kayitlar = await this.prisma.profileChangeRequest.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    const key = this.env.FIELD_ENCRYPTION_KEY;
    return kayitlar.map((k) => {
      const c = (k.changes ?? {}) as Record<string, unknown>;
      if (typeof c['phoneEnc'] !== 'string') return k;
      const { phoneEnc, ...gerisi } = c;
      let acik: string;
      try {
        acik = decryptField(Buffer.from(phoneEnc, 'hex'), key);
      } catch {
        // Anahtar döndüyse eski kayıt çözülemez. Uydurmuyoruz: maskeli
        // hâli zaten `phone` alanında duruyor.
        return { ...k, changes: gerisi };
      }
      return { ...k, changes: { ...gerisi, phone: acik } };
    });
  }

  // Onayla: durumu approved. name ve TELEFON değişikliğini backend uygular
  // (diğer seller alanları — social/hours/certs — mobil tarafta onaylıyı çekip uygular).
  async approve(id: string, actorId?: string) {
    const req = await this.prisma.profileChangeRequest.findUnique({ where: { id } });
    if (!req) this.notFound();
    const changes = (req!.changes ?? {}) as Record<string, unknown>;
    if (typeof changes.name === 'string' && changes.name.trim()) {
      await this.prisma.user.update({
        where: { id: req!.userId },
        data: { name: changes.name.trim() },
      });
    }
    // TELEFON — onay "approved" yazmakla bitmiyor, numara gerçekten değişiyor.
    if (typeof changes['phoneEnc'] === 'string') {
      await this.telefonuUygula(req!.userId, changes['phoneEnc']);
    }
    const updated = await this.prisma.profileChangeRequest.update({
      where: { id },
      data: { status: 'approved', reviewedAt: new Date() },
    });
    await this.audit('profile_change.approve', id, actorId);
    return updated;
  }

  async reject(id: string, actorId?: string) {
    const req = await this.prisma.profileChangeRequest.findUnique({ where: { id } });
    if (!req) this.notFound();
    const updated = await this.prisma.profileChangeRequest.update({
      where: { id },
      data: { status: 'rejected', reviewedAt: new Date() },
    });
    await this.audit('profile_change.reject', id, actorId);
    return updated;
  }
}
