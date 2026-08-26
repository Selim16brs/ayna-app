import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { type CreateReportInput, createReportSchema } from './reports.dto';
import { ReportsService } from './reports.service';

// §21 — Şikâyet uçları. Yalnız GÖNDEREN kendi kayıtlarını okuyabilir;
// şikâyet edilenin bunu görebileceği HİÇBİR uç yok (misilleme korkusu = sessizlik).
@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  create(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(createReportSchema)) body: CreateReportInput,
  ) {
    return this.reports.create(req.user!.id, body);
  }

  @Get('mine')
  mine(@Req() req: AuthedRequest) {
    return this.reports.mine(req.user!.id);
  }
}
