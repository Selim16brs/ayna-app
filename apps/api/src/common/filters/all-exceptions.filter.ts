import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Tüm istisnaları standart hata zarfına çevirir (docs/planning/07-api-conventions.md §4).
 * Hassas veri ASLA mesaja konmaz (docs/security/03).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = req.requestId ?? 'unknown';

    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Beklenmeyen bir hata oluştu';
    let details: unknown[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      if (typeof resp === 'string') {
        message = resp;
        code = exception.name;
      } else if (resp && typeof resp === 'object') {
        const r = resp as Record<string, unknown>;
        code = (r.code as string) ?? exception.name;
        message = (r.message as string) ?? message;
        details = r.details as unknown[] | undefined;
      }
    } else if (isPrismaError(exception)) {
      // Prisma hataları ham hâlde dışarı çıkmamalı: mesajları tablo/kolon adı ve
      // bazen ihlal eden DEĞERİ taşır (docs/security/03).
      const mapped = mapPrismaError(exception);
      status = mapped.status;
      code = mapped.code;
      message = mapped.message;
      if (status >= 500) this.logger.error(`[${requestId}] prisma ${exception.code}`);
    } else if (isCodedError(exception)) {
      code = exception.code;
      message = exception.message;
      status = mapCodeToStatus(exception.code);
    }

    if (status >= 500) {
      this.logger.error(`[${requestId}] ${code}: ${message}`);
    }

    res.status(status).json({ error: { code, message, details, requestId } });
  }
}

type PrismaError = { code: string; meta?: { target?: unknown } };

/** Prisma'nın bilinen hata kodları `P` + dört rakam biçiminde. */
function isPrismaError(e: unknown): e is PrismaError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    typeof (e as { code: unknown }).code === 'string' &&
    /^P\d{4}$/.test((e as { code: string }).code)
  );
}

/** İhlal edilen kısıtın adını verir; Prisma bunu string ya da dizi olarak koyar. */
function constraintTarget(e: PrismaError): string {
  const t = e.meta?.target;
  if (typeof t === 'string') return t;
  if (Array.isArray(t)) return t.map(String).join(',');
  return '';
}

function mapPrismaError(e: PrismaError): { status: number; code: string; message: string } {
  if (e.code === 'P2002') {
    const target = constraintTarget(e);
    // A3 — slot benzersizliği trigger'ının ürettiği ihlal. Uygulama katmanındaki
    // advisory-lock kontrolünü aşan bir yarış buraya düşer; kullanıcı 500 değil
    // anlaşılır bir 409 görür ve başka saat seçebilir.
    if (target.includes('slot_key')) {
      return {
        status: 409,
        code: 'SLOT_CONFLICT',
        message: 'Bu saat az önce doldu — başka bir saat seç',
      };
    }
    if (target.includes('receipt_hash') || target.includes('refund_receipt_hash')) {
      return {
        status: 409,
        code: 'RECEIPT_ALREADY_USED',
        message: 'Bu dekont daha önce kullanılmış',
      };
    }
    return { status: 409, code: 'ALREADY_EXISTS', message: 'Bu kayıt zaten var' };
  }
  if (e.code === 'P2025') {
    return { status: 404, code: 'NOT_FOUND', message: 'Kayıt bulunamadı' };
  }
  if (e.code === 'P2003') {
    return { status: 409, code: 'REFERENCE_CONFLICT', message: 'İlişkili kayıt engelliyor' };
  }
  return { status: 500, code: 'INTERNAL_ERROR', message: 'Beklenmeyen bir hata oluştu' };
}

function isCodedError(e: unknown): e is { code: string; message: string } {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    typeof (e as { code: unknown }).code === 'string'
  );
}

function mapCodeToStatus(code: string): number {
  switch (code) {
    case 'BOOKING_INVALID_TRANSITION':
      return 409;
    case 'LOYALTY_INSUFFICIENT_BALANCE':
      return 422;
    case 'ANALYTICS_FORBIDDEN_FIELD':
      return 400;
    default:
      return 500;
  }
}
