import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { QuotesScheduler } from './quotes.scheduler';

// §5.2 Faz A — reverse marketplace çekirdek akışı (talep→teklif→seçim→randevu)
@Module({
  imports: [PushModule],
  controllers: [QuotesController],
  providers: [QuotesService, QuotesScheduler],
})
export class QuotesModule {}
