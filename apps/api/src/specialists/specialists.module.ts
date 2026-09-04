import { Module } from '@nestjs/common';
import { BasariModule } from '../basari/basari.module';
import { PushModule } from '../push/push.module';
import { CatalogModule } from '../catalog/catalog.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CalendarService } from './calendar.service';
import { SpecialistsController } from './specialists.controller';
import { SpecialistsService } from './specialists.service';

@Module({
  imports: [PushModule, CatalogModule, BasariModule],
  controllers: [SpecialistsController],
  providers: [SpecialistsService, CalendarService, JwtAuthGuard],
})
export class SpecialistsModule {}
