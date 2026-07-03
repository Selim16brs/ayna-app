import { Module } from '@nestjs/common';
import { CommissionsAdminController } from './commissions-admin.controller';
import { CommissionsController } from './commissions.controller';
import { CommissionsService } from './commissions.service';

@Module({
  controllers: [CommissionsController, CommissionsAdminController],
  providers: [CommissionsService],
})
export class CommissionsModule {}
