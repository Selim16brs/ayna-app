import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminGuard } from '../common/admin.guard';
import { AdminService } from './admin.service';

const rejectSchema = z.object({ reason: z.string().max(300).optional() });
const featuredSchema = z.object({ featured: z.boolean() });
const activeSchema = z.object({ active: z.boolean() });
const thresholdSchema = z.object({ value: z.number().int().min(1).max(50) });
const campaignSchema = z.object({
  title: z.string().min(2).max(80),
  subtitle: z.string().max(120).optional(),
  badge: z.string().max(12).optional(),
  category: z.string().max(40).optional(),
  image: z.string().url(),
  tone: z.enum(['rose', 'plum', 'gold', 'sage', 'teal']).optional(),
  sortOrder: z.number().int().optional(),
});

// Tüm admin uçları AdminGuard arkasında (yalnızca admin rolü)
@ApiTags('admin')
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  // Detaylı istatistik — zaman serisi + kategori dağılımı
  @Get('stats')
  stats(@Query('days') days?: string) {
    const n = Number(days);
    return this.admin.stats(Number.isFinite(n) && n > 0 ? n : 30);
  }

  // Üyelik / işletme onayları
  @Get('businesses')
  businesses(@Query('status') status?: string) {
    return this.admin.businesses(status);
  }

  @Get('businesses/:id')
  businessDetail(@Param('id') id: string) {
    return this.admin.businessDetail(id);
  }

  @Post('businesses/:id/approve')
  approve(@Param('id') id: string) {
    return this.admin.setBusinessStatus(id, 'approved');
  }

  @Post('businesses/:id/reject')
  reject(@Param('id') id: string, @Body(new ZodValidationPipe(rejectSchema)) body: { reason?: string }) {
    return this.admin.setBusinessStatus(id, 'rejected', body.reason);
  }

  @Get('users')
  users() {
    return this.admin.users();
  }

  // Kampanya / banner yönetimi
  @Get('campaigns')
  campaigns() {
    return this.admin.campaigns();
  }

  @Post('campaigns')
  createCampaign(@Body(new ZodValidationPipe(campaignSchema)) body: z.infer<typeof campaignSchema>) {
    return this.admin.createCampaign(body);
  }

  @Post('campaigns/:id/active')
  setActive(@Param('id') id: string, @Body(new ZodValidationPipe(activeSchema)) body: { active: boolean }) {
    return this.admin.setCampaignActive(id, body.active);
  }

  @Delete('campaigns/:id')
  deleteCampaign(@Param('id') id: string) {
    return this.admin.deleteCampaign(id);
  }

  // Öne çıkan firmalar
  @Get('professionals')
  professionals() {
    return this.admin.professionals();
  }

  @Post('professionals/:id/feature')
  setFeatured(@Param('id') id: string, @Body(new ZodValidationPipe(featuredSchema)) body: { featured: boolean }) {
    return this.admin.setFeatured(id, body.featured);
  }

  // Moderasyon — görünür yorumlar + gizleme
  @Get('reviews')
  reviews() {
    return this.admin.reviews();
  }

  @Post('reviews/:id/hide')
  hideReview(@Param('id') id: string) {
    return this.admin.hideReview(id);
  }

  // Moderasyon — puan görünürlük eşiği
  @Post('settings/rating-threshold')
  setThreshold(@Body(new ZodValidationPipe(thresholdSchema)) body: { value: number }) {
    return this.admin.setRatingThreshold(body.value);
  }
}
