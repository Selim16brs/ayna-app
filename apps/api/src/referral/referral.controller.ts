import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { type RedeemReferralInput, redeemReferralSchema } from './referral.dto';
import { ReferralService } from './referral.service';

// EK Z.6 — müşteri referans programı (giriş zorunlu)
@ApiTags('referral')
@Controller('referral')
@UseGuards(JwtAuthGuard)
export class ReferralController {
  constructor(private readonly referral: ReferralService) {}

  @Get('mine')
  mine(@Req() req: AuthedRequest) {
    return this.referral.mine(req.user!.id);
  }

  @Post('redeem')
  redeem(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(redeemReferralSchema)) body: RedeemReferralInput,
  ) {
    return this.referral.redeem(req.user!.id, body.code);
  }
}
