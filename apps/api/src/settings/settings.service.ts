import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  API_KEY_DEFS,
  type ApiKeyInput,
  type CitiesInput,
  RATE_DEFS,
  type RateInput,
} from './settings.dto';

const CITIES_ACTIVE_KEY = 'cities.active';
const CITIES_SOON_KEY = 'cities.soon';
const DEFAULT_ACTIVE = ['Almatı'];
const DEFAULT_SOON = ['Astana', 'Şımkent'];

// Anahtarı maskele: sk-****...3f2a (ilk 3 + son 4; arası gizli)
function mask(value: string | null): string {
  if (!value) return '';
  if (value.length <= 8) return '****';
  return `${value.slice(0, 3)}****…${value.slice(-4)}`;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async audit(action: string, resourceId: string, actorId?: string) {
    await this.prisma.auditLog.create({
      data: { action, resourceType: 'setting', resourceId, actorId: actorId ?? null, actorRole: 'admin' },
    });
  }

  // ── Parametrik oranlar ─────────────────────────────────────────────────
  async rates() {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: RATE_DEFS.map((r) => r.key) } },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.intValue]));
    return RATE_DEFS.map((r) => ({
      key: r.key,
      label: r.label,
      suffix: r.suffix,
      value: byKey.get(r.key) ?? r.default,
    }));
  }

  async setRate(input: RateInput, actorId?: string) {
    await this.prisma.setting.upsert({
      where: { key: input.key },
      create: { key: input.key, intValue: input.value },
      update: { intValue: input.value },
    });
    await this.audit('rate.set', input.key, actorId);
    return this.rates();
  }

  // ── API anahtarları (maskeli) ──────────────────────────────────────────
  async apiKeys() {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: API_KEY_DEFS.map((k) => k.key) } },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.strValue ?? null]));
    return API_KEY_DEFS.map((k) => {
      const raw = byKey.get(k.key) ?? null;
      return { provider: k.provider, label: k.label, masked: mask(raw), configured: !!raw };
    });
  }

  async setApiKey(input: ApiKeyInput, actorId?: string) {
    const def = API_KEY_DEFS.find((k) => k.provider === input.provider)!;
    const value = input.value.trim();
    await this.prisma.setting.upsert({
      where: { key: def.key },
      create: { key: def.key, intValue: 0, strValue: value || null },
      update: { strValue: value || null },
    });
    // PII/gizli değer audit'e yazılmaz — yalnızca hangi sağlayıcı değişti
    await this.audit('apikey.set', input.provider, actorId);
    return this.apiKeys();
  }

  // "Test Et" — anahtar biçim/varlık kontrolü (mock; gerçek çağrı sağlayıcıya gider)
  async testApiKey(provider: string) {
    const def = API_KEY_DEFS.find((k) => k.provider === provider);
    if (!def) return { ok: false, message: 'Bilinmeyen sağlayıcı' };
    const row = await this.prisma.setting.findUnique({ where: { key: def.key } });
    const value = row?.strValue?.trim() ?? '';
    if (!value) return { ok: false, message: 'Anahtar tanımlı değil' };
    if (provider === 'openai' && !value.startsWith('sk-')) {
      return { ok: false, message: 'OpenAI anahtarı "sk-" ile başlamalı' };
    }
    if (value.length < 12) return { ok: false, message: 'Anahtar çok kısa görünüyor' };
    return { ok: true, message: 'Anahtar biçimi geçerli' };
  }

  // ── Şehir yönetimi ─────────────────────────────────────────────────────
  private async cityList(key: string, fallback: string[]): Promise<string[]> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    if (!row?.strValue) return fallback;
    try {
      const parsed = JSON.parse(row.strValue);
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : fallback;
    } catch {
      return fallback;
    }
  }

  async cities() {
    const [active, soon] = await Promise.all([
      this.cityList(CITIES_ACTIVE_KEY, DEFAULT_ACTIVE),
      this.cityList(CITIES_SOON_KEY, DEFAULT_SOON),
    ]);
    return { active, soon };
  }

  async setCities(input: CitiesInput, actorId?: string) {
    await this.prisma.setting.upsert({
      where: { key: CITIES_ACTIVE_KEY },
      create: { key: CITIES_ACTIVE_KEY, intValue: 0, strValue: JSON.stringify(input.active) },
      update: { strValue: JSON.stringify(input.active) },
    });
    await this.prisma.setting.upsert({
      where: { key: CITIES_SOON_KEY },
      create: { key: CITIES_SOON_KEY, intValue: 0, strValue: JSON.stringify(input.soon) },
      update: { strValue: JSON.stringify(input.soon) },
    });
    await this.audit('cities.set', 'cities', actorId);
    return this.cities();
  }

  // ── Public config (app tüketir; gizli anahtar sızmaz) ──────────────────
  async publicConfig() {
    const rateRows = await this.rates();
    const rate = (key: string) => rateRows.find((r) => r.key === key)?.value ?? 0;
    const keys = await this.apiKeys();
    const feature = (provider: string) => keys.find((k) => k.provider === provider)?.configured ?? false;
    const cities = await this.cities();
    return {
      rates: {
        commissionPct: rate('commission.rate'),
        depositKzt: rate('rate.deposit_kzt'),
        cancelWindowH: rate('rate.cancel_window_h'),
        lateCancelPct: rate('rate.late_cancel_pct'),
        pointsCapPct: rate('rate.points_cap_pct'),
        premiumUserKzt: rate('rate.premium_user_kzt'),
        premiumSalonKzt: rate('rate.premium_salon_kzt'),
        raffleCost: rate('rate.raffle_cost'),
      },
      cities,
      // Özellik erişilebilirliği — anahtar tanımlı mı (değeri asla dönmez)
      features: { removebg: feature('removebg'), openai: feature('openai'), sms: feature('sms') },
    };
  }
}
