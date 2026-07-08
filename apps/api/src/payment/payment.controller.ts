import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { type CreatePaymentInput, createPaymentSchema } from './payment.dto';
import { PaymentService } from './payment.service';

// EK Z.8 — in-app ödeme (giriş zorunlu)
@ApiTags('payment')
@Controller('payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly payment: PaymentService) {}

  @Get('mine')
  mine(@Req() req: AuthedRequest, @Query('bookingId') bookingId: string) {
    return this.payment.mine(req.user!.id, bookingId);
  }

  @Post()
  create(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(createPaymentSchema)) body: CreatePaymentInput,
  ) {
    return this.payment.createIntent(req.user!.id, body.bookingId, body.pointsRequested ?? 0);
  }

  @Post(':id/confirm')
  confirm(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.payment.confirm(req.user!.id, id);
  }
}
