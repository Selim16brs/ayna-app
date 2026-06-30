import { Module } from '@nestjs/common';
import { AdminGuard } from '../common/admin.guard';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';

@Module({
  controllers: [RatingsController],
  providers: [RatingsService, AdminGuard],
})
export class RatingsModule {}
