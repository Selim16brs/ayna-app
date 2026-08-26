import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AccountDataService } from './account-data.service';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OptionalJwtAuthGuard } from './optional-jwt.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AccountDataService, JwtAuthGuard, OptionalJwtAuthGuard],
  exports: [JwtAuthGuard, OptionalJwtAuthGuard],
})
export class AuthModule {}
