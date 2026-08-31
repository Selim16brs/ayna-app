import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Env } from '@ayna/config/env';
import { ENV } from '../config/config.module';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  bookingReceiptSchema,
  cancelSchema,
  createBookingSchema,
  iadeTalepSchema,
  proposeSchema,
  rescheduleSchema,
  type BookingReceiptInput,
  type CancelInput,
  type CreateBookingInput,
  type ProposeInput,
  type RescheduleInput,
} from './bookings.dto';
import { BookingsService } from './bookings.service';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  // GİZLİLİK: filtresiz global liste YOK — kimliğe göre müşteri+sağlayıcı birleşimi.
  // (Eski istemci bu ucu token'sız çağırırsa 401 alır; kimseye yabancı kayıt dönmez.)
  @Get()
  @UseGuards(JwtAuthGuard)
  list(@Req() req: AuthedRequest) {
    return this.bookings.listCombined(req.user!.id);
  }

  // §5 — CRM özet istatistiği (doluluk/gelir/no-show)
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  stats(@Req() req: AuthedRequest) {
    return this.bookings.stats(req.user!.id);
  }

  // §5.6 önkoşulu — yalnızca giriş yapan kullanıcının randevuları
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@Req() req: AuthedRequest) {
    return this.bookings.listForUser(req.user!.id);
  }

  // §9.4 — uzman/salon: SAĞLAYICI olduğu gelen randevular ('Randevu Al' talepleri dahil)
  @Get('provider')
  @UseGuards(JwtAuthGuard)
  provider(@Req() req: AuthedRequest) {
    return this.bookings.listForProvider(req.user!.id);
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
  // Müşteri: kalan bakiyeyi ödediğini bildirir
  @Post(':id/balance-paid')
  @UseGuards(JwtAuthGuard)
  balancePaid(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.bookings.balancePaid(id, req.user!.id);
  }

  // Uzman: parayı aldığını teyit eder → randevu kapanır, komisyon saati başlar
  @Post(':id/balance-received')
  @UseGuards(JwtAuthGuard)
  balanceReceived(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.bookings.balanceReceived(id, req.user!.id);
  }

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

  // §7.8 — müşteri randevusunu bir kez ücretsiz erteler; kapora aktarılır.
  @Post(':id/reschedule')
  @UseGuards(JwtAuthGuard)
  reschedule(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rescheduleSchema)) body: RescheduleInput,
  ) {
    return this.bookings.reschedule(id, body.startMs, req.user!.id);
  }

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard)
  accept(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.bookings.accept(id, req.user!.id);
  }

  // §4.6 — devretme: salon/uzman devreder, müşteri kabul/reddeder.
  // Akışın tamamı istemcideydi; sunucuya yazılmadığı için her açılışta
  // kayboluyordu.
  @Post(':id/reassign')
  @UseGuards(JwtAuthGuard)
  reassign(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: { uzmanName?: string; proId?: string },
  ) {
    return this.bookings.reassign(
      id,
      (body?.uzmanName ?? '').slice(0, 80),
      body?.proId,
      req.user!.id,
    );
  }

  @Post(':id/reassign/accept')
  @UseGuards(JwtAuthGuard)
  acceptReassign(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.bookings.acceptReassignment(id, req.user!.id);
  }

  @Post(':id/reassign/reject')
  @UseGuards(JwtAuthGuard)
  rejectReassign(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.bookings.rejectReassignment(id, req.user!.id);
  }

  /**
   * §7.3 — uzmanın müşteri hakkındaki GİZLİ sinyali ('up' | 'down').
   *
   * Eskiden yalnız telefonda yaşıyordu; yeniden kurulumda kayboluyordu.
   * Yanıt müşteriye ASLA gitmez: mapBooking sinyali varsayılan olarak gizler.
   */
  @Post(':id/customer-signal')
  @UseGuards(JwtAuthGuard)
  customerSignal(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: { signal?: string },
  ) {
    const s = body?.signal === 'down' ? 'down' : 'up';
    return this.bookings.setCustomerSignal(id, s, req.user!.id);
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
  // Faz 2 — müşteri 'hizmet tamamlandı' teyidi (pencere beklemeden kesinleştirir)
  @Post(':id/confirm-completion')
  @UseGuards(JwtAuthGuard)
  confirmCompletion(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.bookings.confirmCompletion(id, req.user!.id);
  }

  // §4.10 — müşteri iade talebi: hesap bilgisiyle admin kuyruğuna düşer.
  @Post(':id/refund-request')
  @UseGuards(JwtAuthGuard)
  refundRequest(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(iadeTalepSchema)) body: { payoutInfo: string },
  ) {
    return this.bookings.iadeTalep(id, body.payoutInfo, req.user!.id);
  }

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
