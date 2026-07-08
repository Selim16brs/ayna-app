import { ForbiddenException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Env } from '@ayna/config/env';
import { ENV } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';

interface ChatMsg {
  role: 'system' | 'user';
  content: string;
}

const BONI_SYSTEM =
  "Sen AYNA'nın güzellik danışmanı Boni'sin. Kadınlara güzellik ve kişisel bakım " +
  'konusunda kısa, sıcak ve net yardım edersin. Tıbbi teşhis koymaz, gerektiğinde ' +
  'bir uzmana danışmayı veya AYNA üzerinden randevu almayı önerirsin. Kullanıcının ' +
  'diline (TR/RU/KK) uygun yanıt ver.';

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

  async quota(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    const cur = this.period();
    const used = u && u.aiPeriod === cur ? u.aiUsed : 0;
    const limit = this.env.AI_MONTHLY_QUOTA;
    return { premium: u?.isPremium ?? false, used, limit, remaining: Math.max(0, limit - used) };
  }

  // Premium + ortak kota kontrolü; AI çağrısı BAŞARILIYSA 1 hak düşülür (atomik).
  private async runWithQuota(
    userId: string,
    messages: ChatMsg[],
  ): Promise<{ text: string; remaining: number }> {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u || !u.isPremium) {
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

  async boni(userId: string, question: string) {
    const { text, remaining } = await this.runWithQuota(userId, [
      { role: 'system', content: BONI_SYSTEM },
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

  // OpenAI proxy — anahtar yoksa güvenli mock (geliştirme/demo)
  private async callModel(messages: ChatMsg[]): Promise<string> {
    const key = this.env.OPENAI_API_KEY;
    if (!key) return mockReply(messages);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', messages, max_tokens: 400, temperature: 0.6 }),
    });
    if (!res.ok) {
      throw new HttpException(
        { code: 'AI_FAILED', message: 'AI çağrısı başarısız' },
        HttpStatus.BAD_GATEWAY,
      );
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? mockReply(messages);
  }
}

// Anahtar yokken makul, güvenli demo yanıtı (TR)
function mockReply(messages: ChatMsg[]): string {
  const q = messages.find((m) => m.role === 'user')?.content ?? '';
  return (
    `Boni 💬 (demo): "${q.slice(0, 60)}" sorun için kısa önerim — ` +
    'cilt/saç tipine uygun, nazik ürünlerle başla ve işlemi alanında deneyimli bir ' +
    'uzmana yaptır. Emin değilsen AYNA’dan bir uzmana danışabilir veya randevu alabilirsin. ' +
    '(Gerçek OpenAI yanıtı için backend’e OPENAI_API_KEY ekle.)'
  );
}
