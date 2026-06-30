import { Module } from '@nestjs/common';
import { AdminGuard } from '../common/admin.guard';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';

@Module({
  controllers: [MarketController],
  providers: [MarketService, AdminGuard],
})
export class MarketModule {}
