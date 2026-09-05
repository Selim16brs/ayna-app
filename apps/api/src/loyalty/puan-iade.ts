import { grantPoints } from './loyalty.grant';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * DEPOZİTODA KULLANILAN PUANIN İADESİ.
 *
 * ── SORUN ────────────────────────────────────────────────────────────────
 *
 * Müşteri depozitonun bir kısmını puanla ödeyebiliyor (§5, en çok bakiyenin
 * %25'i). Randevu iptal edilip iade hakkı doğduğunda ise iade tutarı
 * DEPOZİTONUN TAMAMIYDI — puanla kapatılan kısım dahil.
 *
 * İki sonucu vardı:
 *   1. PUAN NAKDE ÇEVRİLİYORDU. Müşteri randevu alır, depozitonun %25'ini
 *      puanla öder, hemen (ücretsiz iptal penceresinde) iptal eder ve
 *      TAMAMINI nakit geri alır. Puan bedava para değil, AYNA'nın
 *      sübvansiyonu; nakde dönüşmesi doğrudan kasa açığı.
 *   2. Sahte dekont geri alındığında (admin) puan hiç iade edilmiyordu:
 *      müşteri doğru dekontu yüklerken İKİNCİ KEZ puan harcıyordu.
 *
 * ── ÇÖZÜM ────────────────────────────────────────────────────────────────
 *
 * Nakit iade = gerçekten ödenen nakit (depozito − puan). Puanla ödenen kısım
 * kullanıcıya PUAN olarak geri veriliyor. Kullanıcı hiçbir şey kaybetmiyor,
 * puan da paraya dönüşmüyor.
 */

export const PUAN_IADE_SEBEBI = 'rewards.refund.deposit';
export const PUAN_HARCAMA_SEBEBI = 'rewards.spend.deposit';

/**
 * Bu randevuda harcanmış ama HENÜZ İADE EDİLMEMİŞ puanı geri verir.
 *
 * Tutar defterden türetiliyor (harcanan − iade edilen), bayraktan değil:
 *   · İki kez çağrılırsa ikincisi 0 yazıyor — çift iade imkânsız.
 *   · Dekont geri alınıp yeniden yüklendiğinde (yeni harcama) yeni iade
 *     hakkı doğuyor. Basit bir "daha önce iade edildi mi" kontrolü burada
 *     yanlış cevap verirdi: ikinci harcama sonsuza kadar iade edilemezdi.
 */
export async function randevuPuaniniIadeEt(
  prisma: PrismaService,
  bookingId: string,
  userId: string | null,
): Promise<number> {
  if (!userId) return 0;
  const kayitlar = await prisma.loyaltyEntry.findMany({
    where: { userId, detail: bookingId, reason: { in: [PUAN_HARCAMA_SEBEBI, PUAN_IADE_SEBEBI] } },
    select: { reason: true, points: true },
  });
  let harcanan = 0;
  let iadeEdilen = 0;
  for (const k of kayitlar) {
    if (k.reason === PUAN_HARCAMA_SEBEBI) harcanan += Math.abs(k.points);
    else iadeEdilen += Math.abs(k.points);
  }
  const kalan = harcanan - iadeEdilen;
  if (kalan <= 0) return 0;
  await grantPoints(prisma, [
    { userId, reason: PUAN_IADE_SEBEBI, detail: bookingId, points: kalan },
  ]);
  return kalan;
}

/**
 * İADE EDİLECEK NAKİT — depozitodan puanla kapatılan kısım DÜŞÜLMÜŞ hâli.
 *
 * Negatife düşmez: puan tutarı depozitoyu aşamaz (`paymentSplit` zaten
 * sınırlıyor) ama veri bozulsa bile kasadan para çıkmasın.
 */
export function iadeEdilecekNakit(depositAmount: unknown, pointsUsed: unknown): number {
  const depozito = Number(depositAmount);
  const puan = Number(pointsUsed);
  const d = Number.isFinite(depozito) && depozito > 0 ? depozito : 0;
  const p = Number.isFinite(puan) && puan > 0 ? puan : 0;
  return Math.max(0, d - p);
}
