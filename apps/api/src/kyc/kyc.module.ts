import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { KycAdminController } from './kyc-admin.controller';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';

@Module({
  // Belgeler depoya taşınıyor: ham base64'ü veritabanında tutmak satırı
  // megabaytlara şişirirdi.
  imports: [StorageModule],
  controllers: [KycController, KycAdminController],
  providers: [KycService],
})
export class KycModule {}
