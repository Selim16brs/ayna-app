import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard, type AuthedRequest } from '../auth/jwt-auth.guard';
import {
  type CreateSubInput,
  type SubReceiptInput,
  createSubSchema,
  subReceiptSchema,
} from './subscriptions.dto';
import { SubscriptionsService } from './subscriptions.service';

// §11 — uzman/salon üyelik aboneliği (Premium/Platinum satın alma + dekont)
@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subs: SubscriptionsService) {}

  @Get('mine')
  mine(@Req() req: AuthedRequest) {
    return this.subs.mine(req.user?.id ?? '');
  }

  @Post()
  create(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(createSubSchema)) body: CreateSubInput,
  ) {
    return this.subs.create(req.user?.id ?? '', body.tier);
  }

  @Post(':id/receipt')
  uploadReceipt(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(subReceiptSchema)) body: SubReceiptInput,
  ) {
    return this.subs.uploadReceipt(req.user?.id ?? '', id, body.receiptUri);
  }
}
