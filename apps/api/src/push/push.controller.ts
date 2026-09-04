import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { type RegisterTokenInput, registerTokenSchema } from './push.dto';
import { PushService } from './push.service';

// EK Z.5 — push token yönetimi (giriş zorunlu)
@ApiTags('push')
@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post('tokens')
  register(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(registerTokenSchema)) body: RegisterTokenInput,
  ) {
    return this.push.register(req.user!.id, body.token, body.platform);
  }

  /**
   * BİLDİRİM GEÇMİŞİ. Uygulama içi liste bunu okuyup kendi kayıtlarıyla
   * birleştiriyor: karşı tarafın yaptıkları da listede kalıyor.
   */
  @Get('notifications')
  history(@Req() req: AuthedRequest) {
    return this.push.history(req.user!.id);
  }

  /** Tekil okundu. Sahiplik sunucuda doğrulanıyor. */
  @Post('notifications/:id/read')
  readOne(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.push.markRead(req.user!.id, id);
  }

  /** Hepsini okundu işaretle — liste ekranındaki "tümünü okundu yap". */
  @Post('notifications/read-all')
  readAll(@Req() req: AuthedRequest) {
    return this.push.markRead(req.user!.id);
  }

  @Post('tokens/remove')
  remove(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(registerTokenSchema)) body: RegisterTokenInput,
  ) {
    return this.push.remove(req.user!.id, body.token);
  }
}
