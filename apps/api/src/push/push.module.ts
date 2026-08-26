import { Module } from '@nestjs/common';
import { OutboxScheduler } from './outbox.scheduler';
import { PushController } from './push.controller';
import { PushService } from './push.service';

// PushService dışa açılır → başka modüller (messaging, safety) push gönderebilir.
// OutboxScheduler §10.3 — teslim edilemeyen bildirimleri tekrar dener.
@Module({
  controllers: [PushController],
  providers: [PushService, OutboxScheduler],
  exports: [PushService],
})
export class PushModule {}
