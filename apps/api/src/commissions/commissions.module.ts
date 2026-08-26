import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CommissionsAdminController } from './commissions-admin.controller';
import { CommissionsController } from './commissions.controller';
import { CommissionsService } from './commissions.service';
import { FinanceScheduler } from './finance.scheduler';

@Module({
  imports: [SubscriptionsModule],
  controllers: [CommissionsController, CommissionsAdminController],
  providers: [CommissionsService, FinanceScheduler],
})
export class CommissionsModule {}
