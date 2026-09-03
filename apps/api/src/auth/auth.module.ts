import { Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module';
import { AuthController } from './auth.controller';
import { AccountDataService } from './account-data.service';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OptionalJwtAuthGuard } from './optional-jwt.guard';

@Module({
  imports: [SmsModule],
  controllers: [AuthController],
  providers: [AuthService, AccountDataService, JwtAuthGuard, OptionalJwtAuthGuard],
  exports: [JwtAuthGuard, OptionalJwtAuthGuard],
})
export class AuthModule {}
