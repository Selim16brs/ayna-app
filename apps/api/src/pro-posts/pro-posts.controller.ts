import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthedRequest } from '../auth/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { proPostCreateSchema, type ProPostCreateInput } from './pro-posts.dto';
import { ProPostsService } from './pro-posts.service';

/**
 * Uzman paylaşımları — HEPSİ GİRİŞLİ.
 *
 * Girişsiz tek bir uç yok: paylaşımlar yalnız uzmanın kendi müşterilerine
 * görünüyor, herkese açık bir liste olsaydı "kimin müşterisi kim"
 * dışarıdan okunabilirdi.
 */
@ApiTags('pro-posts')
@Controller('pro-posts')
@UseGuards(JwtAuthGuard)
export class ProPostsController {
  constructor(private readonly posts: ProPostsService) {}

  /** Uzmanın CRM'i — tamamlanmış randevusu olan müşteriler. */
  @Get('customers')
  customers(@Req() req: AuthedRequest) {
    return this.posts.musterilerim(req.user!.id);
  }

  /** Uzmanın kendi paylaşımları. */
  @Get('mine')
  mine(@Req() req: AuthedRequest) {
    return this.posts.benimkiler(req.user!.id);
  }

  /** Müşteriye gelen paylaşımlar. */
  @Get('inbox')
  inbox(@Req() req: AuthedRequest) {
    return this.posts.gelenler(req.user!.id);
  }

  @Post()
  create(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(proPostCreateSchema)) body: ProPostCreateInput,
  ) {
    return this.posts.paylas(req.user!.id, body);
  }

  @Post(':id/read')
  read(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.posts.okundu(req.user!.id, id);
  }

  /** Müşteri kendi fotoğrafını görürse — gönderi anında gizleniyor. */
  @Post(':id/report')
  report(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.posts.sikayet(req.user!.id, id);
  }

  @Delete(':id')
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.posts.kaldir(req.user!.id, id);
  }
}
