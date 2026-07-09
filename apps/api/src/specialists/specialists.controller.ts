import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { type RegisterSpecialistInput, registerSpecialistSchema } from './specialists.dto';
import { disputeSchema, replySchema } from '../ratings/ratings.dto';
import { SpecialistsService } from './specialists.service';
import {
  type AvailabilityInput,
  availabilitySchema,
  type BlockInput,
  blockSchema,
} from './calendar.dto';
import { CalendarService } from './calendar.service';

@ApiTags('specialists')
@Controller('specialists')
export class SpecialistsController {
  constructor(
    private readonly specialists: SpecialistsService,
    private readonly calendar: CalendarService,
  ) {}

  @Post()
  register(@Body(new ZodValidationPipe(registerSpecialistSchema)) body: RegisterSpecialistInput) {
    return this.specialists.register(body);
  }

  // §7 — uzmanın kendi işlerine yazılan yorumlar + tek yanıt hakkı
  // §6.1 — uzman galerisi (hesapta kalıcı; sayfa değişince kaybolmaz)
  @Get('me/portfolio')
  @UseGuards(JwtAuthGuard)
  myPortfolio(@Req() req: AuthedRequest) {
    return this.specialists.myPortfolio(req.user!.id);
  }

  @Post('me/portfolio')
  @UseGuards(JwtAuthGuard)
  setPortfolio(@Req() req: AuthedRequest, @Body() body: { photos?: string[] }) {
    const photos = Array.isArray(body?.photos)
      ? body.photos.filter((x) => typeof x === 'string').map((x) => x.slice(0, 2_000_000))
      : [];
    return this.specialists.setMyPortfolio(req.user!.id, photos);
  }

  // §11 — Platinum promosyonları (kendi profil sayfasında yayınlanır)
  @Get('me/promotions')
  @UseGuards(JwtAuthGuard)
  myPromotions(@Req() req: AuthedRequest) {
    return this.specialists.myPromotions(req.user!.id);
  }

  @Post('me/promotions')
  @UseGuards(JwtAuthGuard)
  setPromotions(@Req() req: AuthedRequest, @Body() body: { promotions?: unknown[] }) {
    const list = Array.isArray(body?.promotions) ? body.promotions : [];
    return this.specialists.setMyPromotions(req.user!.id, list);
  }

  // §9.5 — hizmet/fiyat listesi + çalışma saatleri (hesap verisi)
  @Get('me/services')
  @UseGuards(JwtAuthGuard)
  myServices(@Req() req: AuthedRequest) {
    return this.specialists.myServices(req.user!.id);
  }

  @Post('me/services')
  @UseGuards(JwtAuthGuard)
  setServices(@Req() req: AuthedRequest, @Body() body: { services?: unknown[] }) {
    return this.specialists.setMyServices(
      req.user!.id,
      Array.isArray(body?.services) ? body.services : [],
    );
  }

  @Get('me/hours')
  @UseGuards(JwtAuthGuard)
  myHours(@Req() req: AuthedRequest) {
    return this.specialists.myHours(req.user!.id);
  }

  @Post('me/hours')
  @UseGuards(JwtAuthGuard)
  setHours(@Req() req: AuthedRequest, @Body() body: { hours?: unknown[] }) {
    return this.specialists.setMyHours(req.user!.id, Array.isArray(body?.hours) ? body.hours : []);
  }

  // §CRM — bugün doğum günü olan müşterilerim + kutlama gönder
  @Get('me/birthdays')
  @UseGuards(JwtAuthGuard)
  birthdays(@Req() req: AuthedRequest) {
    return this.specialists.birthdaysToday(req.user!.id);
  }

  @Post('me/birthdays/:userId/celebrate')
  @UseGuards(JwtAuthGuard)
  celebrate(@Req() req: AuthedRequest, @Param('userId') userId: string) {
    return this.specialists.celebrate(req.user!.id, userId);
  }

  @Get('me/reviews')
  @UseGuards(JwtAuthGuard)
  myReviews(@Req() req: AuthedRequest) {
    return this.specialists.myReviews(req.user!.id);
  }

  @Post('me/reviews/:id/reply')
  @UseGuards(JwtAuthGuard)
  replyReview(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(replySchema)) body: { reply: string },
  ) {
    return this.specialists.replyReview(req.user!.id, id, body.reply);
  }

  // §7.2 — uzman kendi yorumuna itiraz eder (admin kuyruğu); yorum görünür kalır
  @Post('me/reviews/:id/dispute')
  @UseGuards(JwtAuthGuard)
  disputeReview(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(disputeSchema)) body: { reason: string },
  ) {
    return this.specialists.disputeReview(req.user!.id, id, body.reason);
  }

  // --- Takvim: müsaitlik (uzman kendi profili) ---
  @Get('me/availability')
  @UseGuards(JwtAuthGuard)
  getAvailability(@Req() req: AuthedRequest) {
    return this.calendar.getAvailability(req.user!.id);
  }

  @Put('me/availability')
  @UseGuards(JwtAuthGuard)
  setAvailability(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(availabilitySchema)) body: AvailabilityInput,
  ) {
    return this.calendar.setAvailability(req.user!.id, body);
  }

  // --- Offline bloklar (§2.2 çakışma önleme) ---
  @Get('me/blocks')
  @UseGuards(JwtAuthGuard)
  listBlocks(@Req() req: AuthedRequest) {
    return this.calendar.listBlocks(req.user!.id);
  }

  @Post('me/blocks')
  @UseGuards(JwtAuthGuard)
  addBlock(@Req() req: AuthedRequest, @Body(new ZodValidationPipe(blockSchema)) body: BlockInput) {
    return this.calendar.addBlock(req.user!.id, body);
  }

  @Delete('me/blocks/:id')
  @UseGuards(JwtAuthGuard)
  deleteBlock(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.calendar.deleteBlock(req.user!.id, id);
  }

  // --- Müsait saatler (randevu akışı §1.5) ---
  @Get(':id/slots')
  slots(@Param('id') id: string, @Query('date') date: string) {
    return this.calendar.slots(id, date);
  }
}
