import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CalendarService } from './calendar.service';
import { SpecialistsController } from './specialists.controller';
import { SpecialistsService } from './specialists.service';

@Module({
  controllers: [SpecialistsController],
  providers: [SpecialistsService, CalendarService, JwtAuthGuard],
})
export class SpecialistsModule {}
