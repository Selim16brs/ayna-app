import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminGuard } from '../common/admin.guard';
import type { AuthedRequest } from '../auth/jwt-auth.guard';
import { type ClosePeriodInput, closePeriodSchema } from './commissions.dto';
import { CommissionsService } from './commissions.service';

// §12.8 Komisyon tahsilat döngüsü — admin
@ApiTags('admin-commissions')
@Controller('admin/commissions')
@UseGuards(AdminGuard)
export class CommissionsAdminController {
  constructor(private readonly commissions: CommissionsService) {}

  @Get('invoices')
  invoices() {
    return this.commissions.invoices();
  }

  @Post('close-period')
  closePeriod(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(closePeriodSchema)) body: ClosePeriodInput,
  ) {
    return this.commissions.closePeriod(body, req.user?.id);
  }

  @Post('invoices/:id/collect')
  collect(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.commissions.collect(id, req.user?.id);
  }

  @Post('run-overdue')
  runOverdue(@Req() req: AuthedRequest) {
    return this.commissions.runOverdue(req.user?.id);
  }
}
