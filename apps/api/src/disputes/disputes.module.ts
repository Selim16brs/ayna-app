import { Module } from '@nestjs/common';
import { DisputesAdminController } from './disputes-admin.controller';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';

@Module({
  controllers: [DisputesController, DisputesAdminController],
  providers: [DisputesService],
})
export class DisputesModule {}
