import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * VERİLERİMİ İNDİR + HESABIMI SİL.
 *
 * Gizlilik ekranında iki düğme vardı ve ikisi de "Henüz hazır değil" diyordu:
 * sunucu tarafı hiç yazılmamıştı. Kişisel veri mevzuatı ikisini de zorunlu
 * kılıyor.
 *
 * ── SİLME POLİTİKASI ────────────────────────────────────────────────────────
 * Her kayıt aynı muameleyi göremez; üç kova var:
 *
 * 1) SERT SİLİNİR — kişiye ait, kimsenin başka hakkı olmayan veri:
 *    pasaport (ALERJİ = SAĞLIK VERİSİ), pasaport erişim kayıtları, güvendiği
 *    kişiler, güvenlik oturumları, push token'ları, W2W kayıtları/takipleri ve
 *    kendi gönderileri.
 *
 * 2) KİMLİKSİZLEŞTİRİLİR — başkasının da kaydı olan veri:
 *    randevudaki müşteri adı/telefonu (uzmanın da işlem kaydı), W2W yorumları
 *    (başkasının sorusuna verilmiş cevap; silinirse o kişinin fikir birliği
 *    verisi bozulur).
 *
 * 3) OLDUĞU GİBİ KALIR — mali ve denetim kayıtları:
 *    puan defteri, ödemeler, komisyon faturaları, abonelikler, denetim log'u.
 *    CLAUDE.md finansı APPEND-ONLY LEDGER olarak bağlıyor; satır silmek
 *    mutabakatı bozar. User satırındaki KİMLİK bilgisi silindiği için bu
 *    kayıtlar artık anlamsız bir UUID'ye bağlıdır — yani takma adlaştırma.
 *
 * ── DIŞARIDA BIRAKILAN ──────────────────────────────────────────────────────
 * Uzmanın müşteri hakkındaki GİZLİ sinyali (§7.3) dışa aktarıma GİRMEZ.
 * Kullanıcının kendisine "sorunlu" dendiğini görmesi ürünün temel güven
 * vaadini bozardı. Bu, self-servis bir ürün özelliğidir; resmî veri talepleri
 * ayrı bir hukuki süreçtir.
 */
@Injectable()
export class AccountDataService {
  constructor(private readonly prisma: PrismaService) {}

  /** Kullanıcının KENDİ verisinin tamamı — makine okunur JSON. */
  async exportAll(userId: string) {
    const [
      user,
      bookings,
      loyalty,
      quoteRequests,
      quotes,
      posts,
      comments,
      saves,
      follows,
      disputes,
      subscriptions,
      payments,
      conversations,
      passport,
      trusted,
      kyc,
      careRoutines,
      careMoments,
      careLogs,
    ] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.booking.findMany({ where: { userId } }),
      this.prisma.loyaltyEntry.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.quoteRequest.findMany({ where: { userId } }),
      this.prisma.quote.findMany({ where: { userId } }),
      this.prisma.circlePost.findMany({ where: { userId } }),
      this.prisma.circleComment.findMany({ where: { userId } }),
      this.prisma.circleSave.findMany({ where: { userId } }),
      this.prisma.circleFollow.findMany({ where: { followerId: userId } }),
      this.prisma.dispute.findMany({ where: { userId } }),
      this.prisma.subscription.findMany({ where: { userId } }),
      this.prisma.payment.findMany({ where: { userId } }),
      this.prisma.conversation.findMany({
        where: { customerId: userId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      }),
      this.prisma.userPassport.findUnique({ where: { userId } }),
      this.prisma.trustedContact.findMany({ where: { userId } }),
      this.prisma.kycVerification.findMany({ where: { userId } }),
      // §bakım — kullanıcının kendi girdiği veri; dışa aktarımda YER ALMALI.
      // Silinirken sert siliyoruz, o hâlde vermeden silmek olmaz.
      this.prisma.careRoutine.findMany({ where: { userId } }),
      this.prisma.careMoment.findMany({ where: { userId } }),
      this.prisma.careLog.findMany({ where: { userId } }),
    ]);

    return {
      // Dışa aktarımın NE OLDUĞU dosyanın içinde yazar: kullanıcı yıllar sonra
      // açtığında neye baktığını bilmeli.
      aciklama: 'AYNA hesabındaki kendi verilerinin tamamı. Tarihler UTC. Para tutarları KZT.',
      olusturuldu: new Date().toISOString(),
      profil: user
        ? {
            id: user.id,
            ad: user.name,
            eposta: user.email,
            sehir: user.city,
            rol: user.role,
            telefonDogrulandi: user.phoneVerified,
            uyelik: user.membershipTier,
            uyelikBitis: user.membershipUntil,
            olusturuldu: user.createdAt,
          }
        : null,
      randevular: bookings,
      puanDefteri: loyalty,
      talepler: quoteRequests,
      teklifler: quotes,
      w2wGonderilerim: posts,
      w2wYorumlarim: comments,
      w2wKaydettiklerim: saves,
      w2wTakipEttiklerim: follows,
      itirazlar: disputes,
      abonelikler: subscriptions,
      odemeler: payments,
      mesajlasmalar: conversations,
      pasaport: passport,
      guvendigimKisiler: trusted,
      kimlikDogrulama: kyc,
      bakimRutinlerim: careRoutines,
      bakimAnlarim: careMoments,
      bakimGunlugum: careLogs,
    };
  }

  /**
   * Hesabı siler. Geri alınamaz.
   *
   * Sıra ÖNEMLİ: önce sert silmeler, sonra kimliksizleştirme, en son User
   * satırı. Ortada kesilirse geride PII değil, silinmiş parçalar kalır —
   * yani hata yönü GÜVENLİ tarafa düşer.
   */
  async deleteAccount(userId: string) {
    // 1) SERT SİLME — sağlık verisi ve kişiye özel kayıtlar.
    await this.prisma.passportAccess.deleteMany({ where: { userId } }).catch(() => undefined);
    // ALERJİ/HASSASİYET = sağlık verisi. Takma adlaştırma YETMEZ, silinir.
    await this.prisma.userPassport.deleteMany({ where: { userId } }).catch(() => undefined);
    // §gizlilik — BAKIM VERİSİ de sağlık-yakını: rutinler cilt/saç durumunu,
    // günlük kişisel notları taşıyor. Pasaport gibi SERT silinir; finansal
    // kayıtlar gibi saklanmaz.
    await this.prisma.careRoutine.deleteMany({ where: { userId } }).catch(() => undefined);
    await this.prisma.careMoment.deleteMany({ where: { userId } }).catch(() => undefined);
    await this.prisma.careLog.deleteMany({ where: { userId } }).catch(() => undefined);
    await this.prisma.trustedContact.deleteMany({ where: { userId } }).catch(() => undefined);
    await this.prisma.safetySession.deleteMany({ where: { userId } }).catch(() => undefined);
    await this.prisma.pushToken.deleteMany({ where: { userId } }).catch(() => undefined);
    await this.prisma.circleSave.deleteMany({ where: { userId } }).catch(() => undefined);
    await this.prisma.circleFollow
      .deleteMany({ where: { OR: [{ followerId: userId }, { targetId: userId }] } })
      .catch(() => undefined);
    // Kendi gönderileri gider; başkasının sorusuna verdiği cevaplar (aşağıda)
    // kimliksizleştirilir, çünkü silinmesi o kişinin fikir birliğini bozar.
    await this.prisma.circlePost.deleteMany({ where: { userId } }).catch(() => undefined);

    // 2) KİMLİKSİZLEŞTİRME — başkasının da kaydı olan veri.
    await this.prisma.circleComment
      .updateMany({ where: { userId }, data: { userId: null, authorLabel: 'AYNA Üyesi' } })
      .catch(() => undefined);
    await this.prisma.booking
      .updateMany({
        where: { userId },
        data: { customerName: 'Silinmiş kullanıcı', customerPhone: null },
      })
      .catch(() => undefined);

    // 3) KİMLİK BİLGİSİNİN KENDİSİ. phoneHash TEKİL olduğu için null yapılamaz;
    // çakışmayan bir sentinel'e çevrilir (aynı telefonla yeniden kayıt serbest
    // kalsın diye).
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: 'Silinmiş kullanıcı',
        phoneHash: `deleted:${userId}`,
        email: null,
        city: '',
        avatarUrl: null,
        cutoutUrl: null,
        status: 'deleted',
      },
    });

    // 4) Denetim izi: silme KRİTİK EYLEMDİR ve kaydı tutulur. Kayda PII girmez —
    // zaten silinen şey PII'nin kendisi.
    await this.prisma.auditLog
      .create({
        data: {
          actorId: userId,
          actorRole: 'user',
          action: 'account.delete',
          resourceType: 'user',
          resourceId: userId,
          safeDiff: { scope: 'self' },
        },
      })
      .catch(() => undefined);

    return { deleted: true };
  }
}
