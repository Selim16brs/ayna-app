import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminGuard } from '../common/admin.guard';
import type { AuthedRequest } from '../auth/jwt-auth.guard';
import {
  type ArticleInput,
  type ArticlePatchInput,
  type ReviewApplicationInput,
  type ThemeInput,
  articlePatchSchema,
  articleSchema,
  reviewApplicationSchema,
  themeSchema,
} from './content.dto';
import { ContentService } from './content.service';

// §12.6 İçerik Yönetimi — yalnızca admin
@ApiTags('admin-content')
@Controller('admin/content')
@UseGuards(AdminGuard)
export class ContentAdminController {
  constructor(private readonly content: ContentService) {}

  // Makaleler
  @Get('articles')
  articles() {
    return this.content.adminArticles();
  }

  @Post('articles')
  create(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(articleSchema)) body: ArticleInput,
  ) {
    return this.content.createArticle(body, req.user?.id);
  }

  @Patch('articles/:id')
  update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(articlePatchSchema)) body: ArticlePatchInput,
  ) {
    return this.content.updateArticle(id, body, req.user?.id);
  }

  @Delete('articles/:id')
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.content.deleteArticle(id, req.user?.id);
  }

  // Kullanıcı blog başvuruları
  @Get('applications')
  applications() {
    return this.content.adminApplications();
  }

  @Patch('applications/:id')
  review(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reviewApplicationSchema)) body: ReviewApplicationInput,
  ) {
    return this.content.reviewApplication(id, body, req.user?.id);
  }

  // Haftalık W2W teması
  @Get('themes')
  themes() {
    return this.content.themes();
  }

  @Post('themes')
  createTheme(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(themeSchema)) body: ThemeInput,
  ) {
    return this.content.createTheme(body, req.user?.id);
  }

  @Post('themes/:id/activate')
  activate(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.content.activateTheme(id, req.user?.id);
  }
}
