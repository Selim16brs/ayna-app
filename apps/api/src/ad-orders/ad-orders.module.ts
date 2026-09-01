import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { AdOrdersAdminController } from './ad-orders-admin.controller';
import { AdOrdersController } from './ad-orders.controller';
import { AdOrdersService } from './ad-orders.service';

@Module({
  imports: [PushModule],
  controllers: [AdOrdersController, AdOrdersAdminController],
  providers: [AdOrdersService],
})
export class AdOrdersModule {}
