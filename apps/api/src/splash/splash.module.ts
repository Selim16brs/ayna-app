import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SplashAdminController, SplashController } from './splash.controller';
import { SplashService } from './splash.service';

@Module({
  imports: [PrismaModule],
  controllers: [SplashController, SplashAdminController],
  providers: [SplashService],
  exports: [SplashService],
})
export class SplashModule {}
