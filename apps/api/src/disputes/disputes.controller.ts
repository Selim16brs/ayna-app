import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard, type AuthedRequest } from '../auth/jwt-auth.guard';
import { type FileDisputeInput, fileDisputeSchema } from './disputes.dto';
import { DisputesService } from './disputes.service';

// §12.4 — kullanıcı/pro depozito itirazı / iade dekontu açar
@ApiTags('disputes')
@Controller('disputes')
@UseGuards(JwtAuthGuard)
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Post()
  file(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(fileDisputeSchema)) body: FileDisputeInput,
  ) {
    return this.disputes.file(req.user?.id, body);
  }

  @Get('mine')
  mine(@Req() req: AuthedRequest) {
    return this.disputes.mine(req.user?.id ?? '');
  }
}
