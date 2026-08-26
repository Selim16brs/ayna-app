import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  SLOT_CONFLICT_COUNT_SQL,
  SLOT_KEY_BACKFILL_SQL,
  SLOT_KEY_FUNCTION_SQL,
  SLOT_KEY_TRIGGER_SQL,
} from './slot-key.sql';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.installSlotKeyGuard();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  // A3 — slot benzersizliği trigger'ını her açılışta idempotent olarak kurar.
  //
  // Açılışta kurulmasının sebebi dağıtım biçimi: üretim `prisma migrate deploy`
  // değil `prisma db push` ile açılıyor, yani `migrations/` klasörü üretimde hiç
  // çalışmıyor. Trigger yalnız migration'da dursaydı üretime hiç gitmezdi.
  //
  // Kurulum BAŞARISIZ OLURSA API yine de ayağa kalkar: uygulama katmanındaki
  // advisory-lock koruması üç yazım yolunda da yerinde duruyor, trigger onun
  // üstüne gelen ikinci savunma. Sessiz kalmaz — hata log'a yazılır.
  private async installSlotKeyGuard(): Promise<void> {
    try {
      await this.$executeRawUnsafe(SLOT_KEY_FUNCTION_SQL);
      for (const stmt of SLOT_KEY_TRIGGER_SQL) await this.$executeRawUnsafe(stmt);
      await this.$executeRawUnsafe(SLOT_KEY_BACKFILL_SQL);
      const [row] = await this.$queryRawUnsafe<{ adet: number }[]>(SLOT_CONFLICT_COUNT_SQL);
      const adet = row?.adet ?? 0;
      if (adet > 0) {
        // Doldurmadan sonra anahtarsız kalan aktif randevu = gerçek çift rezervasyon.
        // Bugünden sonra yenisi oluşamaz; bunlar geçmişten kalanlar ve elle çözülmeli.
        this.log.error(
          `slot-key: ${adet} aktif randevu çift rezervasyon durumunda — elle çözülmeli`,
        );
      } else {
        this.log.log('slot-key: trigger kuruldu, çakışan aktif randevu yok');
      }
    } catch (e) {
      this.log.error(
        `slot-key: trigger kurulamadı — DB seviyesinde slot koruması YOK, uygulama katmanı devrede: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }
}
