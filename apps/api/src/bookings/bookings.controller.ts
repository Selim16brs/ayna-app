import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type CreateBookingInput, createBookingSchema } from './bookings.dto';
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

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.bookings.cancel(id);
  }
}
