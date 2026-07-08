import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildExpoMessages, isValidExpoToken, type PushPayload } from './push.util';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// EK Z.5 — Uzaktan push servisi (Expo Push API). Gönderim fire-and-forget: hata akışı bozmaz.
@Injectable()
export class PushService {
  private readonly log = new Logger(PushService.name);
  constructor(private readonly prisma: PrismaService) {}

  // Cihaz token kaydı (token benzersiz → başka kullanıcıya taşınırsa userId güncellenir)
  async register(userId: string, token: string, platform?: string) {
    if (!isValidExpoToken(token)) return { ok: false };
    await this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform: platform ?? '' },
      update: { userId, platform: platform ?? '' },
    });
    return { ok: true };
  }

  async remove(userId: string, token: string) {
    await this.prisma.pushToken.deleteMany({ where: { token, userId } });
    return { ok: true };
  }

  // Bir kullanıcının tüm cihazlarına push (deep-link data ile). Hata yutulur.
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    try {
      const rows = await this.prisma.pushToken.findMany({
        where: { userId },
        select: { token: true },
      });
      const messages = buildExpoMessages(
        rows.map((r) => r.token),
        payload,
      );
      if (messages.length === 0) return;
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });
    } catch (e) {
      // Push başarısızlığı çağıran akışı (mesaj/randevu) ASLA bozmaz
      this.log.warn(`push sendToUser failed: ${String(e)}`);
    }
  }
}
