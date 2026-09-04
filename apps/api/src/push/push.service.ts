import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { type PushTemplateKey, renderPush } from './push.templates';
import { deadTokensFrom, nextState, shortError } from './outbox.rules';
import { buildExpoMessages, isValidExpoToken, type PushPayload } from './push.util';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// EK Z.5 / §10.3 — Uzaktan push servisi (Expo Push API).
//
// Bildirimler artık fire-and-forget DEĞİL: her biri önce outbox'a yazılıyor,
// sonra teslim ediliyor. Teslim başarısızsa satır `pending` kalıyor ve
// zamanlayıcı artan aralıklarla tekrar deniyor.
//
// Çağıran akış (randevu, mesaj) yine hiçbir zaman bloklanmaz ve push hatası
// akışı bozmaz — değişen tek şey, hatanın artık KAYBOLMAMASI.
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

  /**
   * BİLDİRİM GEÇMİŞİ — kullanıcının kendi kutusu.
   *
   * Uygulama içindeki liste yalnız kullanıcının KENDİ yaptıklarını
   * biliyordu; karşı tarafın yaptıkları push olarak geçip kayboluyordu.
   * Bu uç, sunucunun o kullanıcıya gönderdiği her bildirimi döndürüyor —
   * push teslim edilemese ya da izin verilmemiş olsa bile.
   *
   * 50 satır: liste ekranı bundan fazlasını göstermiyor ve 30 günlük
   * saklama zaten üst sınır koyuyor.
   */
  async history(userId: string) {
    const rows = await this.prisma.userNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      route: r.route ?? null,
      read: r.readAt != null,
      createdAtMs: r.createdAt.getTime(),
    }));
  }

  /**
   * Okundu işaretler. `id` verilmezse KULLANICININ TÜMÜ.
   *
   * Sahiplik `where` içinde: başka kullanıcının bildirimini okundu
   * yapmak mümkün olmasın diye kimlik tek başına yeterli değil.
   */
  async markRead(userId: string, id?: string) {
    const sonuc = await this.prisma.userNotification.updateMany({
      where: { userId, readAt: null, ...(id ? { id } : {}) },
      data: { readAt: new Date() },
    });
    return { updated: sonuc.count };
  }

  // Faz 6 (§29) — kullanıcının DİLİNDE push: şablon sözlüğünden çözer (fallback tr)
  async sendTemplate(
    userId: string,
    key: PushTemplateKey,
    params?: Record<string, string>,
    data?: Record<string, string>,
  ): Promise<void> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { defaultLocale: true },
    });
    const { title, body } = renderPush(u?.defaultLocale, key, params);
    return this.sendToUser(userId, { title, body, ...(data ? { data } : {}) });
  }

  /**
   * Bildirimi outbox'a yazar ve hemen teslim etmeyi dener.
   *
   * Yazma başarısız olursa (veritabanı erişilemez) çağıran akış yine bozulmaz;
   * ama bu durum log'a ERROR olarak düşer — sessiz kayıp yok.
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    /*
     * ── ÖNCE KUTUYA, SONRA TESLİME ──────────────────────────────────────
     *
     * Outbox bir TESLİM kuyruğu: teslim edileni 7 gün sonra siliyor,
     * edilemeyeni "dead" bırakıyor. Kullanıcının okuyacağı geçmiş bu
     * olamaz. Bildirim önce kullanıcının KENDİ kutusuna yazılıyor —
     * telefon kapalı olsa, push izni verilmemiş olsa, teslim hiç
     * başarmasa bile uygulama açıldığında orada duruyor.
     *
     * Yazma başarısız olursa teslim yine denenir: geçmişi kaybetmek,
     * bildirimi hiç göndermemekten iyidir.
     */
    const route = typeof payload.data?.route === 'string' ? payload.data.route : null;
    await this.prisma.userNotification
      .create({
        data: {
          userId,
          title: payload.title,
          body: payload.body,
          ...(route ? { route } : {}),
        },
      })
      .catch((e: unknown) => {
        this.log.error(`bildirim geçmişi yazılamadı: ${shortError(e)}`);
      });
    let row: { id: string } | null = null;
    try {
      row = await this.prisma.notificationOutbox.create({
        data: {
          userId,
          title: payload.title,
          body: payload.body,
          dataJson: JSON.stringify(payload.data ?? {}),
        },
        select: { id: true },
      });
    } catch (e) {
      this.log.error(`outbox yazılamadı, bildirim kayboldu: ${shortError(e)}`);
      return;
    }
    // Teslimi beklemeden dön: çağıran akış (randevu/mesaj) push'a bağlı kalmaz.
    // Başarısız olursa satır pending kalır, zamanlayıcı devralır.
    void this.deliver(row.id).catch(() => undefined);
  }

  /**
   * Tek bir outbox satırını teslim etmeyi dener.
   * Zamanlayıcı da bunu çağırır — teslim mantığı tek yerde.
   */
  async deliver(id: string): Promise<boolean> {
    const row = await this.prisma.notificationOutbox.findUnique({ where: { id } });
    if (!row || row.status !== 'pending') return false;

    const now = Date.now();
    const attempts = row.attempts + 1;

    const basarisiz = async (hata: string) => {
      const { status, nextAttemptAt } = nextState(attempts, now);
      await this.prisma.notificationOutbox.update({
        where: { id },
        data: { attempts, lastError: hata, status, nextAttemptAt },
      });
      if (status === 'dead') {
        this.log.error(`bildirim teslim edilemedi (hak bitti): ${id} — ${hata}`);
      }
    };

    try {
      const tokens = (
        await this.prisma.pushToken.findMany({
          where: { userId: row.userId },
          select: { token: true },
        })
      ).map((r) => r.token);

      const data = ((): Record<string, unknown> => {
        try {
          const v: unknown = JSON.parse(row.dataJson);
          return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
        } catch {
          return {};
        }
      })();

      const messages = buildExpoMessages(tokens, { title: row.title, body: row.body, data });
      if (messages.length === 0) {
        // Kullanıcının kayıtlı cihazı yok. Tekrar denemek anlamsız — uygulama
        // içi bildirim merkezi zaten ayrı çalışıyor.
        await this.prisma.notificationOutbox.update({
          where: { id },
          data: { status: 'sent', attempts, sentAt: new Date(now), lastError: 'cihaz yok' },
        });
        return true;
      }

      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });
      if (!res.ok) {
        await basarisiz(`HTTP ${res.status}`);
        return false;
      }

      // Expo 200 dönse bile mesaj başına hata verebilir. Yanıt eskiden HİÇ
      // OKUNMUYORDU: geçersiz token sonsuza kadar aynı hatayı üretirdi.
      const yanit: unknown = await res.json().catch(() => null);
      const { dead, hatali } = deadTokensFrom(
        messages.map((m) => m.to),
        yanit,
      );
      if (dead.length) {
        await this.prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
        this.log.log(`kayıtlı olmayan ${dead.length} cihaz token'ı silindi`);
      }

      await this.prisma.notificationOutbox.update({
        where: { id },
        data: {
          status: 'sent',
          attempts,
          sentAt: new Date(now),
          lastError: hatali > 0 ? `${hatali} mesaj hata verdi` : null,
        },
      });
      return true;
    } catch (e) {
      await basarisiz(shortError(e));
      return false;
    }
  }
}
