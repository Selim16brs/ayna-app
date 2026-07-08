import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Env } from '@ayna/config/env';
import { ENV } from '../config/config.module';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  type BookingReceiptInput,
  bookingReceiptSchema,
  type CancelInput,
  cancelSchema,
  type CreateBookingInput,
  createBookingSchema,
  type ProposeInput,
  proposeSchema,
} from './bookings.dto';
import { BookingsService } from './bookings.service';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Get()
  list() {
    return this.bookings.list();
  }

  // §5 — CRM özet istatistiği (doluluk/gelir/no-show)
  @Get('stats')
  stats() {
    return this.bookings.stats();
  }

  // §5.6 önkoşulu — yalnızca giriş yapan kullanıcının randevuları
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@Req() req: AuthedRequest) {
    return this.bookings.listForUser(req.user!.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(createBookingSchema)) body: CreateBookingInput,
  ) {
    return this.bookings.create(body, req.user!.id);
  }

  // §6.C — iptal (opsiyonel sebep gövdede)
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelSchema)) body: CancelInput,
  ) {
    return this.bookings.cancel(id, body.reason, req.user!.id);
  }

  // §6.C — uzman/işletme "gelmedi" işaretler
  @Post(':id/no-show')
  @UseGuards(JwtAuthGuard)
  noShow(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.bookings.noShow(id, req.user!.id);
  }

  // §4.1.7 — uzman hizmeti tamamladı
  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  complete(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.bookings.complete(id, req.user!.id);
  }

  // §1.6 — onay/alternatif pazarlık döngüsü
  @Post(':id/approve')
  @UseGuards(JwtAuthGuard)
  approve(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.bookings.approve(id, req.user!.id);
  }

  @Post(':id/propose')
  @UseGuards(JwtAuthGuard)
  propose(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(proposeSchema)) body: ProposeInput,
  ) {
    return this.bookings.propose(id, body.proposedStartMs, req.user!.id);
  }

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard)
  accept(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.bookings.accept(id, req.user!.id);
  }

  @Post(':id/counter')
  @UseGuards(JwtAuthGuard)
  counter(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(proposeSchema)) body: ProposeInput,
  ) {
    return this.bookings.counter(id, body.proposedStartMs, req.user!.id);
  }

  // §4.2 — kullanıcı kapora dekontunu yükler
  @Post(':id/deposit-receipt')
  @UseGuards(JwtAuthGuard)
  submitDepositReceipt(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(bookingReceiptSchema)) body: BookingReceiptInput,
  ) {
    return this.bookings.submitDepositReceipt(id, body.receiptUri, req.user!.id);
  }

  // §4.2 — uzman kaporayı onaylar → randevu kesinleşir
  @Post(':id/confirm-receipt')
  @UseGuards(JwtAuthGuard)
  confirmDepositReceipt(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.bookings.confirmDepositReceipt(id, req.user!.id);
  }

  // §4.4 — kullanıcı serbest iptal başlatır (uzman iade edecek)
  @Post(':id/free-cancel')
  @UseGuards(JwtAuthGuard)
  freeCancel(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelSchema)) body: CancelInput,
  ) {
    return this.bookings.freeCancel(id, body.reason, req.user!.id);
  }

  // §4.4 — uzman iade dekontunu yükler
  @Post(':id/refund-receipt')
  @UseGuards(JwtAuthGuard)
  uploadRefundReceipt(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(bookingReceiptSchema)) body: BookingReceiptInput,
  ) {
    return this.bookings.uploadRefundReceipt(id, body.receiptUri, req.user!.id);
  }

  // §4.4 — kullanıcı iadeyi aldı → kayıt kapanır
  @Post(':id/confirm-refund')
  @UseGuards(JwtAuthGuard)
  confirmRefund(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.bookings.confirmRefund(id, req.user!.id);
  }

  // §4.4 — taraflar itiraz açar → admin anlaşmazlık kuyruğu
  @Post(':id/dispute')
  @UseGuards(JwtAuthGuard)
  dispute(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.bookings.dispute(id, req.user!.id);
  }

  // §4.4-b — uzman gelmedi (kullanıcı bildirir) → iade + komisyon borcu
  @Post(':id/provider-no-show')
  @UseGuards(JwtAuthGuard)
  providerNoShow(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.bookings.providerNoShow(id, req.user!.id);
  }
}
