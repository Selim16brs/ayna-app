import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Özellik bayrakları — hassas özellikler önce internal beta (EK D.4).
 * Bilinmeyen bayrak güvenli varsayılan olarak KAPALI döner.
 */
@Injectable()
export class FeatureFlagService {
  constructor(private readonly prisma: PrismaService) {}

  async isEnabled(key: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    return flag?.enabled ?? false;
  }
}
