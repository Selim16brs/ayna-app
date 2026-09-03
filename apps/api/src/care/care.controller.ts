import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  type LogInput,
  logPatchSchema,
  type LogPatch,
  logSchema,
  type MomentInput,
  momentSchema,
  type RoutineInput,
  routineSchema,
} from './care.dto';
import { CareService } from './care.service';

// §bakım — kullanıcının kendi bakım verisi. Tüm uçlar giriş zorunlu ve
// YALNIZ kendi verisine dokunur (servis her yazmada userId koşulu uygular).
@ApiTags('care')
@Controller('care')
@UseGuards(JwtAuthGuard)
export class CareController {
  constructor(private readonly care: CareService) {}

  @Get()
  mine(@Req() req: AuthedRequest) {
    return this.care.mine(req.user!.id);
  }

  @Post('routines')
  addRoutine(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(routineSchema)) body: RoutineInput,
  ) {
    return this.care.addRoutine(req.user!.id, body);
  }

  @Post('routines/:id/complete')
  completeRoutine(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.care.completeRoutine(req.user!.id, id);
  }

  @Delete('routines/:id')
  removeRoutine(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.care.removeRoutine(req.user!.id, id);
  }

  @Post('moments')
  addMoment(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(momentSchema)) body: MomentInput,
  ) {
    return this.care.addMoment(req.user!.id, body);
  }

  @Patch('moments/:id')
  updateMoment(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(momentSchema)) body: MomentInput,
  ) {
    return this.care.updateMoment(req.user!.id, id, body);
  }

  @Delete('moments/:id')
  removeMoment(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.care.removeMoment(req.user!.id, id);
  }

  @Post('logs')
  addLog(@Req() req: AuthedRequest, @Body(new ZodValidationPipe(logSchema)) body: LogInput) {
    return this.care.addLog(req.user!.id, body);
  }

  @Patch('logs/:id')
  updateLog(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(logPatchSchema)) body: LogPatch,
  ) {
    return this.care.updateLog(req.user!.id, id, body);
  }

  @Delete('logs/:id')
  removeLog(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.care.removeLog(req.user!.id, id);
  }
}
