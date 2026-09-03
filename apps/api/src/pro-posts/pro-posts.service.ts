import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import type { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { StorageService } from '../storage/storage.service';

/**
 * UZMAN PAYLAŞIMLARI — öncesi/sonrası, yalnız kendi müşterilerine.
 *
 * Kurucu: "uzman öncesi/sonrası fotoğrafını müşterilerimle paylaş butonuna
 * basarak paylaştığında daha önce müşterisi olan müşterilere gösterilsin,
 * bildirim giderek müşteri haberdar edilsin. bu fotoğraflar 7 gün kalacak
 * ve sonrasında sistemden silinecek."
 */

/**
 * Randevunun "tamamlanmış" sayıldığı durumlar — sadakat kurallarıyla AYNI.
 *
 * Üçü de hizmetin VERİLDİĞİ anlamına geliyor: `tamamlandi` uzman
 * işaretledi, `degerlendirme` müşteri onayladı ve puanlama açıldı,
 * `kapandi` süreç bitti. Yalnız `tamamlandi` alsaydık, değerlendirmesini
 * yapmış eski müşteriler CRM'den düşerdi.
 */
const TAMAMLANMIS: BookingStatus[] = ['tamamlandi', 'degerlendirme', 'kapandi'];

/** Paylaşımın ömrü. */
export const PAYLASIM_GUN = 7;

@Injectable()
export class ProPostsService {
  private readonly log = new Logger(ProPostsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly storage: StorageService,
  ) {}

  /** Uzmanın `Professional` kimliği (uzman ya da salon sahibi). */
  private async proIdFor(userId: string): Promise<string | null> {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    if (sp?.proId) return sp.proId;
    const biz = await this.prisma.business.findFirst({ where: { ownerUserId: userId } });
    return biz?.professionalId ?? null;
  }

  /**
   * UZMANIN MÜŞTERİLERİ — CRM.
   *
   * Ayrı bir liste tutulmuyor: kaynak tamamlanmış randevular. Randevu
   * iptal olduğunda ya da uzman değiştiğinde liste kendiliğinden doğru
   * kalıyor; ikinci bir tablo zamanla gerçekten ayrışırdı.
   */
  async musterilerim(userId: string) {
    const proId = await this.proIdFor(userId);
    if (!proId) return { customers: [] };
    const rows = await this.prisma.booking.findMany({
      where: { proId, status: { in: TAMAMLANMIS }, userId: { not: null } },
      select: { userId: true, startAt: true, service: true },
      orderBy: { startAt: 'desc' },
    });
    // Kişi başına TEK satır: en son randevusu.
    const enSon = new Map<string, { startAt: Date | null; service: string }>();
    for (const b of rows) {
      if (!b.userId || enSon.has(b.userId)) continue;
      enSon.set(b.userId, { startAt: b.startAt, service: b.service });
    }
    const ids = [...enSon.keys()];
    if (ids.length === 0) return { customers: [] };
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    return {
      customers: users.map((u) => ({
        id: u.id,
        name: u.name,
        lastServiceAt: enSon.get(u.id)?.startAt?.getTime() ?? null,
        lastService: enSon.get(u.id)?.service ?? '',
      })),
    };
  }

  /**
   * PAYLAŞ.
   *
   * Alıcı listesi BURADA donduruluyor (bkz. `ProPostRecipient`).
   * İzin beyanı olmadan gönderi kabul edilmiyor: öncesi/sonrası fotoğrafı
   * kişisel veridir ve uzmanın müşterisinden izin alması gerekir.
   */
  async paylas(
    userId: string,
    input: {
      beforeDataUrl: string;
      afterDataUrl: string;
      note?: string | undefined;
      consent: boolean;
    },
  ) {
    if (!input.consent) {
      throw new BadRequestException({
        code: 'CONSENT_REQUIRED',
        message: 'Müşteriden izin alındığı beyan edilmeden paylaşım yapılamaz',
      });
    }
    const proId = await this.proIdFor(userId);
    if (!proId) {
      throw new ForbiddenException({ code: 'NOT_A_PRO', message: 'Uzman hesabı bulunamadı' });
    }
    const { customers } = await this.musterilerim(userId);
    if (customers.length === 0) {
      throw new BadRequestException({
        code: 'NO_CUSTOMERS',
        message: 'Henüz tamamlanmış randevusu olan müşteriniz yok',
      });
    }

    const [beforeUrl, afterUrl] = await Promise.all([
      this.storage.put(input.beforeDataUrl, 'pro-posts'),
      this.storage.put(input.afterDataUrl, 'pro-posts'),
    ]);

    const post = await this.prisma.proPost.create({
      data: {
        proId,
        authorUserId: userId,
        beforeUrl: beforeUrl ?? input.beforeDataUrl,
        afterUrl: afterUrl ?? input.afterDataUrl,
        note: (input.note ?? '').slice(0, 300),
        consent: true,
        expiresAt: new Date(Date.now() + PAYLASIM_GUN * 24 * 60 * 60 * 1000),
        recipients: { create: customers.map((c) => ({ userId: c.id })) },
      },
    });

    // Bildirim ikincil: gönderi kaydedildi, teslim edilemese de duruyor.
    const pro = await this.prisma.professional.findUnique({
      where: { id: proId },
      select: { name: true },
    });
    void Promise.all(
      customers.map((c) =>
        this.push
          .sendTemplate(c.id, 'propost.new', { pro: pro?.name ?? '' }, { route: '/paylasimlar' })
          .catch(() => undefined),
      ),
    ).catch(() => undefined);

    return this.map(post, customers.length);
  }

  /** Müşterinin GÖRDÜĞÜ paylaşımlar — yalnız kendisine gönderilmiş ve süresi geçmemiş. */
  async gelenler(userId: string) {
    const rows = await this.prisma.proPost.findMany({
      where: {
        status: 'published',
        expiresAt: { gt: new Date() },
        recipients: { some: { userId } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const proIds = [...new Set(rows.map((r) => r.proId))];
    const pros = await this.prisma.professional.findMany({
      where: { id: { in: proIds } },
      select: { id: true, name: true, imageUrl: true },
    });
    const proById = new Map(pros.map((p) => [p.id, p]));
    return {
      posts: rows.map((r) => ({
        ...this.map(r),
        proName: proById.get(r.proId)?.name ?? '',
        proImage: proById.get(r.proId)?.imageUrl ?? '',
      })),
    };
  }

  /** Uzmanın KENDİ paylaşımları — süresi geçmemişler. */
  async benimkiler(userId: string) {
    const proId = await this.proIdFor(userId);
    if (!proId) return { posts: [] };
    const rows = await this.prisma.proPost.findMany({
      where: { proId, status: 'published', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { recipients: true } } },
    });
    return { posts: rows.map((r) => this.map(r, r._count.recipients)) };
  }

  /** Uzman kendi paylaşımını erken kaldırabilir. */
  async kaldir(userId: string, postId: string) {
    const post = await this.prisma.proPost.findUnique({ where: { id: postId } });
    if (!post || post.authorUserId !== userId) {
      throw new ForbiddenException({ code: 'NOT_OWNER', message: 'Bu paylaşım sizin değil' });
    }
    await this.sil(post);
    return { ok: true as const };
  }

  /**
   * ŞİKÂYET — müşteri kendi fotoğrafını görürse.
   *
   * Şikâyet gönderiyi ANINDA gizliyor. Yanlış bir şikâyet uzmanın
   * paylaşımını erken kapatır; ama kendi fotoğrafını izinsiz gören bir
   * müşteriyi bekletmek çok daha ağır bir zarar.
   */
  async sikayet(userId: string, postId: string) {
    const alici = await this.prisma.proPostRecipient.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!alici) {
      throw new ForbiddenException({ code: 'NOT_RECIPIENT', message: 'Bu paylaşım size gelmedi' });
    }
    await this.prisma.proPost.update({
      where: { id: postId },
      data: { reports: { increment: 1 }, status: 'hidden' },
    });
    return { ok: true as const };
  }

  /** Okundu — müşteri gördü. */
  async okundu(userId: string, postId: string) {
    await this.prisma.proPostRecipient.updateMany({
      where: { postId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true as const };
  }

  /**
   * SÜRESİ GEÇENLERİ SİL — fotoğraflar dahil.
   *
   * Gösterim kapısı (`expiresAt > now`) zaten süresi geçeni döndürmüyor;
   * bu iş kaydı VE fotoğrafı gerçekten siliyor. "Sadece gizle" demek,
   * kişisel veriyi sunucuda süresiz saklamak olurdu.
   *
   * AYNI GÖRSELİ PAYLAŞAN BAŞKA BİR GÖNDERİ VARSA fotoğraf silinmiyor:
   * depo içerik hash'iyle tekilleştiriyor, aynı anahtarı silmek öteki
   * gönderinin görselini de götürürdü.
   */
  async sureBitenleriTemizle(): Promise<number> {
    const bitenler = await this.prisma.proPost.findMany({
      where: { expiresAt: { lt: new Date() } },
      select: { id: true, beforeUrl: true, afterUrl: true },
      take: 200,
    });
    if (bitenler.length === 0) return 0;
    const silinecekIds = bitenler.map((p) => p.id);

    for (const url of new Set(bitenler.flatMap((p) => [p.beforeUrl, p.afterUrl]))) {
      const baskaKullanan = await this.prisma.proPost.count({
        where: {
          id: { notIn: silinecekIds },
          OR: [{ beforeUrl: url }, { afterUrl: url }],
        },
      });
      if (baskaKullanan === 0) await this.storage.remove(url);
    }

    // Alıcı satırları ilişkiyle birlikte düşüyor (onDelete: Cascade).
    await this.prisma.proPost.deleteMany({ where: { id: { in: silinecekIds } } });
    this.log.log(`süresi biten paylaşım silindi: ${silinecekIds.length}`);
    return silinecekIds.length;
  }

  private async sil(post: { id: string; beforeUrl: string; afterUrl: string }) {
    for (const url of new Set([post.beforeUrl, post.afterUrl])) {
      const baskaKullanan = await this.prisma.proPost.count({
        where: { id: { not: post.id }, OR: [{ beforeUrl: url }, { afterUrl: url }] },
      });
      if (baskaKullanan === 0) await this.storage.remove(url);
    }
    await this.prisma.proPost.delete({ where: { id: post.id } });
  }

  private map(
    r: {
      id: string;
      beforeUrl: string;
      afterUrl: string;
      note: string;
      createdAt: Date;
      expiresAt: Date;
    },
    aliciSayisi?: number,
  ) {
    return {
      id: r.id,
      beforeUrl: r.beforeUrl,
      afterUrl: r.afterUrl,
      note: r.note,
      createdAt: r.createdAt.getTime(),
      expiresAt: r.expiresAt.getTime(),
      ...(aliciSayisi === undefined ? {} : { recipientCount: aliciSayisi }),
    };
  }
}
