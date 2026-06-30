import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Env } from '@ayna/config/env';
import { ENV } from '../config/config.module';
import { verifyJwt } from './crypto';
import type { AuthedRequest } from '../auth/jwt-auth.guard';

/** Yalnızca admin rolü; JWT'yi doğrular ve req.user'ı set eder. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Env) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = token ? verifyJwt(token, this.env.JWT_ACCESS_SECRET) : null;
    if (!payload || typeof payload.sub !== 'string') {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Giriş gerekli' });
    }
    if (payload.role !== 'admin') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yetkisiz' });
    }
    req.user = { id: payload.sub, role: 'admin' };
    return true;
  }
}
