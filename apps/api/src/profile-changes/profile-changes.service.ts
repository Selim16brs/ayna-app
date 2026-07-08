import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// §profil-onay — SALON/UZMAN profil değişikliği admin onayı olmadan uygulanmaz.
@Injectable()
export class ProfileChangesService {
  constructor(private readonly prisma: PrismaService) {}

  private notFound(): never {
    throw new NotFoundException({ code: 'NOT_FOUND', message: 'Talep bulunamadı' });
  }

  private async audit(action: string, resourceId: string, actorId?: string) {
    await this.prisma.auditLog.create({
      data: {
        action,
        resourceType: 'profile_change',
        resourceId,
        actorId: actorId ?? null,
        actorRole: 'admin',
      },
    });
  }

  // ── Mobil (salon/uzman) ──────────────────────────────────────────────
  // Yeni talep: varsa önceki bekleyeni geçersiz kıl (yalnız en güncel bekler).
  async submit(userId: string, changes: Record<string, unknown>) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) this.notFound();
    await this.prisma.profileChangeRequest.updateMany({
      where: { userId, status: 'pending' },
      data: { status: 'rejected', reviewedAt: new Date() },
    });
    return this.prisma.profileChangeRequest.create({
      data: {
        userId,
        userName: user!.name,
        role: user!.role,
        changes: changes as object,
        status: 'pending',
      },
    });
  }

  // Kullanıcının son talebi (mobil onay durumunu + onaylı değişikliği okur)
  mine(userId: string) {
    return this.prisma.profileChangeRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Admin ────────────────────────────────────────────────────────────
  list(status?: string) {
    return this.prisma.profileChangeRequest.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  // Onayla: durumu approved. name değişikliği varsa backend User.name'i günceller
  // (diğer seller alanları — social/hours/certs — mobil tarafta onaylıyı çekip uygular).
  async approve(id: string, actorId?: string) {
    const req = await this.prisma.profileChangeRequest.findUnique({ where: { id } });
    if (!req) this.notFound();
    const changes = (req!.changes ?? {}) as Record<string, unknown>;
    if (typeof changes.name === 'string' && changes.name.trim()) {
      await this.prisma.user.update({
        where: { id: req!.userId },
        data: { name: changes.name.trim() },
      });
    }
    const updated = await this.prisma.profileChangeRequest.update({
      where: { id },
      data: { status: 'approved', reviewedAt: new Date() },
    });
    await this.audit('profile_change.approve', id, actorId);
    return updated;
  }

  async reject(id: string, actorId?: string) {
    const req = await this.prisma.profileChangeRequest.findUnique({ where: { id } });
    if (!req) this.notFound();
    const updated = await this.prisma.profileChangeRequest.update({
      where: { id },
      data: { status: 'rejected', reviewedAt: new Date() },
    });
    await this.audit('profile_change.reject', id, actorId);
    return updated;
  }
}
