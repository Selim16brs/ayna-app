import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminGuard } from '../common/admin.guard';
import { CollectionsService } from './collections.service';

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
  title: z.string().min(2).max(120),
  subtitle: z.string().max(200).optional(),
  i18n: z.unknown().optional(),
  occasion: z
    .enum([
      'wedding',
      'graduation',
      'nauryz',
      'march8',
      'ramadan_eid',
      'new_year',
      'summer',
      'custom',
    ])
    .optional(),
  heroImage: z.string().max(2000).optional(),
  tone: z.string().max(20).optional(),
  startsAtMs: z.number().int().positive(),
  endsAtMs: z.number().int().positive(),
  priority: z.number().int().min(0).max(100).optional(),
  itemsJson: z.string().max(20000).optional(),
});
type UpsertInput = z.infer<typeof upsertSchema>;

@ApiTags('collections')
@Controller()
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  // Keşfet hero + koleksiyonlar (public; tarih penceresi otomatik)
  @Get('collections')
  list(@Query('locale') locale?: string) {
    return this.collections.listActive(locale);
  }

  @Get('collections/:idOrSlug')
  detail(@Param('idOrSlug') idOrSlug: string, @Query('locale') locale?: string) {
    return this.collections.detail(idOrSlug, locale);
  }

  // ── Admin ──
  @Get('admin/collections')
  @UseGuards(AdminGuard)
  adminList() {
    return this.collections.adminList();
  }

  @Post('admin/collections')
  @UseGuards(AdminGuard)
  upsert(@Body(new ZodValidationPipe(upsertSchema)) body: UpsertInput) {
    return this.collections.upsert(body);
  }

  @Delete('admin/collections/:id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.collections.remove(id);
  }
}
