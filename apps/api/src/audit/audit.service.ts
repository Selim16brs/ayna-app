import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditInput {
  actorId?: string;
  actorRole?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  requestId?: string;
  ip?: string;
  device?: string;
  /** Hassas veri İÇERMEZ — docs/security/03 (EK H.5). */
  safeDiff?: Record<string, unknown>;
}

/** Kritik eylemlerin denetim kaydını yazar. IP/device hash'lenir, ham tutulmaz. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        requestId: input.requestId ?? null,
        ipHash: input.ip ? hash(input.ip) : null,
        deviceHash: input.device ? hash(input.device) : null,
        ...(input.safeDiff !== undefined
          ? { safeDiff: input.safeDiff as Prisma.InputJsonValue }
          : {}),
      },
    });
  }
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
