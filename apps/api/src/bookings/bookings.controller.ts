import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
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
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  list() {
    return this.bookings.list();
  }

  @Post()
  create(@Body(new ZodValidationPipe(createBookingSchema)) body: CreateBookingInput) {
    return this.bookings.create(body);
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
