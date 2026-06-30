import { Module } from '@nestjs/common';
import { SpecialistsController } from './specialists.controller';
import { SpecialistsService } from './specialists.service';

@Module({
  controllers: [SpecialistsController],
  providers: [SpecialistsService],
})
export class SpecialistsModule {}
