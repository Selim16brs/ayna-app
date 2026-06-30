import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';
import {
  boniSchema,
  photoSchema,
  searchSchema,
  premiumSchema,
  type BoniInput,
  type PhotoInput,
  type SearchInput,
  type PremiumInput,
} from './ai.dto';

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('quota')
  quota(@Req() req: AuthedRequest) {
    return this.ai.quota(req.user!.id);
  }

  @Post('boni')
  boni(@Req() req: AuthedRequest, @Body(new ZodValidationPipe(boniSchema)) body: BoniInput) {
    return this.ai.boni(req.user!.id, body.question);
  }

  @Post('photo')
  photo(@Req() req: AuthedRequest, @Body(new ZodValidationPipe(photoSchema)) body: PhotoInput) {
    return this.ai.photo(req.user!.id, body.note);
  }

  @Post('search')
  search(@Req() req: AuthedRequest, @Body(new ZodValidationPipe(searchSchema)) body: SearchInput) {
    return this.ai.search(req.user!.id, body.query);
  }

  // Dev/demo: premium aç/kapat (üretimde ödeme akışı yönetir)
  @Post('dev/premium')
  setPremium(@Req() req: AuthedRequest, @Body(new ZodValidationPipe(premiumSchema)) body: PremiumInput) {
    return this.ai.setPremium(req.user!.id, body.value);
  }
}
