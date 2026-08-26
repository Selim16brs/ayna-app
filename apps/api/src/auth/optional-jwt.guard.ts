import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Env } from '@ayna/config/env';
import { ENV } from '../config/config.module';
import { verifyJwt } from '../common/crypto';
import type { AuthedRequest } from './jwt-auth.guard';

/**
 * İSTEĞE BAĞLI doğrulama: token varsa `req.user` doldurulur, yoksa istek yine
 * de geçer.
 *
 * NEDEN: W2W akışı GİRİŞSİZ de okunabilir (keşif için önemli), ama giriş
 * yapmış kullanıcının kendi KAYDETTİKLERİ işaretli gelmeli. JwtAuthGuard
 * koysaydık akış girişsizlere kapanırdı; hiç koymazsak kaydetme durumu akışta
 * hiç görünmezdi.
 *
 * GÜVENLİK: bu koruma yetki VERMEZ, yalnız kimlik taşır. Geçersiz/süresi
 * dolmuş token sessizce yok sayılır — istek anonim olarak devam eder, çünkü
 * burada anonim erişim zaten serbesttir. Yazma uçlarında JwtAuthGuard kullanın.
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Env) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (token) {
      const payload = verifyJwt(token, this.env.JWT_ACCESS_SECRET);
      if (payload && typeof payload.sub === 'string') {
        req.user = { id: payload.sub, role: String(payload.role ?? 'user') };
      }
    }
    return true;
  }
}
