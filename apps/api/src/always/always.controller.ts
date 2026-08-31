import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  type BroadcastInput,
  broadcastSchema,
  type RequestInput,
  requestSchema,
} from './always.dto';
import { AlwaysService } from './always.service';

// §11 — Always (sadık müşteri bağı). Tüm uçlar giriş zorunlu; taraf kontrolü
// serviste (kabul yalnız karşı tarafa ait, kaldırma iki tarafa da açık).
@ApiTags('always')
@Controller('always')
@UseGuards(JwtAuthGuard)
export class AlwaysController {
  constructor(private readonly always: AlwaysService) {}

  @Get()
  mine(@Req() req: AuthedRequest) {
    return this.always.mine(req.user!.id);
  }

  @Post('request')
  request(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(requestSchema)) body: RequestInput,
  ) {
    return this.always.request(req.user!.id, body);
  }

  @Post(':id/accept')
  accept(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.always.accept(req.user!.id, id);
  }

  // Ret ve kaldırma aynı işlem — ikisi de satırı siler.
  @Delete(':id')
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.always.remove(req.user!.id, id);
  }

  @Post('broadcast')
  broadcast(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(broadcastSchema)) body: BroadcastInput,
  ) {
    return this.always.broadcast(req.user!.id, body);
  }
}
