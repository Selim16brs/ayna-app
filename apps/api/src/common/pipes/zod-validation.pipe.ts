import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/**
 * Zod tabanlı doğrulama pipe'ı (class-validator yerine — docs/planning/06).
 * Hata → standart format (BadRequest), kod VALIDATION_ERROR.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Geçersiz veri',
        details: result.error.issues,
      });
    }
    return result.data;
  }
}
