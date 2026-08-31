import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { type PrefsPatch, prefsSchema } from './prefs.dto';
import { PrefsService } from './prefs.service';

@ApiTags('prefs')
@Controller('prefs')
@UseGuards(JwtAuthGuard)
export class PrefsController {
  constructor(private readonly prefs: PrefsService) {}

  @Get()
  mine(@Req() req: AuthedRequest) {
    return this.prefs.mine(req.user!.id);
  }

  @Put()
  save(@Req() req: AuthedRequest, @Body(new ZodValidationPipe(prefsSchema)) body: PrefsPatch) {
    return this.prefs.save(req.user!.id, body);
  }
}
