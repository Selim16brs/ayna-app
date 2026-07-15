import { Module } from '@nestjs/common';
import { OffersModule } from '../offers/offers.module';
import { PushModule } from '../push/push.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [PushModule, OffersModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
