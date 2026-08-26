import { Injectable, type OnModuleInit } from '@nestjs/common';
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
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      const mevcut = await this.prisma.serviceCategory.findMany({ select: { code: true } });
      const kodlar = new Set(mevcut.map((c) => c.code));
      const eksik = CATEGORY_IDS.filter((id) => !kodlar.has(id));
      if (eksik.length === 0) return;

      await this.prisma.serviceCategory.createMany({
        data: eksik.map((id) => ({ code: id, ...CATEGORY_META[id] })),
        // Yarış durumunda (iki konteyner aynı anda açılırsa) çakışanı atla.
        skipDuplicates: true,
      });
      // eslint-disable-next-line no-console
      console.log(`[category-sync] eklenen kategori: ${eksik.join(', ')}`);
    } catch {
      // Uyumlama başarısızsa API yine de AÇILMALI — kategori listesi eksik
      // kalır ama servis ayakta kalır.
      // eslint-disable-next-line no-console
      console.warn('[category-sync] kategori uyumlaması başarısız');
    }
  }
}
