import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';
import { StorageModule } from './storage/storage.module';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { BusinessesModule } from './businesses/businesses.module';
import { SpecialistsModule } from './specialists/specialists.module';
import { CatalogModule } from './catalog/catalog.module';
import { CircleModule } from './circle/circle.module';
import { CommissionsModule } from './commissions/commissions.module';
import { ConfigModule } from './config/config.module';
import { CutoutModule } from './cutout/cutout.module';
import { ContentModule } from './content/content.module';
import { DisputesModule } from './disputes/disputes.module';
import { FeatureFlagModule } from './feature-flags/feature-flag.module';
import { HealthModule } from './health/health.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { MarketModule } from './market/market.module';
import { PrismaModule } from './prisma/prisma.module';
import { RatingsModule } from './ratings/ratings.module';
import { SettingsModule } from './settings/settings.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ProfileChangesModule } from './profile-changes/profile-changes.module';
import { MessagingModule } from './messaging/messaging.module';
import { SafetyModule } from './safety/safety.module';
import { KycModule } from './kyc/kyc.module';
import { PushModule } from './push/push.module';
import { OffersModule } from './offers/offers.module';
import { QuotesModule } from './quotes/quotes.module';
import { ReferralModule } from './referral/referral.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    // Küresel hız limiti: IP başına 60 sn'de 300 istek (normal mobil kullanımın çok
    // üstünde; brute-force/flood'u keser). Hassas auth uçları kendi sıkı limitini
    // @Throttle ile ayrıca tanımlar. trust proxy main.ts'te (Railway X-Forwarded-For).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    StorageModule,
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
    AiModule,
    AdminModule,
    ContentModule,
    SettingsModule,
    CommissionsModule,
    SubscriptionsModule,
    ProfileChangesModule,
    DisputesModule,
    CircleModule,
    CutoutModule,
    MessagingModule,
    SafetyModule,
    KycModule,
    PushModule,
    OffersModule,
    QuotesModule,
    ReferralModule,
    PaymentModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class AppModule {}
