import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import type { BroadcastInput, RequestInput } from './always.dto';

/**
 * ALWAYS — sadık müşteri bağı.
 *
 * Özellik TAMAMEN kurguydu: bağ yaratan eylem hiçbir yerden çağrılmıyordu,
 * liste boş başlıyordu, giriş düğmesi hiç çizilmiyordu. Ekran her kullanıcıda
 * kalıcı olarak boştu — Platinum'un satılan ana özelliği çalışmıyordu.
 *
 * Akış (metinlerden kurtarıldı, uydurulmadı):
 *   müşteri "Always ol" → uzman "İstekler"de kabul → "Bağlarım" → toplu bildirim
 */
@Injectable()
export class AlwaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  /** Katalog kaydından sahibinin kullanıcı kimliğini bulur (uzman ya da salon). */
  private async sahip(proId: string): Promise<string | null> {
    const sp = await this.prisma.specialist.findFirst({
      where: { proId },
      select: { userId: true },
    });
    if (sp) return sp.userId;
    const biz = await this.prisma.business.findFirst({
      where: { professionalId: proId },
      select: { ownerUserId: true },
    });
    return biz?.ownerUserId ?? null;
  }

  private async gorunum(bond: {
    id: string;
    customerUserId: string;
    proUserId: string;
    proId: string;
    initiator: string;
    status: string;
    lastServiceId: string | null;
    createdAt: Date;
  }) {
    const [musteri, pro] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: bond.customerUserId },
        select: { name: true, avatarUrl: true },
      }),
      this.prisma.professional.findUnique({
        where: { id: bond.proId },
        select: { name: true, imageUrl: true },
      }),
    ]);
    return {
      id: bond.id,
      providerName: pro?.name ?? '',
      ...(pro?.imageUrl ? { providerImage: pro.imageUrl } : {}),
      customerName: musteri?.name ?? '',
      ...(musteri?.avatarUrl ? { customerImage: musteri.avatarUrl } : {}),
      initiator: bond.initiator as 'provider' | 'customer',
      status: bond.status as 'pending' | 'accepted',
      ...(bond.lastServiceId ? { lastServiceId: bond.lastServiceId } : {}),
      createdMs: bond.createdAt.getTime(),
      proId: bond.proId,
    };
  }

  /** Kullanıcının bağları — hem müşteri hem uzman tarafı tek listede. */
  async mine(userId: string) {
    const rows = await this.prisma.alwaysBond.findMany({
      where: { OR: [{ customerUserId: userId }, { proUserId: userId }] },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return Promise.all(rows.map((b) => this.gorunum(b)));
  }

  async request(userId: string, input: RequestInput) {
    const proUserId = await this.sahip(input.proId);
    if (!proUserId) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Uzman yok' });
    // Kendine bağ kurulamaz — uzmanın kendi profilinden "Always ol" demesi
    // anlamsız ve toplu bildirimde kendine mesaj atmasına yol açardı.
    if (proUserId === userId) {
      throw new BadRequestException({ code: 'SELF_BOND', message: 'Kendine bağ kurulamaz' });
    }
    // Tekrar istek YENİ SATIR AÇMAZ: `@@unique` zaten engelliyor, burada da
    // mevcut bağ aynen döndürülüyor ki istemci hata görmesin.
    const varOlan = await this.prisma.alwaysBond.findUnique({
      where: { customerUserId_proId: { customerUserId: userId, proId: input.proId } },
    });
    if (varOlan) return this.gorunum(varOlan);

    const bond = await this.prisma.alwaysBond.create({
      data: {
        customerUserId: userId,
        proUserId,
        proId: input.proId,
        initiator: 'customer',
        ...(input.lastServiceId ? { lastServiceId: input.lastServiceId } : {}),
      },
    });
    // KARŞI TARAF HABERDAR OLMALI. Eski kurguda bildirim YEREL üretiliyordu,
    // yani uzmanın cihazına hiç ulaşmıyordu.
    const musteri = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    await this.push.sendToUser(proUserId, {
      title: 'Always isteği',
      body: `${musteri?.name ?? 'Bir müşteri'} sana Always bağı kurmak istiyor.`,
      data: { route: '/always' },
    });
    return this.gorunum(bond);
  }

  /** Kabul YALNIZ karşı tarafa ait: isteği başlatan kendi isteğini onaylayamaz. */
  async accept(userId: string, id: string) {
    const bond = await this.prisma.alwaysBond.findUnique({ where: { id } });
    if (!bond) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Bağ yok' });
    const karsiTaraf = bond.initiator === 'customer' ? bond.proUserId : bond.customerUserId;
    if (karsiTaraf !== userId) {
      throw new ForbiddenException({ code: 'NOT_YOURS', message: 'Bu isteği onaylayamazsın' });
    }
    const guncel = await this.prisma.alwaysBond.update({
      where: { id },
      data: { status: 'accepted', acceptedAt: new Date() },
    });
    await this.push.sendToUser(
      bond.initiator === 'customer' ? bond.customerUserId : bond.proUserId,
      {
        title: 'Always bağın kuruldu',
        body: 'İsteğin kabul edildi 💫',
        data: { route: '/always' },
      },
    );
    return this.gorunum(guncel);
  }

  /**
   * Ret ve kaldırma AYNI işlem: satır silinir.
   *
   * "Reddedildi" durumu saklamak, karşı tarafın göremediği sessiz bir kara
   * liste tutmak olurdu; ayrıca kullanıcı fikrini değiştirip tekrar
   * isteyemezdi (`@@unique` engellerdi).
   *
   * Bağın İKİ tarafı da kaldırabilir — biri istemiyorsa bağ bitmiştir.
   */
  async remove(userId: string, id: string) {
    const r = await this.prisma.alwaysBond.deleteMany({
      where: { id, OR: [{ customerUserId: userId }, { proUserId: userId }] },
    });
    if (r.count === 0) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Bağ yok' });
    return { ok: true };
  }

  /**
   * Toplu bildirim — YALNIZ Platinum.
   *
   * Kapı eskiden yalnız İSTEMCİDE vardı (`if (!platinum)` ekranda). İstemci
   * kapısı kapı değildir: uç doğrudan çağrılabilir. Kademe burada okunuyor.
   */
  async broadcast(userId: string, input: BroadcastInput) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { membershipTier: true, membershipUntil: true, name: true },
    });
    const gecerli = !u?.membershipUntil || u.membershipUntil.getTime() > Date.now();
    if (!u || u.membershipTier !== 'platinum' || !gecerli) {
      throw new ForbiddenException({ code: 'PLATINUM_REQUIRED', message: 'Platinum gerekli' });
    }
    const bonds = await this.prisma.alwaysBond.findMany({
      where: { proUserId: userId, status: 'accepted' },
      select: { customerUserId: true },
    });
    // Teslimi tek tek denemek yerine hepsini kuyruğa yaz: `sendToUser` zaten
    // outbox'a yazıp teslimi arkaplana bırakıyor, başarısızları zamanlayıcı
    // devralıyor. Bir müşterinin cihazı kapalıysa diğerleri etkilenmez.
    for (const b of bonds) {
      await this.push.sendToUser(b.customerUserId, {
        title: input.title,
        body: input.body,
        data: { route: '/always', from: u.name },
      });
    }
    return { sent: bonds.length };
  }
}
