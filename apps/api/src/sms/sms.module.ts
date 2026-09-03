import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SmsService } from './sms.service';

/**
 * SMS modülü. `SmsService` dışa aktarılıyor: şimdilik tek kullanan OTP
 * akışı ama randevu hatırlatması gibi gönderimler de buradan geçecek —
 * sağlayıcı ve sınır politikası tek yerde kalsın.
 */
@Module({
  imports: [PrismaModule],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
