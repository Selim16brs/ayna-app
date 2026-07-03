import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
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
  articles() {
    return this.content.publicArticles();
  }

  @Get('articles/:id')
  article(@Param('id') id: string) {
    return this.content.publicArticle(id);
  }

  @Get('theme')
  theme() {
    return this.content.activeTheme();
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
  announcements(@Req() req: AuthedRequest) {
    return this.content.announcementsForUser(req.user?.id ?? '');
  }
}
