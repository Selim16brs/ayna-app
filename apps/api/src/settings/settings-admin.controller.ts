import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminGuard } from '../common/admin.guard';
import type { AuthedRequest } from '../auth/jwt-auth.guard';
import {
  type ApiKeyInput,
  type CitiesInput,
  type RateInput,
  apiKeySchema,
  citiesSchema,
  rateSchema,
} from './settings.dto';
import { SettingsService } from './settings.service';

// §12.9 Sistem Ayarları — yalnızca admin
@ApiTags('admin-system')
@Controller('admin/system')
@UseGuards(AdminGuard)
export class SettingsAdminController {
  constructor(private readonly settings: SettingsService) {}

  // Tüm ayarlar tek çağrıda (oranlar + maskeli anahtarlar + şehirler)
  @Get()
  async all() {
    const [rates, apiKeys, cities] = await Promise.all([
      this.settings.rates(),
      this.settings.apiKeys(),
      this.settings.cities(),
    ]);
    return { rates, apiKeys, cities };
  }

  @Post('rate')
  setRate(@Req() req: AuthedRequest, @Body(new ZodValidationPipe(rateSchema)) body: RateInput) {
    return this.settings.setRate(body, req.user?.id);
  }

  @Post('api-key')
  setApiKey(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(apiKeySchema)) body: ApiKeyInput,
  ) {
    return this.settings.setApiKey(body, req.user?.id);
  }

  @Post('api-key/:provider/test')
  testApiKey(@Param('provider') provider: string) {
    return this.settings.testApiKey(provider);
  }

  @Post('cities')
  setCities(@Req() req: AuthedRequest, @Body(new ZodValidationPipe(citiesSchema)) body: CitiesInput) {
    return this.settings.setCities(body, req.user?.id);
  }
}
