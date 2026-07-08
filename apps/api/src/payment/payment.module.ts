import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { PaymentController } from './payment.controller';
import { KaspiSimAdapter, PAYMENT_PROVIDER } from './payment.provider';
import { PaymentService } from './payment.service';

// PAYMENT_PROVIDER → şimdilik Kaspi simülasyon adaptörü.
// Gerçek merchant erişimi gelince yalnız bu satır KaspiLiveAdapter'a döner.
@Module({
  imports: [PushModule],
  controllers: [PaymentController],
  providers: [PaymentService, { provide: PAYMENT_PROVIDER, useClass: KaspiSimAdapter }],
})
export class PaymentModule {}
