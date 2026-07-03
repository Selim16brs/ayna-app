import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { FileDisputeInput, ResolveDisputeInput } from './disputes.dto';

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  private map(d: {
    id: string;
    bookingRef: string;
    userId: string | null;
    proName: string;
    service: string;
    kind: string;
    amount: unknown;
    receiptUri: string | null;
    note: string;
    status: string;
    resolution: string;
    createdAt: Date;
    resolvedAt: Date | null;
  }) {
    return {
      id: d.id,
      bookingRef: d.bookingRef,
      proName: d.proName,
      service: d.service,
      kind: d.kind,
      amount: Number(d.amount),
      receiptUri: d.receiptUri,
      note: d.note,
      status: d.status,
      resolution: d.resolution,
      createdAt: d.createdAt,
      resolvedAt: d.resolvedAt,
    };
  }

  async file(userId: string | undefined, input: FileDisputeInput) {
    // Aynı randevu+tür için açık kayıt varsa güncelle (tekrar açmayı önle)
    const existing = await this.prisma.dispute.findFirst({
      where: { bookingRef: input.bookingRef, kind: input.kind, status: 'open' },
    });
    if (existing) {
      const updated = await this.prisma.dispute.update({
        where: { id: existing.id },
        data: {
          receiptUri: input.receiptUri ?? existing.receiptUri,
          note: input.note ?? existing.note,
          amount: input.amount ?? existing.amount,
        },
      });
      return this.map(updated);
    }
    const d = await this.prisma.dispute.create({
      data: {
        bookingRef: input.bookingRef,
        userId: userId ?? null,
        proName: input.proName,
        service: input.service ?? '',
        kind: input.kind,
        amount: input.amount ?? 0,
        receiptUri: input.receiptUri ?? null,
        note: input.note ?? '',
      },
    });
    return this.map(d);
  }

  async mine(userId: string) {
    const rows = await this.prisma.dispute.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.map(r));
  }

  // Admin kuyruğu — açık (çözülmemiş = resolvedAt null) olanlar önce
  async queue() {
    const rows = await this.prisma.dispute.findMany({
      orderBy: [{ resolvedAt: { sort: 'desc', nulls: 'first' } }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.map(r));
  }

  async resolve(id: string, input: ResolveDisputeInput, actorId?: string) {
    const d = await this.prisma.dispute.findUnique({ where: { id } });
    if (!d) throw new NotFoundException({ code: 'DISPUTE_NOT_FOUND', message: 'Anlaşmazlık yok' });
    const updated = await this.prisma.dispute.update({
      where: { id },
      data: {
        status: input.decision === 'approve' ? 'approved' : 'rejected',
        resolution: input.resolution ?? '',
        resolvedAt: new Date(),
      },
    });
    await this.prisma.auditLog.create({
      data: {
        action: `dispute.${input.decision}`,
        resourceType: 'dispute',
        resourceId: id,
        actorId: actorId ?? null,
        actorRole: 'admin',
      },
    });
    return this.map(updated);
  }
}
