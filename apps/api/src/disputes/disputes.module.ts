import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { DisputesAdminController } from './disputes-admin.controller';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';

@Module({
  imports: [PushModule],
  controllers: [DisputesController, DisputesAdminController],
  providers: [DisputesService],
})
export class DisputesModule {}
