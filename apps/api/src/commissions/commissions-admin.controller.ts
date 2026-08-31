import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/admin.guard';
import type { AuthedRequest } from '../auth/jwt-auth.guard';
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

  @Post('invoices/:id/collect')
  collect(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.commissions.collect(id, req.user?.id);
  }

  @Post('run-overdue')
  runOverdue(@Req() req: AuthedRequest) {
    return this.commissions.runOverdue(req.user?.id);
  }
}
