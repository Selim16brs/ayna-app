import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BasariService } from './basari.service';

/**
 * Başarı hesabı TEK YERDE: hem uzmanın paneli hem müşterinin listesi
 * buradan besleniyor, iki farklı yüzde doğamıyor.
 */
@Module({
  imports: [PrismaModule],
  providers: [BasariService],
  exports: [BasariService],
})
export class BasariModule {}
