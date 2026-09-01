import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { AdminController } from './admin.controller';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { AdminService } from './admin.service';
import { RandevuKuyrukService } from './randevu-kuyruk.service';

@Module({
  imports: [PushModule],
  controllers: [AdminController],
  providers: [AdminService, AdminBootstrapService, RandevuKuyrukService],
})
export class AdminModule {}
