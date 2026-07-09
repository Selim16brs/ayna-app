import { ForbiddenException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Env } from '@ayna/config/env';
import { ENV } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';

interface ChatMsg {
  role: 'system' | 'user';
  content: string;
}

const BONI_SYSTEM =
  "Sen AYNA'nın güzellik danışmanı Boni'sin — meraklı, sıcak, çalışkan bir kedi karakteri. " +
  'Kadınlara güzellik ve kişisel bakım konusunda KISA (2-4 cümle), samimi ve net yardım edersin. ' +
  'Tıbbi teşhis KOYMAZSIN; ciddi/sağlık konusunda nazikçe bir uzmana danışmayı önerirsin. ' +
  'Uygun olduğunda AYNA üzerinden teklif almayı veya randevu almayı öner. ' +
  "Kullanıcının yazdığı dile (Türkçe/Rusça/Kazakça) aynı dilde yanıt ver. Emoji'yi ölçülü kullan.";

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private period(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  // §11 — premium: eski isPremium bayrağı YA DA üyelik katmanı (dekont onayı tier yazar)
  private isPaid(u: { isPremium: boolean; membershipTier: string } | null): boolean {
    return (
      !!u && (u.isPremium || u.membershipTier === 'premium' || u.membershipTier === 'platinum')
    );
  }

  async quota(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    const cur = this.period();
    const used = u && u.aiPeriod === cur ? u.aiUsed : 0;
    const limit = this.env.AI_MONTHLY_QUOTA;
    return { premium: this.isPaid(u), used, limit, remaining: Math.max(0, limit - used) };
  }

  // Premium + ortak kota kontrolü; AI çağrısı BAŞARILIYSA 1 hak düşülür (atomik).
  private async runWithQuota(
    userId: string,
    messages: ChatMsg[],
  ): Promise<{ text: string; remaining: number }> {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u || !this.isPaid(u)) {
      throw new ForbiddenException({
        code: 'PREMIUM_REQUIRED',
        message: 'AI yalnızca premium üyelerde',
      });
    }
    const cur = this.period();
    const used = u.aiPeriod === cur ? u.aiUsed : 0;
    const limit = this.env.AI_MONTHLY_QUOTA;
    if (used >= limit) {
      throw new HttpException(
        { code: 'QUOTA_EXCEEDED', message: 'Bu ayki AI hakkın doldu' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const text = await this.callModel(messages); // hata → kota harcanmaz
    await this.prisma.user.update({
      where: { id: userId },
      data: { aiPeriod: cur, aiUsed: u.aiPeriod === cur ? { increment: 1 } : 1 },
    });
    return { text, remaining: Math.max(0, limit - used - 1) };
  }

  // §5.4 — Boni GERÇEK randevu/talep verisine bağlı yanıt verir ("yarın randevun var mı?").
  // Yalnız kullanıcının KENDİ verisi, kendi sorusu için; telefon/adres GÖNDERİLMEZ (gizlilik).
  private async userContext(userId: string): Promise<string> {
    const now = new Date();
    const [bookings, demands] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          userId,
          startAt: { gte: now },
          status: {
            in: ['confirmed', 'deposit_pending', 'deposit_submitted', 'awaiting_provider'],
          },
        },
        orderBy: { startAt: 'asc' },
        take: 5,
      }),
      this.prisma.quoteRequest.findMany({
        where: { userId, status: 'open' },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
    ]);
    const lines: string[] = [];
    if (bookings.length) {
      lines.push('Yaklaşan randevuları:');
      for (const b of bookings) {
        const when = b.startAt
          ? b.startAt.toLocaleString('tr-TR', {
              timeZone: 'Asia/Almaty',
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : b.dateLabel;
        lines.push(`- ${b.service} · ${b.proName} · ${when} · durum: ${b.status}`);
      }
    } else {
      lines.push('Yaklaşan onaylı randevusu yok.');
    }
    if (demands.length) {
      lines.push('Açık teklif talepleri:');
      for (const d of demands) lines.push(`- ${d.categoryId} (teklif topluyor)`);
    }
    return lines.join('\n');
  }

  async boni(userId: string, question: string) {
    // §5.4 — kullanıcı bağlamını sistem mesajına ekle (gerçek randevu/talep farkındalığı)
    const ctx = await this.userContext(userId);
    const { text, remaining } = await this.runWithQuota(userId, [
      {
        role: 'system',
        content: `${BONI_SYSTEM}\n\n[Kullanıcının güncel AYNA durumu — sorusu ilgiliyse bunu kullan, değilse yok say]\n${ctx}`,
      },
      { role: 'user', content: question },
    ]);
    return { answer: text, remaining };
  }

  async photo(userId: string, note?: string) {
    const { text, remaining } = await this.runWithQuota(userId, [
      {
        role: 'system',
        content:
          'Bir güzellik referans fotoğrafını analiz ediyorsun. İşlem türü, tahmini süre ' +
          've Almatı ortalama fiyatını (KZT) içeren kısa bir iş tarifi öner.',
      },
      { role: 'user', content: note ?? 'Bu referans için iş tarifi ve bütçe öner.' },
    ]);
    return { analysis: text, remaining };
  }

  async search(userId: string, query: string) {
    const { text, remaining } = await this.runWithQuota(userId, [
      {
        role: 'system',
        content: 'Doğal dildeki güzellik isteğini kategorilere ayır ve uygun hizmetleri öner.',
      },
      { role: 'user', content: query },
    ]);
    return { result: text, remaining };
  }

  // Dev/demo: kullanıcı premium durumunu değiştirir (üretimde ödeme akışıyla yönetilir)
  async setPremium(userId: string, value: boolean) {
    const u = await this.prisma.user.update({ where: { id: userId }, data: { isPremium: value } });
    return { premium: u.isPremium };
  }

  // TEK sağlayıcı: OpenAI. Anahtar admin panel (apikey.openai) ya da env'den; yoksa güvenli mock.
  private async apiKey(): Promise<string | null> {
    const row = await this.prisma.setting.findUnique({ where: { key: 'apikey.openai' } });
    return row?.strValue?.trim() || this.env.OPENAI_API_KEY || null;
  }

  // §5.4 — Boni LLM çağrısı (OpenAI); anahtar yoksa güvenli mock (asla hard-error).
  private async callModel(messages: ChatMsg[]): Promise<string> {
    const key = await this.apiKey();
    if (!key) return mockReply(messages);
    return this.callOpenAI(messages, key);
  }

  private async callOpenAI(messages: ChatMsg[], key: string): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      // gpt-4o-mini: Boni'nin kısa sohbeti için fazlasıyla yeterli + en düşük maliyet
      body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 500, temperature: 0.6 }),
    });
    if (!res.ok) {
      throw new HttpException(
        { code: 'AI_FAILED', message: `OpenAI çağrısı başarısız (${res.status})` },
        HttpStatus.BAD_GATEWAY,
      );
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? mockReply(messages);
  }
}

// Anahtar yokken makul, güvenli demo yanıtı (TR) — asla hard-error verme.
function mockReply(messages: ChatMsg[]): string {
  const q = messages.find((m) => m.role === 'user')?.content ?? '';
  return (
    `Boni 💬 "${q.slice(0, 60)}" için kısa önerim — cilt/saç tipine uygun, nazik ürünlerle ` +
    'başla ve işlemi alanında deneyimli bir uzmana yaptır. AYNA’dan teklif alarak en doğru ' +
    'uzmanla eşleşebilirsin. (Not: Boni’nin tam zekâsı için admin panel → Ayarlar’a OpenAI anahtarı eklenmeli.)'
  );
}
