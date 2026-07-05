import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/admin.guard';
import type { AuthedRequest } from '../auth/jwt-auth.guard';
import { ProfileChangesService } from './profile-changes.service';

// §profil-onay — admin: salon/uzman profil değişiklik onay kuyruğu
@ApiTags('admin-profile-changes')
@Controller('admin/profile-changes')
@UseGuards(AdminGuard)
export class ProfileChangesAdminController {
  constructor(private readonly svc: ProfileChangesService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.svc.list(status);
  }

  @Post(':id/approve')
  approve(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.svc.approve(id, req.user?.id);
  }

  @Post(':id/reject')
  reject(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.svc.reject(id, req.user?.id);
  }
}
