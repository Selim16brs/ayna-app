import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CommissionsAdminController } from './commissions-admin.controller';
import { CommissionsController } from './commissions.controller';
import { CommissionsService } from './commissions.service';
import { FinanceScheduler } from './finance.scheduler';

@Module({
  imports: [SubscriptionsModule, PushModule],
  controllers: [CommissionsController, CommissionsAdminController],
  providers: [CommissionsService, FinanceScheduler],
  exports: [CommissionsService],
})
export class CommissionsModule {}
