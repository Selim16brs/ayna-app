import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PrefsPatch } from './prefs.dto';

/**
 * KULLANICI TERCİHLERİ.
 *
 * Bildirim tercihleri, talep bildirimi ayarı, anonim yorum tercihi ve
 * uzmanın otomatik geri çağırma anahtarı YALNIZ cihazda duruyordu. Uygulama
 * silinip kurulunca hepsi varsayılana dönüyordu: kullanıcı kapattığı
 * bildirimi geri açılmış buluyordu.
 */
@Injectable()
export class PrefsService {
  constructor(private readonly prisma: PrismaService) {}

  private coz(json: string): Record<string, unknown> {
    try {
      const v: unknown = JSON.parse(json);
      // Bozuk/eski veri ekranı çökertmemeli: nesne değilse boş kabul et.
      return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  async mine(userId: string) {
    const p = await this.prisma.userPrefs.findUnique({ where: { userId } });
    return {
      notif: this.coz(p?.notifJson ?? '{}'),
      demand: this.coz(p?.demandJson ?? '{}'),
      reviewAnonymous: p?.reviewAnonymous ?? false,
      // Satır yoksa varsayılan AÇIK — şemadaki varsayılanla aynı olmalı,
      // yoksa hiç kaydetmemiş uzmanda geri çağırma sessizce kapalı kalırdı.
      autoReengage: p?.autoReengage ?? true,
    };
  }

  /**
   * Yama — gönderilen alanlar yazılır.
   *
   * `notif`/`demand` BİRLEŞTİRİLİYOR, ezilmiyor: istemci tek bir anahtarı
   * değiştirdiğinde diğerlerini geri göndermek zorunda kalmamalı; aksi
   * hâlde eski sürüm bir istemci bilmediği tercihleri siler.
   */
  async save(userId: string, patch: PrefsPatch) {
    const mevcut = await this.prisma.userPrefs.findUnique({ where: { userId } });
    const notif = { ...this.coz(mevcut?.notifJson ?? '{}'), ...(patch.notif ?? {}) };
    const demand = { ...this.coz(mevcut?.demandJson ?? '{}'), ...(patch.demand ?? {}) };
    const veri = {
      notifJson: JSON.stringify(notif),
      demandJson: JSON.stringify(demand),
      ...(patch.reviewAnonymous !== undefined ? { reviewAnonymous: patch.reviewAnonymous } : {}),
      ...(patch.autoReengage !== undefined ? { autoReengage: patch.autoReengage } : {}),
    };
    await this.prisma.userPrefs.upsert({
      where: { userId },
      create: { userId, ...veri },
      update: veri,
    });
    return this.mine(userId);
  }
}
