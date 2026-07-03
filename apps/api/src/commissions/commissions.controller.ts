import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard, type AuthedRequest } from '../auth/jwt-auth.guard';
import { type ReceiptInput, receiptSchema } from './commissions.dto';
import { CommissionsService } from './commissions.service';

// §12.8 — pro (salon/uzman) kendi komisyon faturaları + dekont yükleme
@ApiTags('commissions')
@Controller('commissions')
@UseGuards(JwtAuthGuard)
export class CommissionsController {
  constructor(private readonly commissions: CommissionsService) {}

  @Get('mine')
  mine(@Req() req: AuthedRequest) {
    return this.commissions.myInvoices(req.user?.id ?? '');
  }

  @Post(':id/receipt')
  uploadReceipt(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(receiptSchema)) body: ReceiptInput,
  ) {
    return this.commissions.uploadReceipt(req.user?.id ?? '', id, body.receiptUri);
  }
}
