import { Module } from '@nestjs/common';
import { KycAdminController } from './kyc-admin.controller';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';

@Module({
  controllers: [KycController, KycAdminController],
  providers: [KycService],
})
export class KycModule {}
