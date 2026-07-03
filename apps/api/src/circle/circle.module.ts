import { Module } from '@nestjs/common';
import { CircleAdminController } from './circle-admin.controller';
import { CircleController } from './circle.controller';
import { CircleService } from './circle.service';

@Module({
  controllers: [CircleController, CircleAdminController],
  providers: [CircleService],
})
export class CircleModule {}
