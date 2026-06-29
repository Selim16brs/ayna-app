import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { ConfigModule } from './config/config.module';
import { FeatureFlagModule } from './feature-flags/feature-flag.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule, AuditModule, FeatureFlagModule, HealthModule],
})
export class AppModule {}
