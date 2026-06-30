import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { BusinessesModule } from './businesses/businesses.module';
import { SpecialistsModule } from './specialists/specialists.module';
import { CatalogModule } from './catalog/catalog.module';
import { ConfigModule } from './config/config.module';
import { FeatureFlagModule } from './feature-flags/feature-flag.module';
import { HealthModule } from './health/health.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { MarketModule } from './market/market.module';
import { PrismaModule } from './prisma/prisma.module';
import { RatingsModule } from './ratings/ratings.module';

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
    LoyaltyModule,
    BusinessesModule,
    SpecialistsModule,
    MarketModule,
    RatingsModule,
  ],
})
export class AppModule {}
