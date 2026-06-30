import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { type EarnInput, earnSchema, type RedeemInput, redeemSchema } from './loyalty.dto';
import { LoyaltyService } from './loyalty.service';

@ApiTags('loyalty')
@Controller('loyalty')
@UseGuards(JwtAuthGuard)
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get()
  summary(@Req() req: AuthedRequest) {
    return this.loyalty.summary(req.user!.id);
  }

  @Post('earn')
  earn(@Req() req: AuthedRequest, @Body(new ZodValidationPipe(earnSchema)) body: EarnInput) {
    return this.loyalty.earn(req.user!.id, body);
  }

  @Post('redeem')
  redeem(@Req() req: AuthedRequest, @Body(new ZodValidationPipe(redeemSchema)) body: RedeemInput) {
    return this.loyalty.redeem(req.user!.id, body.rewardId);
  }
}
