import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { CatalogModule } from './catalog/catalog.module';
import { ConfigModule } from './config/config.module';
import { FeatureFlagModule } from './feature-flags/feature-flag.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuditModule,
    FeatureFlagModule,
    HealthModule,
    CatalogModule,
    BookingsModule,
    AuthModule,
  ],
})
export class AppModule {}
