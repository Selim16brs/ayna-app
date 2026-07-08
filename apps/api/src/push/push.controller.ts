import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
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

  @Post('tokens/remove')
  remove(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(registerTokenSchema)) body: RegisterTokenInput,
  ) {
    return this.push.remove(req.user!.id, body.token);
  }
}
