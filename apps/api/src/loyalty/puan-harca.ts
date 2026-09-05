import type { Prisma } from '@prisma/client';
import { loadLedgerState } from './loyalty.rules';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * PUAN HARCAMANIN TEK KAPISI — çift harcama yarışına kapalı.
 *
 * ── SORUN ────────────────────────────────────────────────────────────────
 *
 * Harcayan iki yol da (ödül kullanımı, depozitoda puan) şu kalıbı
 * kullanıyordu:
 *
 *     const bakiye = await bakiyeyiOku();     // 1) OKU
 *     if (bakiye < tutar) throw;              // 2) KONTROL ET
 *     await defterYaz(-tutar);                // 3) YAZ
 *
 * Arada iki `await` var ve hiçbir kilit yok. Aynı kullanıcıdan gelen İKİ
 * eşzamanlı istek (telefonda çift dokunuş yeter, API zaten açık) ikisi de
 * aynı bakiyeyi okuyor, ikisi de kontrolü geçiyor ve ikisi de yazıyor:
 *
 *     1.000 puan · 1.000'lik ödül × 2 istek → bakiye −1.000
 *
 * Yani kullanıcı bakiyesinin iki katını harcayabiliyordu. Defter okuyucusu
 * bunu `overspent` diye SAYIYOR ve log'a yazıyordu — yani sonucu görüyorduk,
 * sebebini engellemiyorduk.
 *
 * ── ÇÖZÜM ────────────────────────────────────────────────────────────────
 *
 * Oku-kontrol-yaz üçlüsü TEK transaction içinde ve kullanıcı satırı
 * kilitlenerek yapılıyor (`FOR UPDATE`). Aynı kullanıcının ikinci isteği
 * birincisi bitene kadar bekliyor ve GÜNCEL bakiyeyi okuyor.
 *
 * Kilit KULLANICI satırında: iki farklı kullanıcının harcaması birbirini
 * beklemiyor.
 */

export type HarcamaSonucu =
  | { readonly ok: true; readonly harcanan: number; readonly kalan: number }
  | { readonly ok: false; readonly sebep: 'YETERSIZ'; readonly bakiye: number };

export type HarcamaGirdisi = {
  userId: string;
  /** i18n anahtarı — defterde `reason`. */
  reason: string;
  detail?: string;
  /** Harcanacak puan (pozitif). */
  points: number;
};

/**
 * Bakiyeyi kilit altında okuyup harcamayı yazar.
 *
 * `hesapla` verilirse, KİLİT ALTINDA okunan güncel bakiyeyle çağrılır ve
 * gerçek harcama tutarını o döndürür — depozito yolu tavanları (bakiyenin
 * %25'i vb.) böyle uyguluyor. Sıfır ya da negatif dönerse hiçbir şey
 * yazılmıyor.
 */
export async function puanHarca(
  prisma: PrismaService,
  girdi: HarcamaGirdisi,
  hesapla?: (bakiye: number) => number,
): Promise<HarcamaSonucu> {
  return prisma.$transaction(async (tx) => {
    /*
     * SATIR KİLİDİ. `users` satırını kilitliyoruz çünkü defterde kilitlenecek
     * tek bir satır yok (append-only). Aynı kullanıcının ikinci harcaması
     * burada bekliyor.
     */
    await tx.$executeRaw`SELECT id FROM users WHERE id = ${girdi.userId}::uuid FOR UPDATE`;
    const durum = await loadLedgerState(tx as unknown as PrismaService, girdi.userId);
    const bakiye = durum.available;
    const istenen = hesapla ? hesapla(bakiye) : girdi.points;
    const tutar = Number.isFinite(istenen) ? Math.floor(istenen) : 0;
    if (tutar <= 0) return { ok: false as const, sebep: 'YETERSIZ' as const, bakiye };
    if (tutar > bakiye) return { ok: false as const, sebep: 'YETERSIZ' as const, bakiye };
    await tx.loyaltyEntry.create({
      data: {
        userId: girdi.userId,
        kind: 'spend',
        reason: girdi.reason,
        detail: girdi.detail ?? '',
        points: -tutar,
      },
    });
    return { ok: true as const, harcanan: tutar, kalan: bakiye - tutar };
  });
}

/** Transaction istemcisi — testlerin sahte nesnesi bu şekle uyuyor. */
export type TxClient = Prisma.TransactionClient;
