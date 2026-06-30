import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Env } from '@ayna/config/env';
import { ENV } from '../config/config.module';
import { verifyJwt } from '../common/crypto';

export interface AuthedRequest extends Request {
  user?: { id: string; role: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Env) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = token ? verifyJwt(token, this.env.JWT_ACCESS_SECRET) : null;
    if (!payload || typeof payload.sub !== 'string') {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Giriş gerekli' });
    }
    req.user = { id: payload.sub, role: String(payload.role ?? 'user') };
    return true;
  }
}
