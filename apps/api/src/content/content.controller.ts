import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard, type AuthedRequest } from '../auth/jwt-auth.guard';
import { type ApplicationInput, applicationSchema } from './content.dto';
import { ContentService } from './content.service';

// Public içerik uçları (app tüketir)
@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('articles')
  articles(@Query('locale') locale?: string) {
    return this.content.publicArticles(locale);
  }

  @Get('articles/:id')
  article(@Param('id') id: string, @Query('locale') locale?: string) {
    return this.content.publicArticle(id, locale);
  }

  @Get('theme')
  theme(@Query('locale') locale?: string) {
    return this.content.activeTheme(locale);
  }

  // Kullanıcı blog başvurusu (girişli kullanıcı → puan hedefi userId)
  @Post('applications')
  @UseGuards(JwtAuthGuard)
  apply(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(applicationSchema)) body: ApplicationInput,
  ) {
    return this.content.submitApplication(body, req.user?.id);
  }

  // §12.10 — girişli kullanıcının segmentine uyan toplu duyurular
  @Get('announcements')
  @UseGuards(JwtAuthGuard)
  announcements(@Req() req: AuthedRequest, @Query('locale') locale?: string) {
    return this.content.announcementsForUser(req.user?.id ?? '', locale);
  }
}
