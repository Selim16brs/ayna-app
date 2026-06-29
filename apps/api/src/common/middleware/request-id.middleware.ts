import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Her isteğe stabil bir requestId atar (gelen X-Request-Id varsa kullanır).
 * audit_logs ve standart hata formatı bu değeri taşır (docs/planning/07 §5).
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const requestId = incoming && incoming.length <= 128 ? incoming : `req_${randomUUID()}`;
  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
