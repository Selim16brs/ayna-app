import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Railway çok-hop proxy zincirinde (istemci → edge → iç LB → app) express'in
// `trust proxy` sayacıyla istemci IP'sini seçmek kırılgan: yanlış sayıda hop,
// kovaları EDGE düğümüne göre böler ve limit fiilen devre dışı kalır (canlıda
// gözlendi: 25 istek → kova başına ~6). Bu yüzden izleyici anahtarı doğrudan
// X-Forwarded-For'un İLK girdisinden (gerçek istemci) alınır.
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: {
    headers?: Record<string, string | string[] | undefined>;
    ip?: string;
  }): Promise<string> {
    const xff = req.headers?.['x-forwarded-for'];
    const first = (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim();
    return first || req.ip || 'unknown';
  }
}
