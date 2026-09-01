import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/admin.guard';
import type { AuthedRequest } from '../auth/jwt-auth.guard';
import { AdOrdersService } from './ad-orders.service';

// §reklam — admin: reklam ödeme kuyruğu (dekont doğrula → yayına al / reddet)
@ApiTags('admin-ad-orders')
@Controller('admin/ad-orders')
@UseGuards(AdminGuard)
export class AdOrdersAdminController {
  constructor(private readonly siparis: AdOrdersService) {}

  @Get()
  list() {
    return this.siparis.kuyruk();
  }

  @Post(':id/approve')
  approve(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.siparis.onayla(id, req.user?.id);
  }

  @Post(':id/reject')
  reject(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.siparis.reddet(id, req.user?.id);
  }
}
