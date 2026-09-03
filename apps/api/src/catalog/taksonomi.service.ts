import { Injectable } from '@nestjs/common';
import { KATALOG, katalogHizmetKimlikleri, type KatalogKategorisi } from '@ayna/domain';
import { PrismaService } from '../prisma/prisma.service';

/**
 * HİZMET TAKSONOMİSİ — sunucu görünümü.
 *
 * Kaynak: `AYNA_HIZMET_KATALOGU_BRIEF.md` v1.0.
 *
 * ── KATALOG NEREDE ──────────────────────────────────────────────────────
 *
 * İçerik `@ayna/domain`de (tek doğruluk kaynağı, brief §1). Bu servis onu
 * OKUYOR ve üstüne iki DEĞİŞKEN katman ekliyor:
 *
 *   1. SIRALAMA override — brief §7.3: "Admin panelden değiştirilebilir
 *      olmalı." Varsayılan sıra katalogda; admin değiştirdiyse veritabanı
 *      kazanıyor.
 *   2. "YAKINDA" rozeti — brief §7.4: "alt hizmette aktif ve yayında en az
 *      1 uzman yoksa rozet görünür."
 *
 * İçeriği veritabanına kopyalamıyoruz. Kopyalasaydık iki katalog olurdu ve
 * biri güncellenip diğeri kalırdı — brief'in §1'de yasakladığı şey.
 *
 * ── "YAKINDA" NEDEN HESAPLANIYOR, SAKLANMIYOR ───────────────────────────
 *
 * Uzman yayına girip çıktıkça durum değişiyor. Saklansaydı bayatlar ve
 * müşteri var olan bir uzmanı "Yakında" diye görürdü. Her istekte tek bir
 * gruplama sorgusu — bayat veri riskine değmez.
 */
@Injectable()
export class TaksonomiService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Hangi alt hizmetlerde YAYINDA en az bir uzman var?
   *
   * `servicesJson` uzmanın gerçek hizmet listesini taşıyor ve içinde alt
   * hizmet kimlikleri geçiyor. Metin araması yerine kimlikleri tek tek
   * saymak N+1 sorgu üretirdi; tek geçişte topluyoruz.
   */
  private async arziOlanlar(): Promise<Set<string>> {
    /*
     * Yayında olmayan uzman ARZ SAYILMAZ. `Specialist.hiddenUntil` ceza
     * süresini tutuyor; süresi geçmişse uzman yine yayında.
     */
    const simdi = new Date();
    const gizli = await this.prisma.specialist.findMany({
      where: { hiddenUntil: { gt: simdi } },
      select: { proId: true },
    });
    const gizliPro = new Set(gizli.map((g) => g.proId).filter((x): x is string => !!x));

    const satirlar = await this.prisma.professional.findMany({
      select: { id: true, servicesJson: true },
    });
    const bulunan = new Set<string>();
    for (const p of satirlar) {
      if (gizliPro.has(p.id)) continue;
      /*
       * `servicesJson` uzmanın GERÇEK hizmet listesi. Brief §4.1: her
       * manuel hizmet mutlaka bir alt hizmete bağlı — bağ `serviceId`.
       */
      try {
        /*
         * Kimliğin hangi alandan okunacağı `@ayna/domain`de — yazan taraf
         * da oradan geçiyor. Burada `serviceId` aranıyordu ama uygulama
         * `id` yazıyor: hata vermeden BÜTÜN katalog "Yakında" görünürdü.
         */
        for (const id of katalogHizmetKimlikleri(JSON.parse(p.servicesJson ?? '[]')))
          bulunan.add(id);
      } catch {
        // Bozuk JSON tek bir uzmanın kaydı; katalogu düşürmemeli.
      }
    }
    return bulunan;
  }

  /** Admin'in değiştirdiği sıra. Yoksa katalog sırası geçerli. */
  private async siraOverride(): Promise<Map<string, number>> {
    const rows = await this.prisma.serviceCategory.findMany({
      select: { code: true, sortOrder: true },
    });
    return new Map(rows.map((r) => [r.code, r.sortOrder]));
  }

  /**
   * Tam taksonomi + "Yakında" durumu.
   *
   * Dil ÇÖZÜLMÜYOR: üç adı da gönderiyoruz. İstemci dili değiştirdiğinde
   * yeniden istek atmak zorunda kalmasın diye — katalog küçük, üç dil
   * taşımak ucuz.
   */
  async taksonomi() {
    const [arz, sira] = await Promise.all([this.arziOlanlar(), this.siraOverride()]);

    const kategoriler = [...KATALOG]
      .map((k: KatalogKategorisi, i: number) => ({
        id: k.id,
        ad: k.ad,
        ikonKonsepti: k.ikonKonsepti,
        // Admin sırası varsa o, yoksa katalogdaki yer.
        sira: sira.get(k.id) ?? i,
        altHizmetler: k.altHizmetler.map((a) => ({
          id: a.id,
          kod: a.kod,
          ad: a.ad,
          /*
           * Brief §7.4: arz yoksa rozet görünür AMA müşteri yine talep
           * oluşturabilir — "reverse marketplace mantığının kalbi arz
           * yoksa bile talep toplamaktır."
           */
          yakinda: !arz.has(a.id),
        })),
      }))
      .sort((a, b) => a.sira - b.sira);

    return { kategoriler };
  }
}
