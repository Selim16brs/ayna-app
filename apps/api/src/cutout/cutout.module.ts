import { Module } from '@nestjs/common';
import { CutoutController } from './cutout.controller';
import { CutoutService } from './cutout.service';

@Module({
  controllers: [CutoutController],
  providers: [CutoutService],
})
export class CutoutModule {}
