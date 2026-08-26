import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/admin.guard';
import { JwtAuthGuard, type AuthedRequest } from '../auth/jwt-auth.guard';
import { SupportService } from './support.service';

// §destek — kullanıcının insana ulaşma yolu. Yardım ekranındaki düğme
// hiçbir şey yapmıyordu; parası takılan ya da güvenlik sorunu yaşayan
// kullanıcının kimseye ulaşamaması bu ürün için kabul edilemezdi.
@ApiTags('support')
@Controller('support')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: AuthedRequest, @Body() body: { topic?: string; body?: string }) {
    return this.support.create(req.user!.id, body?.topic ?? 'other', body?.body ?? '');
  }

  /** Kendi taleplerim + yanıtları. Yalnız kendi kayıtları. */
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@Req() req: AuthedRequest) {
    return this.support.mine(req.user!.id);
  }
}

@ApiTags('admin-support')
@Controller('admin/support')
@UseGuards(AdminGuard)
export class SupportAdminController {
  constructor(private readonly support: SupportService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.support.list(status);
  }

  @Post(':id/reply')
  reply(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: { reply?: string }) {
    return this.support.reply(id, body?.reply ?? '', req.user?.id);
  }

  @Post(':id/close')
  close(@Param('id') id: string) {
    return this.support.close(id);
  }
}
