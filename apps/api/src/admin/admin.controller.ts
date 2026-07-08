import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminGuard } from '../common/admin.guard';
import { i18nSchema } from '../content/content.dto';
import { AdminService } from './admin.service';

const rejectSchema = z.object({ reason: z.string().max(300).optional() });
const restrictSchema = z.object({ reason: z.string().min(1).max(300) });
// §7.2 — itiraz kararı: yorumu tut (keep) veya kural ihlalinde gizle (remove)
const resolveDisputeSchema = z.object({ action: z.enum(['keep', 'remove']) });
const featuredSchema = z.object({ featured: z.boolean() });
const activeSchema = z.object({ active: z.boolean() });
const thresholdSchema = z.object({ value: z.number().int().min(1).max(50) });
const rateSchema = z.object({ value: z.number().int().min(0).max(100) });
const payoutSchema = z.object({
  proId: z.string().min(1).max(64),
  proName: z.string().min(1).max(120),
  amount: z.number().positive().max(100_000_000),
  note: z.string().max(200).optional(),
});
const campaignSchema = z.object({
  title: z.string().min(2).max(80),
  subtitle: z.string().max(120).optional(),
  i18n: i18nSchema, // §14.5 — kk/ru title/subtitle
  badge: z.string().max(12).optional(),
  category: z.string().max(40).optional(),
  image: z.string().url(),
  tone: z.enum(['rose', 'plum', 'gold', 'sage', 'teal']).optional(),
  sortOrder: z.number().int().optional(),
});
const adSchema = z.object({
  proId: z.string().min(1).max(64),
  title: z.string().min(2).max(80),
  subtitle: z.string().max(120).optional(),
  i18n: i18nSchema, // §14.5 — kk/ru title/subtitle
  image: z.string().url(),
  sortOrder: z.number().int().optional(),
});
const proSchema = z.object({
  name: z.string().min(2).max(80),
  specialty: z.string().max(80).optional(),
  sector: z.string().min(1).max(40),
  kind: z.enum(['salon', 'independent']).optional(),
  district: z.string().max(60).optional(),
  about: z.string().max(600).optional(),
  experienceYears: z.number().int().min(0).max(70).optional(),
  priceFrom: z.number().min(0).max(100_000_000).optional(),
  imageUrl: z.string().url().optional(),
  badge: z.enum(['campaign', 'verified', 'today']).optional(),
});
const proUpdateSchema = proSchema.partial();
const categorySchema = z.object({
  code: z.string().min(1).max(40),
  nameTr: z.string().min(1).max(60),
  icon: z.string().min(1).max(40),
  tone: z.string().min(1).max(20),
  sortOrder: z.number().int().optional(),
});
const categoryUpdateSchema = categorySchema.partial().omit({ code: true });
const marketSchema = z.object({
  category: z.string().min(1).max(40),
  city: z.string().max(60).optional(),
  basePrice: z.number().min(0).max(100_000_000),
});
const userRoleSchema = z.object({
  role: z.enum(['user', 'professional', 'salon', 'moderator', 'admin']),
});
const userStatusSchema = z.object({ status: z.enum(['active', 'suspended', 'deleted']) });
const premiumSchema = z.object({ isPremium: z.boolean() });
const tierSchema = z.object({ tier: z.enum(['free', 'premium', 'platinum']) });
const passwordSchema = z.object({ password: z.string().min(6).max(100) });
const flagSchema = z.object({
  key: z.string().min(1).max(60),
  enabled: z.boolean(),
  description: z.string().max(200).optional(),
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

  // Platform komisyonu — online app randevularından %oran
  @Get('commissions')
  commissions() {
    return this.admin.commissions();
  }

  @Post('settings/commission-rate')
  setCommissionRate(@Body(new ZodValidationPipe(rateSchema)) body: { value: number }) {
    return this.admin.setCommissionRate(body.value);
  }

  // Komisyon tahsilatı kaydet (append-only ledger)
  @Post('commissions/payouts')
  addPayout(@Body(new ZodValidationPipe(payoutSchema)) body: z.infer<typeof payoutSchema>) {
    return this.admin.addPayout(body);
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
  reject(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectSchema)) body: { reason?: string },
  ) {
    return this.admin.setBusinessStatus(id, 'rejected', body.reason);
  }

  // Kullanıcı yönetimi
  @Get('users')
  users() {
    return this.admin.users();
  }

  @Post('users/:id/role')
  setUserRole(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(userRoleSchema)) body: z.infer<typeof userRoleSchema>,
  ) {
    return this.admin.setUserRole(id, body.role);
  }

  @Post('users/:id/status')
  setUserStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(userStatusSchema)) body: z.infer<typeof userStatusSchema>,
  ) {
    return this.admin.setUserStatus(id, body.status);
  }

  @Post('users/:id/premium')
  setUserPremium(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(premiumSchema)) body: { isPremium: boolean },
  ) {
    return this.admin.setUserPremium(id, body.isPremium);
  }

  // §11 — manuel üyelik katmanı (free | premium | platinum)
  @Post('users/:id/tier')
  setUserTier(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(tierSchema)) body: { tier: 'free' | 'premium' | 'platinum' },
  ) {
    return this.admin.setUserTier(id, body.tier);
  }

  // §12.2 — admin herhangi bir üyenin parolasını değiştirir
  @Post('users/:id/password')
  setUserPassword(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(passwordSchema)) body: { password: string },
  ) {
    return this.admin.setUserPassword(id, body.password);
  }

  // §12.3 Ceza takip — kısıtlı hesaplar (7 gün sayaçlı) + kısıt aç/kapa
  @Get('penalties')
  penalties() {
    return this.admin.penalties();
  }

  @Post('users/:id/restrict')
  restrictUser(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(restrictSchema)) body: { reason: string },
  ) {
    return this.admin.restrictUser(id, body.reason);
  }

  @Post('users/:id/unrestrict')
  unrestrictUser(@Param('id') id: string) {
    return this.admin.unrestrictUser(id);
  }

  // §7.2 — yorum itiraz kuyruğu + karar (tut/gizle). Dürüst negatif yorum silinmez.
  @Get('reviews/disputes')
  disputedReviews() {
    return this.admin.disputedReviews();
  }

  @Post('reviews/:id/resolve')
  resolveDispute(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(resolveDisputeSchema)) body: { action: 'keep' | 'remove' },
  ) {
    return this.admin.resolveDispute(id, body.action);
  }

  // Randevular (platform geneli)
  @Get('bookings')
  bookings(@Query('status') status?: string) {
    return this.admin.bookings(status);
  }

  // Teklif talepleri
  @Get('quote-requests')
  quoteRequests() {
    return this.admin.quoteRequests();
  }

  // Sadakat (puan defteri)
  @Get('loyalty')
  loyalty() {
    return this.admin.loyalty();
  }

  // Feature flag yönetimi
  @Get('feature-flags')
  featureFlags() {
    return this.admin.featureFlags();
  }

  @Post('feature-flags')
  setFeatureFlag(@Body(new ZodValidationPipe(flagSchema)) body: z.infer<typeof flagSchema>) {
    return this.admin.setFeatureFlag(body.key, body.enabled, body.description);
  }

  // Denetim kaydı
  @Get('audit-logs')
  auditLogs() {
    return this.admin.auditLogs();
  }

  // Kampanya / banner yönetimi
  @Get('campaigns')
  campaigns() {
    return this.admin.campaigns();
  }

  @Post('campaigns')
  createCampaign(
    @Body(new ZodValidationPipe(campaignSchema)) body: z.infer<typeof campaignSchema>,
  ) {
    return this.admin.createCampaign(body);
  }

  @Post('campaigns/:id/active')
  setActive(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(activeSchema)) body: { active: boolean },
  ) {
    return this.admin.setCampaignActive(id, body.active);
  }

  @Delete('campaigns/:id')
  deleteCampaign(@Param('id') id: string) {
    return this.admin.deleteCampaign(id);
  }

  // Reklam banner yönetimi
  @Get('ads')
  ads() {
    return this.admin.ads();
  }

  @Post('ads')
  createAd(@Body(new ZodValidationPipe(adSchema)) body: z.infer<typeof adSchema>) {
    return this.admin.createAd(body);
  }

  @Post('ads/:id/active')
  setAdActive(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(activeSchema)) body: { active: boolean },
  ) {
    return this.admin.setAdActive(id, body.active);
  }

  @Delete('ads/:id')
  deleteAd(@Param('id') id: string) {
    return this.admin.deleteAd(id);
  }

  // Uzmanlar / keşif listesi — tam CRUD
  @Get('professionals')
  professionals() {
    return this.admin.professionals();
  }

  @Post('professionals')
  createProfessional(@Body(new ZodValidationPipe(proSchema)) body: z.infer<typeof proSchema>) {
    return this.admin.createProfessional(body);
  }

  @Patch('professionals/:id')
  updateProfessional(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(proUpdateSchema)) body: z.infer<typeof proUpdateSchema>,
  ) {
    return this.admin.updateProfessional(id, body);
  }

  @Delete('professionals/:id')
  deleteProfessional(@Param('id') id: string) {
    return this.admin.deleteProfessional(id);
  }

  @Post('professionals/:id/feature')
  setFeatured(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(featuredSchema)) body: { featured: boolean },
  ) {
    return this.admin.setFeatured(id, body.featured);
  }

  // Hizmetler (servis kategorileri) — CRUD
  @Get('categories')
  categories() {
    return this.admin.categories();
  }

  @Post('categories')
  createCategory(
    @Body(new ZodValidationPipe(categorySchema)) body: z.infer<typeof categorySchema>,
  ) {
    return this.admin.createCategory(body);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(categoryUpdateSchema)) body: z.infer<typeof categoryUpdateSchema>,
  ) {
    return this.admin.updateCategory(id, body);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.admin.deleteCategory(id);
  }

  // Piyasa fiyatları — liste + upsert
  @Get('market-prices')
  marketPrices() {
    return this.admin.marketPrices();
  }

  @Post('market-prices')
  setMarketPrice(@Body(new ZodValidationPipe(marketSchema)) body: z.infer<typeof marketSchema>) {
    return this.admin.setMarketPrice(body);
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
