import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { SupportAdminController, SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [PushModule],
  controllers: [SupportController, SupportAdminController],
  providers: [SupportService],
})
export class SupportModule {}
