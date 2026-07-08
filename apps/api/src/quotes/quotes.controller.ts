import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  type CreateQuoteRequestInput,
  createQuoteRequestSchema,
  type SelectQuoteInput,
  selectQuoteSchema,
  type SubmitQuoteInput,
  submitQuoteSchema,
} from './quotes.dto';
import { QuotesService } from './quotes.service';

// §5.2 Faz A — reverse marketplace çekirdeği (tüm uçlar giriş zorunlu)
@ApiTags('quotes')
@Controller('quote-requests')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  // Talep aç (Mod 1 foto / Mod 2 anlat)
  @Post()
  create(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(createQuoteRequestSchema)) body: CreateQuoteRequestInput,
  ) {
    return this.quotes.create(req.user!.id, body);
  }

  // Uzman/salon: şehrimdeki açık talepler
  @Get('open')
  open(@Req() req: AuthedRequest) {
    return this.quotes.openForExpert(req.user!.id);
  }

  // Müşteri: taleplerim (+ gelen teklifler)
  @Get('mine')
  mine(@Req() req: AuthedRequest) {
    return this.quotes.mine(req.user!.id);
  }

  // Uzman/salon: talebe teklif ver (uzman başına 1; tekrar gönderim günceller)
  @Post(':id/quotes')
  submit(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(submitQuoteSchema)) body: SubmitQuoteInput,
  ) {
    return this.quotes.submit(id, req.user!.id, body);
  }

  // Müşteri: teklifi seç → randevu (deposit_pending) doğar
  @Post(':id/select')
  select(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(selectQuoteSchema)) body: SelectQuoteInput,
  ) {
    return this.quotes.select(id, req.user!.id, body);
  }
}
