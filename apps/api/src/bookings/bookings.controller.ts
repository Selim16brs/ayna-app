import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { Env } from '@ayna/config/env';
import { ENV } from '../config/config.module';
import { verifyJwt } from '../common/crypto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  type CancelInput,
  cancelSchema,
  type CreateBookingInput,
  createBookingSchema,
  type DateLabelInput,
  dateLabelSchema,
} from './bookings.dto';
import { BookingsService } from './bookings.service';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  // Authorization varsa kullanıcıyı çöz (opsiyonel — giriş zorunlu değil)
  private optionalUserId(req: Request): string | undefined {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = token ? verifyJwt(token, this.env.JWT_ACCESS_SECRET) : null;
    return payload && typeof payload.sub === 'string' ? payload.sub : undefined;
  }

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
  create(
    @Req() req: Request,
    @Body(new ZodValidationPipe(createBookingSchema)) body: CreateBookingInput,
  ) {
    return this.bookings.create(body, this.optionalUserId(req));
  }

  // §6.C — iptal (opsiyonel sebep gövdede)
  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelSchema)) body: CancelInput,
  ) {
    return this.bookings.cancel(id, body.reason);
  }

  // §6.C — uzman/işletme "gelmedi" işaretler
  @Post(':id/no-show')
  noShow(@Param('id') id: string) {
    return this.bookings.noShow(id);
  }

  // §1.6 — onay/alternatif pazarlık döngüsü
  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.bookings.approve(id);
  }

  @Post(':id/propose')
  propose(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(dateLabelSchema)) body: DateLabelInput,
  ) {
    return this.bookings.propose(id, body.dateLabel);
  }

  @Post(':id/accept')
  accept(@Param('id') id: string) {
    return this.bookings.accept(id);
  }

  @Post(':id/counter')
  counter(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(dateLabelSchema)) body: DateLabelInput,
  ) {
    return this.bookings.counter(id, body.dateLabel);
  }
}
