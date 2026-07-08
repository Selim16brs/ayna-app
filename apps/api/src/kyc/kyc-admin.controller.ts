import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminGuard } from '../common/admin.guard';
import type { AuthedRequest } from '../auth/jwt-auth.guard';
import { type RejectKycInput, rejectKycSchema } from './kyc.dto';
import { KycService } from './kyc.service';

// EK Z.3 — KYC admin kuyruğu (belge inceleme, onay/ret)
@ApiTags('admin-kyc')
@Controller('admin/kyc')
@UseGuards(AdminGuard)
export class KycAdminController {
  constructor(private readonly kyc: KycService) {}

  @Get()
  queue(@Query('status') status?: string) {
    return this.kyc.queue(status);
  }

  @Post(':id/approve')
  approve(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.kyc.approve(id, req.user?.id);
  }

  @Post(':id/reject')
  reject(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectKycSchema)) body: RejectKycInput,
  ) {
    return this.kyc.reject(id, body.note, req.user?.id);
  }
}
