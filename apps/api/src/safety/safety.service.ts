import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AddContactInput } from './safety.dto';

// EK Z.2 — Randevu güvenlik katmanı servisi.
// Privacy-by-design: ham konum (lat/lng) ve telefon ASLA audit/log/analytics'e yazılmaz.
// Konum paylaşımı varsayılan KAPALI — oturum başlatmak açık rızadır.
@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Güvenilen kişiler ──────────────────────────────────────────────────
  async contacts(userId: string) {
    return this.prisma.trustedContact.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addContact(userId: string, input: AddContactInput) {
    const c = await this.prisma.trustedContact.create({
      data: { userId, name: input.name, phone: input.phone, relation: input.relation ?? '' },
    });
    return { id: c.id, name: c.name, relation: c.relation, phone: c.phone };
  }

  async removeContact(userId: string, id: string) {
    await this.prisma.trustedContact.deleteMany({ where: { id, userId } });
    return { ok: true };
  }

  // ── Güvenli mod oturumu ────────────────────────────────────────────────
  // Aktif (active|sos) oturum; kullanıcının konum paylaşımı açık mı özeti.
  async activeSession(userId: string) {
    const s = await this.prisma.safetySession.findFirst({
      where: { userId, status: { in: ['active', 'sos'] } },
      orderBy: { startedAt: 'desc' },
    });
    return s ? this.map(s) : null;
  }

  async startSession(userId: string, bookingId?: string) {
    // Zaten aktif oturum varsa onu döndür (idempotent — çift oturum açılmaz)
    const existing = await this.activeSession(userId);
    if (existing) return existing;
    const s = await this.prisma.safetySession.create({
      data: { userId, bookingId: bookingId ?? null, status: 'active' },
    });
    return this.map(s);
  }

  private async ownActive(userId: string, id: string) {
    const s = await this.prisma.safetySession.findUnique({ where: { id } });
    if (!s || s.userId !== userId) {
      throw new NotFoundException({ code: 'SESSION_NOT_FOUND', message: 'Oturum bulunamadı' });
    }
    return s;
  }

  async updateLocation(userId: string, id: string, lat: number, lng: number) {
    const s = await this.ownActive(userId, id);
    if (s.status === 'ended') {
      throw new BadRequestException({ code: 'SESSION_ENDED', message: 'Oturum kapandı' });
    }
    // Ham konum yalnızca satırda saklanır; hiçbir log/audit'e geçmez.
    const up = await this.prisma.safetySession.update({
      where: { id },
      data: { lastLat: lat, lastLng: lng, lastLocationAt: new Date() },
    });
    return this.map(up);
  }

  // SOS — oturum yoksa oluşturur; her hâlde çalışır. Audit'e KOORDİNAT yazılmaz.
  async sos(userId: string, id?: string) {
    let session = id
      ? await this.ownActive(userId, id)
      : await this.prisma.safetySession.findFirst({
          where: { userId, status: { in: ['active', 'sos'] } },
          orderBy: { startedAt: 'desc' },
        });
    if (!session) {
      session = await this.prisma.safetySession.create({
        data: { userId, status: 'sos', sosAt: new Date() },
      });
    } else if (session.status !== 'sos') {
      session = await this.prisma.safetySession.update({
        where: { id: session.id },
        data: { status: 'sos', sosAt: new Date() },
      });
    }
    // Kritik eylem izi — yalnız eylem + kullanıcı; konum/PII YOK.
    await this.prisma.auditLog.create({
      data: {
        action: 'safety.sos',
        resourceType: 'safety_session',
        resourceId: session.id,
        actorId: userId,
        actorRole: 'user',
      },
    });
    // Güvenilen kişilere bildirim gönderimi = gerçek push (EK Z.5) ile bağlanır.
    const contactCount = await this.prisma.trustedContact.count({ where: { userId } });
    return { ...this.map(session), notifiedContacts: contactCount };
  }

  // Check-in ("Güvendeyim") → oturumu kapat
  async checkIn(userId: string, id: string) {
    const s = await this.ownActive(userId, id);
    const up = await this.prisma.safetySession.update({
      where: { id: s.id },
      data: { status: 'ended', endedAt: new Date() },
    });
    return this.map(up);
  }

  private map(s: {
    id: string;
    bookingId: string | null;
    status: string;
    lastLat: number | null;
    lastLng: number | null;
    lastLocationAt: Date | null;
    sosAt: Date | null;
    startedAt: Date;
    endedAt: Date | null;
  }) {
    return {
      id: s.id,
      bookingId: s.bookingId,
      status: s.status,
      hasLocation: s.lastLat != null && s.lastLng != null,
      lastLocationAt: s.lastLocationAt,
      sosAt: s.sosAt,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
    };
  }
}
