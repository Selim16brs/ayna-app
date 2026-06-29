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
