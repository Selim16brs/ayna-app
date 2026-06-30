import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import {
  type LoginInput,
  loginSchema,
  type OtpRequestInput,
  otpRequestSchema,
  type OtpVerifyInput,
  otpVerifySchema,
  type RegisterInput,
  registerSchema,
} from './auth.dto';
import { type AuthedRequest, JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterInput) {
    return this.auth.register(body);
  }

  @Post('login')
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    return this.auth.login(body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AuthedRequest) {
    return this.auth.me(req.user!.id);
  }

  // §4.6 — OTP iste / doğrula (mock SMS)
  @Post('otp/request')
  otpRequest(@Body(new ZodValidationPipe(otpRequestSchema)) body: OtpRequestInput) {
    return this.auth.requestOtp(body.phone);
  }

  @Post('otp/verify')
  otpVerify(@Body(new ZodValidationPipe(otpVerifySchema)) body: OtpVerifyInput) {
    return this.auth.verifyOtp(body.phone, body.code);
  }
}
