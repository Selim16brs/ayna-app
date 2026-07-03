import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

// Public — app parametrik oranları/şehirleri/özellik erişimini buradan okur
@ApiTags('config')
@Controller()
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('config')
  config() {
    return this.settings.publicConfig();
  }
}
