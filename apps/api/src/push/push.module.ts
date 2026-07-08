import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';

// PushService dışa açılır → başka modüller (messaging, safety) push gönderebilir.
@Module({
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
