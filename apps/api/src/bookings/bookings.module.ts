import { Module } from '@nestjs/common';
import { OffersModule } from '../offers/offers.module';
import { PushModule } from '../push/push.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingsScheduler } from './bookings.scheduler';

@Module({
  imports: [PushModule, OffersModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsScheduler],
  exports: [BookingsService],
})
export class BookingsModule {}
