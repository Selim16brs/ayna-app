import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminGuard } from '../common/admin.guard';
import type { AuthedRequest } from '../auth/jwt-auth.guard';
import { type ApproveSubInput, approveSubSchema } from './subscriptions.dto';
import { SubscriptionsService } from './subscriptions.service';

// §11 — admin: üyelik abonelik kuyruğu (dekont doğrula → aktive et / reddet)
@ApiTags('admin-subscriptions')
@Controller('admin/subscriptions')
@UseGuards(AdminGuard)
export class SubscriptionsAdminController {
  constructor(private readonly subs: SubscriptionsService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.subs.list(status);
  }

  @Post(':id/approve')
  approve(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(approveSubSchema)) body: ApproveSubInput,
  ) {
    return this.subs.approve(id, body.months ?? 1, req.user?.id);
  }

  @Post(':id/reject')
  reject(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.subs.reject(id, req.user?.id);
  }

  @Post('run-expire')
  runExpire() {
    return this.subs.expireDue();
  }
}
