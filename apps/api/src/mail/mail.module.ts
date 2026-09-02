import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MailController } from './mail.controller';
import { MailScheduler } from './mail.scheduler';
import { MailerService } from './mailer.service';

/**
 * AYNA e-posta modülü.
 *
 * `MailerService` dışa aktarılıyor: işlemsel postalar (randevu onayı,
 * depozito alındı) zamanlayıcıdan değil, ilgili modülden tetiklenecek.
 */
@Module({
  imports: [PrismaModule],
  controllers: [MailController],
  providers: [MailerService, MailScheduler],
  exports: [MailerService],
})
export class MailModule {}
