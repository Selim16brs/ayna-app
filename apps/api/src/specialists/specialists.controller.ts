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
