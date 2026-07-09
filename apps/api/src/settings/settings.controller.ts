import { Controller, Get } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

// Public — app parametrik oranları/şehirleri/özellik erişimini buradan okur
@ApiTags('config')
@Controller()
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly storage: StorageService,
  ) {}

  @Get('config')
  config() {
    return this.settings.publicConfig();
  }

  // Teşhis: R2 depolama durumu (secret YOK) — kurulum doğrulaması için
  @Get('storage-status')
  storageStatus() {
    return this.storage.status();
  }
}
