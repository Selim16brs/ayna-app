import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { type SubmitKycInput, submitKycSchema } from './kyc.dto';
import { KycService } from './kyc.service';

// EK Z.3 — uzman/salon KYC (giriş zorunlu)
@ApiTags('kyc')
@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Get('mine')
  mine(@Req() req: AuthedRequest) {
    return this.kyc.mine(req.user!.id);
  }

  @Post()
  submit(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(submitKycSchema)) body: SubmitKycInput,
  ) {
    return this.kyc.submit(req.user!.id, req.user!.role, body);
  }
}
