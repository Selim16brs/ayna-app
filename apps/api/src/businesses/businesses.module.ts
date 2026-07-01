import { Module } from '@nestjs/common';
import { AdminGuard } from '../common/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BookingsModule } from '../bookings/bookings.module';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';

@Module({
  imports: [BookingsModule],
  controllers: [BusinessesController],
  providers: [BusinessesService, JwtAuthGuard, AdminGuard],
})
export class BusinessesModule {}
