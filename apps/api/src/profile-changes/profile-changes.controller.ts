import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard, type AuthedRequest } from '../auth/jwt-auth.guard';
import {
  type PhoneChangeInput,
  phoneChangeSchema,
  type SubmitProfileChangeInput,
  submitProfileChangeSchema,
} from './profile-changes.dto';
import { ProfileChangesService } from './profile-changes.service';

// §profil-onay — salon/uzman profil değişiklik talebi
@ApiTags('profile-changes')
@Controller('profile-changes')
@UseGuards(JwtAuthGuard)
export class ProfileChangesController {
  constructor(private readonly svc: ProfileChangesService) {}

  @Get('mine')
  mine(@Req() req: AuthedRequest) {
    return this.svc.mine(req.user?.id ?? '');
  }

  @Post()
  submit(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(submitProfileChangeSchema)) body: SubmitProfileChangeInput,
  ) {
    return this.svc.submit(req.user?.id ?? '', body.changes);
  }

  /**
   * Telefon değişikliği talebi.
   *
   * Genel `submit` ucundan AYRI: burada SMS kodu doğrulanıyor. Aynı uçtan
   * geçseydi telefon, kodsuz da gönderilebilen serbest bir alan olurdu.
   */
  @Post('phone')
  phone(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(phoneChangeSchema)) body: PhoneChangeInput,
  ) {
    return this.svc.telefonTalebi(req.user?.id ?? '', body.phone, body.code);
  }
}
