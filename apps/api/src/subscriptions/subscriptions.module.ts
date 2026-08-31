import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { SubscriptionsAdminController } from './subscriptions-admin.controller';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsScheduler } from './subscriptions.scheduler';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [PushModule],
  controllers: [SubscriptionsController, SubscriptionsAdminController],
  providers: [SubscriptionsService, SubscriptionsScheduler],
  exports: [SubscriptionsService], // finans zamanlayıcısı expireDue()'yu çağırır
})
export class SubscriptionsModule {}
