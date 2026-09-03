import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { CATEGORY_IDS, CATEGORY_META } from '@ayna/domain';
import { PrismaService } from '../prisma/prisma.service';

/**
 * KATEGORİ TABLOSUNU UYGULAMAYLA AYNI TUT.
 *
 * `service_categories` tablosu 8 satır içeriyordu, uygulamada 12 kategori
 * vardı. Eksik dördün İKİSİ AKTİFTİ (`pmu`, `bridal`): o kategorilerde uzman
 * hizmet veriyordu ama ADMIN PANELİNDE KATEGORİ HİÇ GÖRÜNMÜYORDU — panel bu
 * tabloyu okuyor.
 *
 * Sebep: satırlar tohumlama (seed) ile bir kez yazılmıştı ve üretimde seed
 * çalışmıyor. Liste büyüdükçe tablo sessizce geride kaldı.
 *
 * Çözüm: açılışta EKSİK OLANLARI ekle. Var olanlara DOKUNMA — admin panelden
 * adını/ikonunu değiştirmiş olabilir; her açılışta üzerine yazmak o
 * değişiklikleri sessizce geri alırdı.
 */
@Injectable()
export class CategorySyncService implements OnModuleInit {
  private readonly log = new Logger(CategorySyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      const mevcut = await this.prisma.serviceCategory.findMany({ select: { code: true } });
      const kodlar = new Set(mevcut.map((c) => c.code));
      const eksik = CATEGORY_IDS.filter((id) => !kodlar.has(id));
      if (eksik.length === 0) return;

      await this.prisma.serviceCategory.createMany({
        // Meta'sı olmayan kimlik yazılmıyor: kod/ad boş bir satır panelde
        // adsız bir kategori olarak görünürdü.
        data: eksik.flatMap((id) => {
          const meta = CATEGORY_META[id];
          return meta ? [{ code: id, ...meta }] : [];
        }),
        // Yarış durumunda (iki konteyner aynı anda açılırsa) çakışanı atla.
        skipDuplicates: true,
      });
      this.log.log(`eklenen kategori: ${eksik.join(', ')}`);
    } catch {
      // Uyumlama başarısızsa API yine de AÇILMALI — kategori listesi eksik
      // kalır ama servis ayakta kalır.
      this.log.warn('kategori uyumlaması başarısız');
    }
  }
}
