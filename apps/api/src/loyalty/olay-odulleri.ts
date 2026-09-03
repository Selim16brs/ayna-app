import type { PrismaService } from '../prisma/prisma.service';
import { grantPoints } from './loyalty.grant';

/**
 * OLAYA BAĞLI PUAN — kazanımın TEK meşru kaynağı.
 *
 * ── NEDEN YAZILDI ───────────────────────────────────────────────────────
 *
 * Kurucu: "puan ekonomisini kontrol ettim ve orda kullanıcının
 * gerçekleştirmediği şeylerden puan kazandığını düşünüyorum. böyle bir işlem
 * dışı hareket olması söz konusu mu? eğer varsa bu ciddi sorun oluşturur.
 * dürüst çalışmamız lazım."
 *
 * Şüphesi doğruydu. Canlı veritabanı denetimi:
 *
 *   rewards.earn.provider_noshow   1000 puan verilmiş — o kullanıcının
 *                                  `no_show_uzman` durumunda SIFIR randevusu var
 *   rewards.earn.review            6 kez puan (240) — gerçek yorum sayısı 1
 *   rewards.earn.first_booking      300 puan — 1 tamamlanmış randevu (bu doğru)
 *
 * Yani 1200 puan (= 1200 ₸) karşılığı olmayan olaydan verilmişti.
 *
 * ── SEBEBİ ──────────────────────────────────────────────────────────────
 *
 * `POST /loyalty/earn` istemcinin BEYANIYLA çalışıyordu. Sunucu tutarı ve
 * günlük adedi denetliyordu ama OLAYIN OLUP OLMADIĞINI hiç sormuyordu.
 * Giriş yapmış herhangi biri "uzman gelmedi" deyip günde 2000 ₸ basabilirdi;
 * puan bir ödemenin %50'sini karşıladığı için bu gerçek para demek.
 *
 * Kodun kendi yorumu da bunu biliyordu: "Bu bir ARA ÇÖZÜMDÜR. Kalıcı çözüm,
 * kazanımın istemci çağrısıyla değil sunucudaki gerçek olayla tetiklenmesidir."
 * Bu dosya o kalıcı çözüm.
 *
 * ── KURAL ───────────────────────────────────────────────────────────────
 *
 * Her fonksiyon, puanı yazmadan önce olayın veritabanındaki KANITINI
 * okuyor. Kanıt yoksa puan yok. Ve hepsi TEKRARA DAYANIKLI: `detail`
 * alanında olayın kimliği duruyor, aynı olay ikinci kez puan üretemiyor.
 */

/** Doğrulanmış yorum ödülü. */
const YORUM_PUANI = 40;
/** İlk tamamlanmış randevu ödülü — ömür boyu bir kez. */
const ILK_RANDEVU_PUANI = 300;
/** Uzman gelmedi telafisi. */
const UZMAN_GELMEDI_PUANI = 1000;

export const YORUM_SEBEP = 'rewards.earn.review';
export const ILK_RANDEVU_SEBEP = 'rewards.earn.first_booking';
export const UZMAN_GELMEDI_SEBEP = 'rewards.earn.provider_noshow';

/** Bu olay için daha önce puan yazılmış mı? */
async function zatenVerildi(
  prisma: PrismaService,
  userId: string,
  reason: string,
  detail: string,
): Promise<boolean> {
  const v = await prisma.loyaltyEntry.findFirst({ where: { userId, reason, detail } });
  return v !== null;
}

/**
 * YORUM ÖDÜLÜ — yorum GERÇEKTEN yazıldıktan sonra çağrılır.
 *
 * `detail` randevu kimliği: aynı randevunun yorumu ikinci kez puan üretemez.
 * Eskiden istemci her "değerlendir" dokunuşunda puan istiyordu ve sunucu
 * yorumun var olup olmadığına bakmıyordu — canlıda 1 yoruma 6 ödül çıkmasının
 * sebebi buydu.
 */
export async function yorumOdulu(
  prisma: PrismaService,
  userId: string,
  bookingId: string,
): Promise<number> {
  const yorum = await prisma.rating.findFirst({ where: { bookingId, raterRole: 'user' } });
  if (!yorum) return 0; // kanıt yok → puan yok
  if (await zatenVerildi(prisma, userId, YORUM_SEBEP, bookingId)) return 0;
  return grantPoints(prisma, {
    userId,
    reason: YORUM_SEBEP,
    detail: bookingId,
    points: YORUM_PUANI,
  });
}

/**
 * İLK RANDEVU ÖDÜLÜ — ömür boyu bir kez, TAMAMLANMIŞ randevu şartıyla.
 *
 * Sebep bazında tekillik `detail`e değil sebebin kendisine bakıyor: "ilk"
 * olmanın tanımı bu.
 */
export async function ilkRandevuOdulu(prisma: PrismaService, userId: string): Promise<number> {
  const tamam = await prisma.booking.findFirst({
    where: { userId, status: { in: ['tamamlandi', 'degerlendirme', 'kapandi'] } },
  });
  if (!tamam) return 0;
  const zaten = await prisma.loyaltyEntry.findFirst({
    where: { userId, reason: ILK_RANDEVU_SEBEP },
  });
  if (zaten) return 0;
  return grantPoints(prisma, {
    userId,
    reason: ILK_RANDEVU_SEBEP,
    detail: tamam.id,
    points: ILK_RANDEVU_PUANI,
  });
}

/**
 * UZMAN GELMEDİ TELAFİSİ — randevu GERÇEKTEN `no_show_uzman` olduysa.
 *
 * En kritik olanı: tek başına 1000 ₸ ve canlıda hiç gerçekleşmemiş bir
 * olaydan verilmişti.
 */
export async function uzmanGelmediOdulu(prisma: PrismaService, bookingId: string): Promise<number> {
  const b = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!b || !b.userId || b.status !== 'no_show_uzman') return 0;
  if (await zatenVerildi(prisma, b.userId, UZMAN_GELMEDI_SEBEP, bookingId)) return 0;
  return grantPoints(prisma, {
    userId: b.userId,
    reason: UZMAN_GELMEDI_SEBEP,
    detail: bookingId,
    points: UZMAN_GELMEDI_PUANI,
  });
}
