import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
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

  // İsteğe bağlı doğrulama: akış girişsiz de okunur, ama giriş yapmışsa KENDİ
  // kaydettikleri işaretli gelir.
  @Get('posts')
  @UseGuards(OptionalJwtAuthGuard)
  posts(@Req() req: AuthedRequest) {
    return this.circle.listPosts(req.user?.id);
  }

  /** §14 — kaydettiklerim (kanvas "Kaydedilenler"). Yalnız kendi listen. */
  @Get('saves')
  @UseGuards(JwtAuthGuard)
  saves(@Req() req: AuthedRequest) {
    return this.circle.listSaved(req.user!.id);
  }

  /** §14 — kaydet / kaydı kaldır. `saved` verilmezse tersine çevirir. */
  @Post('posts/:id/save')
  @UseGuards(JwtAuthGuard)
  save(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: { saved?: boolean }) {
    return this.circle.setSaved(req.user!.id, id, body?.saved);
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  create(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(createPostSchema)) body: CreatePostInput,
  ) {
    return this.circle.createPost(req.user?.id, req.user?.role, body);
  }

  /** §14 — bir sorunun cevaplarındaki fikir birliği: kimi kaç kişi önerdi. */
  @Get('posts/:id/consensus')
  consensus(@Param('id') id: string) {
    return this.circle.consensus(id);
  }

  @Get('posts/:id/comments')
  comments(@Param('id') id: string) {
    return this.circle.listComments(id);
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

  @Post('follow')
  @UseGuards(JwtAuthGuard)
  follow(@Req() req: AuthedRequest, @Body() body: { targetUserId?: string; on?: boolean }) {
    if (!body?.targetUserId) return { following: false };
    return this.circle.setFollow(req.user!.id, body.targetUserId, body?.on !== false);
  }

  @Get('follows')
  @UseGuards(JwtAuthGuard)
  follows(@Req() req: AuthedRequest) {
    return this.circle.myFollows(req.user!.id);
  }

  /*
   * KİMLİK SERVİSE GEÇİYOR.
   *
   * Uç yalnız giriş istiyordu ama KİMİN işaretlediğini hiç sormuyordu:
   * herkes aynı gönderiyi sınırsız kez işaretleyebiliyor, ya da `on: false`
   * ile başkasının gönderisinin işaretlerini sıfıra indirebiliyordu.
   */
  @Post('posts/:id/helpful')
  @UseGuards(JwtAuthGuard)
  helpful(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: { on?: boolean }) {
    return this.circle.setHelpful(req.user!.id, id, body?.on !== false);
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
