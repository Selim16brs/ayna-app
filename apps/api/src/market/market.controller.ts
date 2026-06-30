import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminGuard } from '../common/admin.guard';
import { type SetMarketInput, setMarketSchema } from './market.dto';
import { MarketService } from './market.service';

@ApiTags('market')
@Controller('market')
export class MarketController {
  constructor(private readonly market: MarketService) {}

  @Get('average')
  average(@Query('category') category: string, @Query('city') city?: string) {
    return this.market.average(category, city ?? '');
  }

  @Put()
  @UseGuards(AdminGuard)
  set(@Body(new ZodValidationPipe(setMarketSchema)) body: SetMarketInput) {
    return this.market.set(body);
  }
}
