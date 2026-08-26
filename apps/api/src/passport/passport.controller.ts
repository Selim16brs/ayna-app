import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  type GrantInput,
  grantSchema,
  type SavePassportInput,
  savePassportSchema,
} from './passport.dto';
import { PassportService } from './passport.service';

// §19 — AYNA Passport. Tüm uçlar giriş zorunlu.
@ApiTags('passport')
@Controller('passport')
@UseGuards(JwtAuthGuard)
export class PassportController {
  constructor(private readonly passport: PassportService) {}

  @Get()
  mine(@Req() req: AuthedRequest) {
    return this.passport.mine(req.user!.id);
  }

  @Post()
  save(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(savePassportSchema)) body: SavePassportInput,
  ) {
    return this.passport.save(req.user!.id, body);
  }

  /** "Kim ne zaman baktı" — kaydı yalnız biz değil, KULLANICI da görür. */
  @Get('access')
  access(@Req() req: AuthedRequest) {
    return this.passport.access(req.user!.id);
  }

  @Post('grant')
  grant(@Req() req: AuthedRequest, @Body(new ZodValidationPipe(grantSchema)) body: GrantInput) {
    return this.passport.grant(req.user!.id, body);
  }

  @Post('access/:id/revoke')
  revoke(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.passport.revoke(req.user!.id, id);
  }

  /**
   * Uzman/salon okuması. Erişim açılmamışsa 403 — sessizce boş dönmek,
   * uzmanın "kullanıcı hiçbir şey yazmamış" sanmasına yol açardı.
   */
  @Get('of/:userId')
  readAsPro(@Req() req: AuthedRequest, @Param('userId') userId: string) {
    return this.passport.readAsPro(req.user!.id, userId);
  }
}
