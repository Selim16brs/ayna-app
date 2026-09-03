import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { StorageModule } from '../storage/storage.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProPostsController } from './pro-posts.controller';
import { ProPostsScheduler } from './pro-posts.scheduler';
import { ProPostsService } from './pro-posts.service';

@Module({
  imports: [PushModule, StorageModule],
  controllers: [ProPostsController],
  providers: [ProPostsService, ProPostsScheduler, JwtAuthGuard],
})
export class ProPostsModule {}
