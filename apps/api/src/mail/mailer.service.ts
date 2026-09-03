import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PAZARLAMA, sablonUret, type Dil, type SablonAdi } from './sablonlar';

/**
 * E-POSTA GÖNDERİM KATMANI.
 *
 * AIVIO'daki karşılığından uyarlandı. Korunanlar (orada işe yaradıkları
 * kanıtlanmış):
 *   · Gönderimden ÖNCE kayıt açılır — sağlayıcı çağrısı düşerse posta
 *     sessizce kaybolmaz, `FAILED` olarak durur.
 *   · Anahtar yoksa konsola yazılır; yerelde kayıt akışı e-posta hesabı
 *     olmadan test edilebilir.
 *
 * AYNA'ya özgü olanlar:
 *   · Dil kullanıcının `defaultLocale`inden gelir (tr/kk/ru).
 *   · E-posta ZORUNLU DEĞİL: AYNA'da kayıt telefonla. Adresi olmayan
 *     kullanıcıya gönderilemez ve bu bir hata değil, sessizce atlanır.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /*
   * ─────────────────────  SIKLIK POLİTİKASI  ─────────────────────
   *
   * Kurucu: "mailing yaparken kullanıcıyı çok bunaltmamak lazım. her teklif
   * geldiğinde mail atmak sorun olabilir."
   *
   * Doğru. E-posta yorgunluğunun bedeli tek bir postanın okunmaması değil:
   * insanlar abonelikten çıkıyor, spam işaretliyor ve o işaret gönderim
   * itibarını düşürüyor — sonra ÖNEMLİ posta da (iaden hazır) kutuya
   * düşmüyor. Yani bunaltmak, en çok işe yarayan postayı öldürüyor.
   *
   * Üç katmanlı sınır. Politika BURADA, gönderim yolunun tek geçidinde:
   * zamanlayıcıya ya da çağıran modüle bırakılsaydı biri unutur ve sınır
   * sessizce delinirdi.
   */

  /** Pazarlama postaları arası en az bu kadar gün geçmeli. */
  private static readonly PAZARLAMA_ARALIK_GUN = 7;

  /** Günlük tavan — kritikler hariç, kullanıcı başına. */
  private static readonly GUNLUK_TAVAN = 3;

  /**
   * Tavana TAKILMAYANLAR.
   *
   * Üçü de kullanıcının parasına ya da o an bekleyen bir işine dair:
   * susturmak zarar verir. Tavan, "bilgi" postalarını kısmak için —
   * "paran hazır"ı değil.
   */
  private static readonly KRITIK: ReadonlySet<string> = new Set([
    'depozito_bekliyor',
    'depozito_iadesi',
    'randevu_onaylandi',
  ]);

  private get anahtar(): string | undefined {
    return process.env.RESEND_API_KEY;
  }

  private get gonderen(): string {
    // Kurucu: "mail adresimiz info@ayna.salon". `merhaba@` diye bir kutu yok;
    // oradan giden postanın yanıtı hiçbir yere ulaşmazdı.
    return process.env.EMAIL_FROM ?? 'AYNA <info@ayna.salon>';
  }

  private get site(): string {
    return process.env.APP_URL ?? 'https://ayna.salon';
  }

  private dilSec(ham: string | null | undefined): Dil {
    return ham === 'tr' || ham === 'kk' || ham === 'ru' ? ham : 'tr';
  }

  /**
   * Bir kullanıcıya bir şablonu BİR KEZ gönderir.
   *
   * Tekrar engelleme veritabanında: `(userId, template)` benzersiz. Kayıt
   * oluşturma çakışırsa posta zaten gönderilmiş demektir ve `false` döner.
   * Uygulama katmanında "önce oku sonra yaz" yapsaydık zamanlayıcının iki
   * eşzamanlı koşusu ikisini de geçirir, kullanıcı aynı postayı iki kez
   * alırdı.
   */
  /**
   * Sıklık sınırına takılıyor mu?
   *
   * `email_log` zaten her gönderimi yazdığı için ayrı sayaç tablosuna gerek
   * yok — geçmiş orada duruyor.
   */
  private async sinirVar(userId: string, sablon: SablonAdi): Promise<string | null> {
    if (MailerService.KRITIK.has(sablon)) return null;

    const gunBasi = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const bugunGiden = await this.prisma.emailLog.count({
      where: { userId, status: 'SENT', createdAt: { gte: gunBasi } },
    });
    if (bugunGiden >= MailerService.GUNLUK_TAVAN) return 'günlük tavan';

    if (PAZARLAMA.has(sablon)) {
      const aralik = new Date(
        Date.now() - MailerService.PAZARLAMA_ARALIK_GUN * 24 * 60 * 60 * 1000,
      );
      const sonPazarlama = await this.prisma.emailLog.findFirst({
        where: {
          userId,
          status: 'SENT',
          createdAt: { gte: aralik },
          template: { in: [...PAZARLAMA] },
        },
        select: { id: true },
      });
      if (sonPazarlama) return 'pazarlama aralığı';
    }
    return null;
  }

  async gonder(
    userId: string,
    sablon: SablonAdi,
    veri?: Record<string, string>,
    /**
     * Olay kimliği — aynı şablonun HER OLAY için bir kez gitmesini sağlar.
     * Verilmezse şablon kullanıcı başına ÖMÜR BOYU bir kez gider.
     *
     * Randevu onayı ve hatırlatma bunu vermek ZORUNDA: vermezlerse ikinci
     * randevunun postası hiç gitmez.
     */
    olayId?: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, defaultLocale: true, status: true },
    });
    /*
     * Adresi olmayan ya da SİLİNMİŞ hesaba gönderilmez.
     *
     * AYNA'da silme `status: 'deleted'` ile işaretleniyor (satır fiziksel
     * olarak duruyor, kişisel alanlar anonimleştiriliyor). `deletedAt` diye
     * bir alan YOK — AIVIO'da vardı, buraya körlemesine taşınsaydı derleme
     * hatası verirdi; sessizce geçseydi silinmiş hesaplara posta giderdi.
     */
    if (!user?.email || user.status === 'deleted') return false;

    const engel = await this.sinirVar(userId, sablon);
    if (engel) {
      // Sessizce düşürülmüyor, günlüğe yazılıyor: "neden gitmedi" sorusunun
      // cevabı olmalı, yoksa sınır görünmez bir kayıp olur.
      this.logger.log(`[mail] ${engel} — atlandı: ${sablon} → ${user.email}`);
      return false;
    }

    const dil = this.dilSec(user.defaultLocale);
    const dedupeKey = olayId ? `${sablon}:${olayId}` : sablon;
    let kayitId: string;
    try {
      const kayit = await this.prisma.emailLog.create({
        data: {
          userId,
          email: user.email,
          template: sablon,
          dedupeKey,
          locale: dil,
          status: 'QUEUED',
        },
      });
      kayitId = kayit.id;
    } catch {
      // Benzersiz kısıt: bu anahtar bu kullanıcıya zaten gitti.
      return false;
    }

    const icerik = sablonUret(
      sablon,
      {
        ad: user.name,
        site: this.site,
        veri,
        cikisUrl: PAZARLAMA.has(sablon) ? `${this.site}/profile/notifications` : undefined,
      },
      dil,
    );

    if (!this.anahtar) {
      this.logger.log(`[mail] RESEND_API_KEY yok — gönderilmedi: ${sablon} → ${user.email}`);
      await this.prisma.emailLog.update({
        where: { id: kayitId },
        data: { status: 'SENT', sentAt: new Date(), providerMessageId: 'dev-console' },
      });
      return true;
    }

    try {
      const yanit = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.anahtar}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.gonderen,
          to: [user.email],
          subject: icerik.konu,
          html: icerik.html,
          text: icerik.metin,
        }),
      });
      if (!yanit.ok) throw new Error(`Resend ${yanit.status}: ${await yanit.text()}`);
      const { id } = (await yanit.json()) as { id?: string };
      await this.prisma.emailLog.update({
        where: { id: kayitId },
        data: { status: 'SENT', sentAt: new Date(), providerMessageId: id ?? null },
      });
      return true;
    } catch (hata) {
      // Hata YUTULMUYOR ama fırlatılmıyor da: tek bir adresin düşmesi
      // zamanlayıcının geri kalanını durdurmamalı. Kayıtta görünüyor.
      await this.prisma.emailLog.update({
        where: { id: kayitId },
        data: { status: 'FAILED', error: String(hata) },
      });
      this.logger.warn(`[mail] gönderilemedi: ${sablon} → ${user.email} — ${String(hata)}`);
      return false;
    }
  }
}
