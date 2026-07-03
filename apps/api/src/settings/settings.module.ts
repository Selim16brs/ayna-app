import { Module } from '@nestjs/common';
import { SettingsAdminController } from './settings-admin.controller';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController, SettingsAdminController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
