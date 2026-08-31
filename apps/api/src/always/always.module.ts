import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PushModule } from '../push/push.module';
import { AlwaysController } from './always.controller';
import { AlwaysService } from './always.service';

@Module({
  imports: [PrismaModule, PushModule],
  controllers: [AlwaysController],
  providers: [AlwaysService],
})
export class AlwaysModule {}
