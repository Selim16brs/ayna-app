import { DEFAULT_EARN_PCT, earnPoints, odenenTutar } from '@ayna/domain';
import { grantPoints } from './loyalty.grant';
import type { PrismaService } from '../prisma/prisma.service';

// Randevu TAMAMLANDIĞINDA doğan puan ödülleri — tek kapı.
//
// Randevu iki ayrı yoldan `completed` olabiliyor (müşteri teyidi ve
// zamanlayıcının otomatik kesinleştirmesi). Ödülleri her iki yolda ayrı ayrı
// çağırmak, birinin unutulması demekti; bu dosya ikisini birleştiriyor.

export const CASHBACK_SETTING_KEY = 'rate.points_earn_pct';
export const DEFAULT_CASHBACK_PCT = DEFAULT_EARN_PCT;
export const CASHBACK_REASON = 'rewards.earn.cashback';
export const REFERRAL_REASON = 'rewards.earn.referral';
export const REFERRAL_POINTS = 300;

// Formül @ayna/domain'de: mobil de AYNI hesabı yaparak randevu ekranında
// "kazanacağın puan"ı gösteriyor. İki kopya olsa oran değiştiğinde vaat ile
// yatan puan birbirinden ayrılırdı.
export const cashbackPoints = earnPoints;

type CompletedBooking = {
  id: string;
  userId: string | null;
  price: unknown;
  /** Kasada değişen fiyat — varsa puan BUNDAN doğar (`odenenTutar`). */
  finalPrice?: unknown;
  /** Müşterinin "ödemeyi yaptım" beyanı. Geri kazanımın ÖN KOŞULU. */
  balanceDeclaredAt?: Date | null;
};

/**
 * K4.1 — ödenen hizmetten geri kazanım.
 *
 * İKİ KEZ YAZMAZ: aynı randevu için daha önce kazanım varsa atlanır. Ayırt edici
 * anahtar `detail` alanındaki randevu kimliği.
 *
 * ÖN KOŞUL: müşterinin ödeme beyanı. Kurucu (05.09.2026): "müşteri ödeme
 * yaptım butonuna bastığında ayna para kazanıyor. eğer bunu yapmazsa
 * kazanamaz." Eskiden puan yalnız TAMAMLANMAYA bağlıydı; uzmanın sessiz
 * kalması sonucu zamanlayıcı randevuyu 24 saat sonra kendiliğinden kapatıyor
 * ve müşteri hiçbir şey beyan etmeden puan kazanıyordu.
 */
export async function grantCompletionCashback(
  prisma: PrismaService,
  bookings: ReadonlyArray<CompletedBooking>,
): Promise<number> {
  const uygun = bookings.filter(
    (b): b is CompletedBooking & { userId: string } => !!b.userId && !!b.balanceDeclaredAt,
  );
  if (uygun.length === 0) return 0;

  const setting = await prisma.setting.findUnique({ where: { key: CASHBACK_SETTING_KEY } });
  const pct = setting?.intValue ?? DEFAULT_CASHBACK_PCT;

  const zaten = await prisma.loyaltyEntry.findMany({
    where: { reason: CASHBACK_REASON, detail: { in: uygun.map((b) => b.id) } },
    select: { detail: true },
  });
  const yazilmis = new Set(zaten.map((e) => e.detail));

  const grants = uygun
    .filter((b) => !yazilmis.has(b.id))
    .map((b) => ({
      userId: b.userId,
      reason: CASHBACK_REASON,
      detail: b.id,
      // Kasada ödenen tutardan: fiyat değiştiyse puan da ona göre doğar.
      points: cashbackPoints(odenenTutar(b), pct),
    }))
    .filter((g) => g.points > 0);

  return grantPoints(prisma, grants);
}

/**
 * D9 / §8.2 — referans ödülü.
 *
 * Ödül eskiden davet kodu kullanıldığı ANDA veriliyordu. Bu, sahte davet
 * ekonomisine açıktı: kayıt olup kodu girmek 300 puan kazanmaya yetiyordu,
 * platformda hiçbir şey yapmaya gerek yoktu. Şartname §8.2 ödülü "davet edilen
 * kişinin ilk tamamlanmış randevusundan sonra" veriyor.
 *
 * İki kez ödeme `referralRewardedAt` damgasıyla engelleniyor. Kuralın
 * öncesinde kod kullanmış hesaplar migration'da damgalandı — onlar zaten
 * ödenmişti; damgalanmasalardı ilk randevularında İKİNCİ kez ödeneceklerdi.
 */
export async function settleReferrals(
  prisma: PrismaService,
  bookings: ReadonlyArray<CompletedBooking>,
): Promise<number> {
  const userIds = [...new Set(bookings.map((b) => b.userId).filter((x): x is string => !!x))];
  if (userIds.length === 0) return 0;

  const davetliler = await prisma.user.findMany({
    where: { id: { in: userIds }, referredBy: { not: null }, referralRewardedAt: null },
    select: { id: true, name: true, referredBy: true },
  });
  if (davetliler.length === 0) return 0;

  const davetEdenIds = [
    ...new Set(davetliler.map((u) => u.referredBy).filter((x): x is string => !!x)),
  ];
  const davetEdenler = new Map(
    (
      await prisma.user.findMany({
        where: { id: { in: davetEdenIds } },
        select: { id: true, name: true },
      })
    ).map((u) => [u.id, u.name]),
  );

  let odenen = 0;
  for (const davetli of davetliler) {
    const davetEdenAdi = davetEdenler.get(davetli.referredBy!);
    // Davet eden hesap silinmişse ödül yapılamaz; damgayı da atmıyoruz ki
    // hesap geri gelirse ödül yine yapılabilsin.
    if (davetEdenAdi === undefined) continue;

    // Damgayı ÖNCE ve koşullu yaz: iki eşzamanlı tamamlanma aynı kullanıcı için
    // ödülü iki kez yazamasın. updateMany 0 döndürürse başkası kazandı.
    const kilit = await prisma.user.updateMany({
      where: { id: davetli.id, referralRewardedAt: null },
      data: { referralRewardedAt: new Date() },
    });
    if (kilit.count === 0) continue;

    await grantPoints(prisma, [
      {
        userId: davetli.referredBy!,
        reason: REFERRAL_REASON,
        detail: davetli.name,
        points: REFERRAL_POINTS,
      },
      {
        userId: davetli.id,
        reason: REFERRAL_REASON,
        detail: davetEdenAdi,
        points: REFERRAL_POINTS,
      },
    ]);
    odenen += 1;
  }
  return odenen;
}

/** Tamamlanan randevuların tüm puan ödüllerini yazar. */
export async function grantCompletionRewards(
  prisma: PrismaService,
  bookings: ReadonlyArray<CompletedBooking>,
): Promise<{ cashback: number; referrals: number }> {
  // İkisi bağımsız: biri patlarsa diğeri yine yazılmalı.
  const [cashback, referrals] = await Promise.all([
    grantCompletionCashback(prisma, bookings).catch(() => 0),
    settleReferrals(prisma, bookings).catch(() => 0),
  ]);
  return { cashback, referrals };
}
