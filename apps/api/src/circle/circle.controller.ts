import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard, type AuthedRequest } from '../auth/jwt-auth.guard';
import {
  type CreateCommentInput,
  type CreatePostInput,
  type ReportInput,
  createCommentSchema,
  createPostSchema,
  reportSchema,
} from './circle.dto';
import { CircleService } from './circle.service';

// §5.5 W2W — kadın topluluğu akışı (okuma açık; yazma girişli)
@ApiTags('circle')
@Controller('circle')
export class CircleController {
  constructor(private readonly circle: CircleService) {}

  @Get('posts')
  posts() {
    return this.circle.listPosts();
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  create(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(createPostSchema)) body: CreatePostInput,
  ) {
    return this.circle.createPost(req.user?.id, req.user?.role, body);
  }

  @Post('posts/:id/comments')
  @UseGuards(JwtAuthGuard)
  comment(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createCommentSchema)) body: CreateCommentInput,
  ) {
    return this.circle.addComment(req.user?.id, req.user?.role, id, body);
  }

  @Post('posts/:id/report')
  @UseGuards(JwtAuthGuard)
  report(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reportSchema)) body: ReportInput,
  ) {
    return this.circle.report(req.user?.id, id, body.reason);
  }
}
