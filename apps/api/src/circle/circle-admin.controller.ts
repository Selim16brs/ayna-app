import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminGuard } from '../common/admin.guard';
import type { AuthedRequest } from '../auth/jwt-auth.guard';
import { type ModeratePostInput, moderatePostSchema } from './circle.dto';
import { CircleService } from './circle.service';

// §12.5 Moderasyon Merkezi — W2W onay kuyruğu + şikâyet edilen içerik
@ApiTags('admin-circle')
@Controller('admin/circle')
@UseGuards(AdminGuard)
export class CircleAdminController {
  constructor(private readonly circle: CircleService) {}

  @Get('queue')
  queue() {
    return this.circle.queue();
  }

  @Post('posts/:id/moderate')
  moderate(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moderatePostSchema)) body: ModeratePostInput,
  ) {
    return this.circle.resolve(id, body.decision, req.user?.id);
  }
}
