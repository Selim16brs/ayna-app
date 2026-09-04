import { Injectable } from '@nestjs/common';
import type { BookingStatus } from '@prisma/client';
import { type BasariSonucu, uzmanBasarisi } from '@ayna/domain';
import { PrismaService } from '../prisma/prisma.service';

/**
 * BAŞARI YÜZDESİ — TEK KOD YOLU.
 *
 * Kurucu önce "uzmanlar başarı durumlarına göre yüzde üzerinden
 * değerlendirilir" dedi, sonra "müşteriye de göster".
 *
 * ── NEDEN AYRI BİR SERVİS ───────────────────────────────────────────────
 *
 * Aynı yüzde iki yerde görünüyor: uzmanın kendi paneli ve müşterinin
 * gördüğü liste. Hesabı iki yerde yazsaydım — ki ilk sürümde öyleydi ve
 * bu yüzden müşteriye HİÇ göstermemiştim — panel cevap süresini ölçüp
 * liste ölçmediği için AYNI uzman iki farklı yüzde gösterirdi. Hangisinin
 * doğru olduğunu kimse söyleyemezdi.
 *
 * Artık ikisi de burayı çağırıyor: ayrışacak bir şey yok.
 *
 * ── N+1 YOK ─────────────────────────────────────────────────────────────
 *
 * Liste yüzlerce sağlayıcı için çağırıyor. Üç sorgu var ve üçü de TOPLU;
 * sağlayıcı başına sorgu açılmıyor.
 */
@Injectable()
export class BasariService {
  constructor(private readonly prisma: PrismaService) {}

  /** Hizmetin gerçekten verildiği durumlar. */
  private static readonly TAMAMLANMIS: BookingStatus[] = ['tamamlandi', 'degerlendirme', 'kapandi'];
  /**
   * Sağlayıcının kararına sunulan randevular.
   *
   * Taslak ve müşteri iptalleri sayılmıyor: müşterinin vazgeçmesi
   * sağlayıcının başarısızlığı değil.
   */
  private static readonly SAYILAN_DISI: BookingStatus[] = ['taslak', 'iptal_musteri'];

  async hesapla(proIds: readonly string[]): Promise<Map<string, BasariSonucu>> {
    const out = new Map<string, BasariSonucu>();
    if (proIds.length === 0) return out;
    const ids = [...new Set(proIds)];

    const [tamamlananlar, gelenler, puanlar, cevaplar] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['proId'],
        where: { proId: { in: ids }, status: { in: BasariService.TAMAMLANMIS } },
        _count: { _all: true },
      }),
      this.prisma.booking.groupBy({
        by: ['proId'],
        where: { proId: { in: ids }, status: { notIn: BasariService.SAYILAN_DISI } },
        _count: { _all: true },
      }),
      this.prisma.rating.groupBy({
        by: ['subjectId'],
        where: {
          subjectId: { in: ids },
          visible: true,
          OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
        },
        _avg: { score: true },
        _count: { _all: true },
      }),
      /*
       * ORTALAMA CEVAP DAKİKASI.
       *
       * Prisma iki sütun ARASINDAKİ farkın ortalamasını alamıyor; ham SQL
       * tek turda yapıyor. Sağlayıcı başına sorgu açmak (N+1) listeyi
       * yüzlerce sorguya boğardı.
       */
      this.prisma.$queryRaw<{ pro_id: string; dk: number | null }[]>`
        SELECT pro_id, AVG(EXTRACT(EPOCH FROM (responded_at - created_at)) / 60) AS dk
        FROM bookings
        WHERE pro_id = ANY(${ids})
          AND responded_at IS NOT NULL
        GROUP BY pro_id
      `,
    ]);

    const tamamMap = new Map(
      tamamlananlar.flatMap((x) => (x.proId ? [[x.proId, x._count?._all ?? 0] as const] : [])),
    );
    const gelenMap = new Map(
      gelenler.flatMap((x) => (x.proId ? [[x.proId, x._count?._all ?? 0] as const] : [])),
    );
    const puanMap = new Map(
      puanlar.map(
        (x) => [x.subjectId, { ort: x._avg?.score ?? null, adet: x._count?._all ?? 0 }] as const,
      ),
    );
    const cevapMap = new Map(
      cevaplar.map((x) => [x.pro_id, x.dk == null ? null : Math.round(Number(x.dk))] as const),
    );

    for (const id of ids) {
      const puan = puanMap.get(id);
      out.set(
        id,
        uzmanBasarisi({
          tamamlanan: tamamMap.get(id) ?? 0,
          gelenTalep: gelenMap.get(id) ?? 0,
          // Değerlendirme YOKSA null: ortalama 0 saymak, hiç
          // değerlendirilmemiş uzmanı en kötü puanlı gibi gösterirdi.
          puanOrt: puan && puan.adet > 0 ? (puan.ort ?? null) : null,
          cevapDk: cevapMap.get(id) ?? null,
        }),
      );
    }
    return out;
  }

  /** Tek sağlayıcı — uzmanın kendi paneli için. */
  async tek(proId: string | null): Promise<BasariSonucu> {
    if (!proId) return { yuzde: null, bilesenler: [] };
    return (await this.hesapla([proId])).get(proId) ?? { yuzde: null, bilesenler: [] };
  }
}
