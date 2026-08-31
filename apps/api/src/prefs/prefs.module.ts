import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PushModule } from '../push/push.module';
import { ReengageController } from '../reengage/reengage.controller';
import { ReengageScheduler } from '../reengage/reengage.scheduler';
import { ReengageService } from '../reengage/reengage.service';
import { PrefsController } from './prefs.controller';
import { PrefsService } from './prefs.service';

// Tercihler ve geri çağırma birlikte: zamanlayıcı `autoReengage` tercihini
// okuyor, ikisi aynı veriyi paylaşıyor.
@Module({
  imports: [PrismaModule, PushModule],
  controllers: [PrefsController, ReengageController],
  providers: [PrefsService, ReengageScheduler, ReengageService],
})
export class PrefsModule {}
