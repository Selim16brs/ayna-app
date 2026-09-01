import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard, type AuthedRequest } from '../auth/jwt-auth.guard';
import {
  type ReklamDekontInput,
  type ReklamSiparisInput,
  reklamDekontSchema,
  reklamSiparisSchema,
} from './ad-orders.dto';
import { AdOrdersService } from './ad-orders.service';

// §reklam — uzman/salonun ücretli vitrin satın alması (Kaspi + dekont).
@ApiTags('ad-orders')
@Controller('ad-orders')
@UseGuards(JwtAuthGuard)
export class AdOrdersController {
  constructor(private readonly siparis: AdOrdersService) {}

  // Fiyat SUNUCUDAN okunuyor: istemciye gömülseydi panelden değiştirilen
  // fiyat eski uygulama sürümlerinde yanlış görünürdü.
  @Get('pricing')
  pricing() {
    return this.siparis.fiyat();
  }

  @Get('mine')
  mine(@Req() req: AuthedRequest) {
    return this.siparis.benimkiler(req.user?.id ?? '');
  }

  @Post()
  create(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(reklamSiparisSchema)) body: ReklamSiparisInput,
  ) {
    return this.siparis.olustur(req.user?.id ?? '', body);
  }

  @Post(':id/receipt')
  receipt(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reklamDekontSchema)) body: ReklamDekontInput,
  ) {
    return this.siparis.dekontYukle(req.user?.id ?? '', id, body.receiptUri);
  }
}
