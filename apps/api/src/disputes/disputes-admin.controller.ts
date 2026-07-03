import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminGuard } from '../common/admin.guard';
import type { AuthedRequest } from '../auth/jwt-auth.guard';
import { type ResolveDisputeInput, resolveDisputeSchema } from './disputes.dto';
import { DisputesService } from './disputes.service';

// §12.4 Anlaşmazlık kuyruğu — admin dekont görsellerini inceler, karar verir
@ApiTags('admin-disputes')
@Controller('admin/disputes')
@UseGuards(AdminGuard)
export class DisputesAdminController {
  constructor(private readonly disputes: DisputesService) {}

  @Get()
  queue() {
    return this.disputes.queue();
  }

  @Post(':id/resolve')
  resolve(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(resolveDisputeSchema)) body: ResolveDisputeInput,
  ) {
    return this.disputes.resolve(id, body, req.user?.id);
  }
}
