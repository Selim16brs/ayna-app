import { Module } from '@nestjs/common';
import { AdminGuard } from '../common/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BookingsModule } from '../bookings/bookings.module';
import { PushModule } from '../push/push.module';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';

@Module({
  // PushModule: kadrodan çıkarılan uzmana bildirim (§4.5 sessiz silme yasak).
  imports: [BookingsModule, PushModule],
  controllers: [BusinessesController],
  providers: [BusinessesService, JwtAuthGuard, AdminGuard],
})
export class BusinessesModule {}
