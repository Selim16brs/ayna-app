import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReengageService } from './reengage.service';

// §11 — uzmanın yaklaşan bakım listesi. Ekran eskiden SEED verisiyle
// çiziliyordu: uzman kendi müşterileri sanarak uydurma isimlere bakıyordu.
@ApiTags('reengage')
@Controller('reengage')
@UseGuards(JwtAuthGuard)
export class ReengageController {
  constructor(private readonly reengage: ReengageService) {}

  @Get('upcoming')
  upcoming(@Req() req: AuthedRequest) {
    return this.reengage.adaylar(req.user!.id);
  }
}
