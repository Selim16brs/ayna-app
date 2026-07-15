import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { type CreateOfferInput, createOfferSchema } from './offers.dto';
import { OffersService } from './offers.service';

@ApiTags('offers')
@Controller('offers')
export class OffersController {
  constructor(private readonly offers: OffersService) {}

  // Keşfet — aktif kampanyalar (public)
  @Get()
  list(@Query('locale') locale?: string, @Query('city') city?: string) {
    return this.offers.listPublic(locale, city);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@Req() req: AuthedRequest) {
    return this.offers.listMine(req.user!.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(createOfferSchema)) body: CreateOfferInput,
  ) {
    return this.offers.create(req.user!.id, body);
  }

  @Post(':id/pause')
  @UseGuards(JwtAuthGuard)
  pause(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.offers.setStatus(req.user!.id, id, 'paused');
  }

  @Post(':id/resume')
  @UseGuards(JwtAuthGuard)
  resume(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.offers.setStatus(req.user!.id, id, 'active');
  }

  @Post(':id/remove')
  @UseGuards(JwtAuthGuard)
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.offers.setStatus(req.user!.id, id, 'removed');
  }
}
