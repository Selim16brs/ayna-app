import { Module } from '@nestjs/common';
import { SubscriptionsAdminController } from './subscriptions-admin.controller';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  controllers: [SubscriptionsController, SubscriptionsAdminController],
  providers: [SubscriptionsService],
})
export class SubscriptionsModule {}
