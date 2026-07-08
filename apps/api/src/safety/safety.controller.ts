import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  type AddContactInput,
  addContactSchema,
  type LocationInput,
  locationSchema,
  type StartSessionInput,
  startSessionSchema,
} from './safety.dto';
import { SafetyService } from './safety.service';

// EK Z.2 — Randevu güvenlik katmanı (tüm uçlar giriş zorunlu)
@ApiTags('safety')
@Controller('safety')
@UseGuards(JwtAuthGuard)
export class SafetyController {
  constructor(private readonly safety: SafetyService) {}

  @Get('contacts')
  contacts(@Req() req: AuthedRequest) {
    return this.safety.contacts(req.user!.id);
  }

  @Post('contacts')
  addContact(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(addContactSchema)) body: AddContactInput,
  ) {
    return this.safety.addContact(req.user!.id, body);
  }

  @Post('contacts/:id/remove')
  removeContact(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.safety.removeContact(req.user!.id, id);
  }

  @Get('session')
  session(@Req() req: AuthedRequest) {
    return this.safety.activeSession(req.user!.id);
  }

  @Post('session')
  start(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(startSessionSchema)) body: StartSessionInput,
  ) {
    return this.safety.startSession(req.user!.id, body.bookingId);
  }

  @Post('session/:id/location')
  location(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(locationSchema)) body: LocationInput,
  ) {
    return this.safety.updateLocation(req.user!.id, id, body.lat, body.lng);
  }

  @Post('session/:id/sos')
  sosSession(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.safety.sos(req.user!.id, id);
  }

  @Post('session/:id/checkin')
  checkIn(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.safety.checkIn(req.user!.id, id);
  }

  // Oturumsuz acil SOS (yeni oturum sos olarak açılır)
  @Post('sos')
  sos(@Req() req: AuthedRequest) {
    return this.safety.sos(req.user!.id);
  }
}
