import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Env } from '@ayna/config/env';
import { ENV } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';
import { tallyConsensus } from './consensus';
import type { CreateCommentInput, CreatePostInput } from './circle.dto';
import { type ModerationVerdict, keywordModeration } from './circle.moderation';

const REPORT_THRESHOLD = 3; // eşik aşan içerik otomatik gizlenir (§5.5)

@Injectable()
export class CircleService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  // §5.5 — OpenAI /moderations (ücretsiz) birincil; anahtar yoksa keyword yedeği
  /** Ayar anahtarı — panelden açılıp kapanıyor. */
  private static readonly HEPSI_ONAYA = 'policy.circle_premoderate';

  /**
   * Her gönderi onaya düşsün mü?
   *
   * Ayar yoksa ya da okunamıyorsa FALSE: topluluk akmaya devam etsin.
   * Ters varsayım, tek bir veritabanı hıçkırığında tüm gönderileri
   * sessizce kuyruğa yığardı.
   */
  private async hepsiOnaya(): Promise<boolean> {
    try {
      const s = await this.prisma.setting.findUnique({
        where: { key: CircleService.HEPSI_ONAYA },
      });
      // `Setting` yalnız int/str taşıyor; 1 = açık.
      return (s?.intValue ?? 0) === 1;
    } catch {
      return false;
    }
  }

  private async moderate(text: string): Promise<ModerationVerdict> {
    const key = this.env.OPENAI_API_KEY;
    if (!key) return keywordModeration(text);
    try {
      const res = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'omni-moderation-latest', input: text }),
      });
      if (!res.ok) return keywordModeration(text);
      const data = (await res.json()) as {
        results?: { flagged: boolean; categories: Record<string, boolean> }[];
      };
      const r = data.results?.[0];
      if (r?.flagged) {
        const cats = Object.entries(r.categories)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(', ');
        return { flagged: true, reason: `OpenAI moderasyon: ${cats}` };
      }
      // OpenAI temiz dese de keyword yedeğini de uygula (spam vb.)
      return keywordModeration(text);
    } catch {
      return keywordModeration(text);
    }
  }

  private async authorLabel(userId: string | undefined, anonymous: boolean): Promise<string> {
    if (anonymous || !userId) return 'AYNA Üyesi';
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const first = u?.name?.trim().split(/\s+/)[0];
    return first || 'AYNA Üyesi';
  }

  // §5.5 — uzman/salon W2W'de gönderi PAYLAŞAMAZ (okur + yorum yapar)
  private assertCanPost(role: string | undefined) {
    if (role === 'professional' || role === 'salon') {
      throw new ForbiddenException({
        code: 'CIRCLE_POST_FORBIDDEN',
        message: 'Uzman/salon hesapları W2W akışında paylaşım yapamaz',
      });
    }
  }

  async listPosts(userId?: string) {
    const posts = await this.prisma.circlePost.findMany({
      where: { status: 'published' },
      orderBy: [{ helpful: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    const counts = await this.prisma.circleComment.groupBy({
      by: ['postId'],
      _count: { _all: true },
      where: { postId: { in: posts.map((p) => p.id) } },
    });
    const byPost = new Map(counts.map((c) => [c.postId, c._count._all]));
    // §14 — KENDİ kaydettiklerin. Yalnız okuyucunun kendi satırları çekilir;
    // "bu gönderiyi kaç kişi kaydetti" hiçbir yanıtta YOK ve olmayacak: bir
    // uzmanın "beni kim/kaç kişi kaydetti" diye bakabilmesi, kadınların hangi
    // hizmeti düşündüğünü ifşa ederdi (CLAUDE.md privacy-by-design).
    const savedIds = userId
      ? new Set(
          (
            await this.prisma.circleSave.findMany({
              where: { userId, postId: { in: posts.map((p) => p.id) } },
              select: { postId: true },
            })
          ).map((r) => r.postId),
        )
      : new Set<string>();
    return posts.map((p) => ({
      id: p.id,
      category: p.category,
      text: p.text,
      anonymous: p.anonymous,
      authorLabel: p.authorLabel,
      authorUserId: p.anonymous ? null : p.userId, // §5.5 takip hedefi (anonimde ASLA açılmaz)
      helpful: p.helpful,
      comments: byPost.get(p.id) ?? 0,
      savedByMe: savedIds.has(p.id),
      createdAt: p.createdAt,
    }));
  }

  /**
   * §14 — gönderiyi kaydet / kaydı kaldır. İdempotent: aynı çağrı tekrar
   * gelirse durum değişmez, hata da dönmez.
   *
   * `save` verilmezse mevcut durumun TERSİNE çevrilir (dokunmatik toggle).
   * Ama istemci durumu biliyorsa açıkça göndersin: iki cihazdan aynı anda
   * dokunulduğunda toggle iki kez dönüp başladığı yere gelirdi.
   */
  async setSaved(userId: string, postId: string, save?: boolean) {
    const post = await this.prisma.circlePost.findUnique({
      where: { id: postId },
      select: { id: true, status: true },
    });
    if (!post || post.status !== 'published') {
      throw new NotFoundException({ code: 'POST_NOT_FOUND', message: 'Gönderi bulunamadı' });
    }
    const mevcut = await this.prisma.circleSave.findUnique({
      where: { userId_postId: { userId, postId } },
      select: { id: true },
    });
    const hedef = save ?? mevcut == null;
    if (hedef && !mevcut) {
      // Tekillik DB'de: "önce oku sonra yaz" iki eşzamanlı istekte çift satır
      // yazardı. P2002 = zaten kayıtlı, istenen sonuç zaten sağlanmış.
      await this.prisma.circleSave.create({ data: { userId, postId } }).catch((e: unknown) => {
        if ((e as { code?: string }).code !== 'P2002') throw e;
      });
    } else if (!hedef && mevcut) {
      await this.prisma.circleSave.delete({ where: { id: mevcut.id } }).catch(() => undefined);
    }
    return { postId, saved: hedef };
  }

  /** §14 — kaydettiklerim. Silinmiş/gizlenmiş gönderi listede ÇIKMAZ. */
  async listSaved(userId: string) {
    const rows = await this.prisma.circleSave.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { postId: true },
    });
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.postId);
    const posts = await this.prisma.circlePost.findMany({
      where: { id: { in: ids }, status: 'published' },
    });
    const counts = await this.prisma.circleComment.groupBy({
      by: ['postId'],
      _count: { _all: true },
      where: { postId: { in: posts.map((p) => p.id) } },
    });
    const byPost = new Map(counts.map((c) => [c.postId, c._count._all]));
    const byId = new Map(posts.map((p) => [p.id, p]));
    // Kaydetme SIRASI korunur: en son kaydettiğin üstte.
    return ids
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => p != null)
      .map((p) => ({
        id: p.id,
        category: p.category,
        text: p.text,
        anonymous: p.anonymous,
        authorLabel: p.authorLabel,
        authorUserId: p.anonymous ? null : p.userId,
        helpful: p.helpful,
        comments: byPost.get(p.id) ?? 0,
        savedByMe: true,
        createdAt: p.createdAt,
      }));
  }

  async createPost(userId: string | undefined, role: string | undefined, input: CreatePostInput) {
    this.assertCanPost(role);
    const verdict = await this.moderate(input.text);
    const anonymous = input.anonymous ?? false;
    const post = await this.prisma.circlePost.create({
      data: {
        userId: userId ?? null,
        category: input.category,
        text: input.text,
        anonymous,
        authorLabel: await this.authorLabel(userId, anonymous),
        /*
         * ── ÖN MODERASYON ANAHTARI ────────────────────────────────────
         *
         * Kurucu: "w2w'de yorum yaptım ama yorum onayı admine düşmedi."
         *
         * Sistem hatalı değildi, BİLEREK böyleydi: yalnız şüpheli görülen
         * gönderi kuyruğa düşüyor, temiz olan doğrudan yayınlanıyordu.
         * Kurucunun gönderisi temiz bulunmuştu.
         *
         * Ama bu bir ÜRÜN KARARI ve tek doğrusu yok:
         *   · Hepsini onaya almak → hiçbir şey gözden kaçmaz, ama her
         *     gönderi admini bekler; topluluk ölür.
         *   · Yalnız şüphelileri → topluluk akar, denetim örneklem.
         *
         * Karar artık panelden verilebiliyor. VARSAYILAN DEĞİŞMEDİ:
         * anahtar kapalıyken davranış bugünküyle birebir aynı — sessiz bir
         * davranış değişikliği kimseye sürpriz olmasın.
         */
        status: verdict.flagged || (await this.hepsiOnaya()) ? 'pending' : 'published',
        moderationReason: verdict.reason,
      },
    });
    return { id: post.id, status: post.status, moderationReason: post.moderationReason };
  }

  // §5.5/§8 — "faydalı" oyu: on=true +1, on=false -1 (taban 0). Puan limiti §8.1 ayrı motorda.
  // §5.5 — takip: on=true takip et (idempotent), on=false bırak
  async setFollow(followerId: string, targetId: string, on: boolean) {
    if (followerId === targetId) return { following: false };
    if (on) {
      await this.prisma.circleFollow.upsert({
        where: { followerId_targetId: { followerId, targetId } },
        create: { followerId, targetId },
        update: {},
      });
    } else {
      await this.prisma.circleFollow.deleteMany({ where: { followerId, targetId } });
    }
    return { following: on };
  }

  async myFollows(userId: string) {
    const [followingRows, followerRows] = await Promise.all([
      this.prisma.circleFollow.findMany({ where: { followerId: userId } }),
      this.prisma.circleFollow.findMany({ where: { targetId: userId } }),
    ]);
    const ids = [
      ...new Set([
        ...followingRows.map((r) => r.targetId),
        ...followerRows.map((r) => r.followerId),
      ]),
    ];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const nameOf = new Map(users.map((u) => [u.id, u.name]));
    return {
      following: followingRows.map((r) => ({
        userId: r.targetId,
        name: nameOf.get(r.targetId) ?? 'AYNA Üyesi',
      })),
      followers: followerRows.map((r) => ({
        userId: r.followerId,
        name: nameOf.get(r.followerId) ?? 'AYNA Üyesi',
      })),
    };
  }

  /**
   * "FAYDALI" İŞARETİ — KİŞİ BAŞINA BİR KEZ.
   *
   * ── SORUN ────────────────────────────────────────────────────────────
   *
   * Uç kullanıcı kimliğini HİÇ almıyordu ve servis sayacı körlemesine
   * artırıyordu. Giriş yapmış herkes:
   *   · aynı gönderiyi sınırsız kez işaretleyip sayacı şişirebiliyor,
   *   · `on: false` göndererek BAŞKASININ gönderisinin işaretlerini sıfıra
   *     indirebiliyordu (sayaç 0'da kırpılıyor, yani hepsi silinebiliyordu).
   *
   * Topluluğun güven sinyali tek satırlık bir döngüyle uydurulabiliyordu.
   *
   * ── KURAL ────────────────────────────────────────────────────────────
   *
   * İşaret artık kişiye bağlı bir SATIR; sayaç o satırlardan türetiliyor.
   * Kimse başkasının işaretini kaldıramıyor, kimse kendi işaretini iki kez
   * sayduramıyor.
   */
  async setHelpful(userId: string, postId: string, on: boolean) {
    const post = await this.prisma.circlePost.findUnique({
      where: { id: postId },
      select: { id: true, status: true, helpfulBase: true },
    });
    if (!post || post.status !== 'published') {
      throw new NotFoundException({ code: 'POST_NOT_FOUND', message: 'Gönderi bulunamadı' });
    }
    if (on) {
      // Tekillik DB'de: iki eşzamanlı istek çift satır yazamaz.
      // P2002 = zaten işaretli, istenen sonuç zaten sağlanmış.
      await this.prisma.circleHelpful.create({ data: { userId, postId } }).catch((e: unknown) => {
        if ((e as { code?: string }).code !== 'P2002') throw e;
      });
    } else {
      // YALNIZ KENDİ işaretini kaldırıyor.
      await this.prisma.circleHelpful
        .delete({ where: { userId_postId: { userId, postId } } })
        .catch(() => undefined);
    }
    /*
     * Sayaç DEFTERDEN türetiliyor, artırılmıyor.
     *
     * Eski kayıtların sayacı korunuyor: geçmişte kimin işaretlediği
     * bilinmiyor ve uydurulmuş bir liste üretmek yanlış olurdu. Bu yüzden
     * yeni işaretler eski sayacın ÜSTÜNE ekleniyor (`temelSayac`).
     */
    const kisiler = await this.prisma.circleHelpful.count({ where: { postId } });
    const row = await this.prisma.circlePost.update({
      where: { id: postId },
      data: { helpful: post.helpfulBase + kisiler },
      select: { helpful: true },
    });
    return { helpful: row.helpful };
  }

  /**
   * Bir gönderinin yorumları.
   *
   * HATA DÜZELTMESİ: bu uç yoktu. listPosts yalnız yorum SAYISINI dönüyordu,
   * metinleri değil — yani A kullanıcısı yorum yazıyor, B aynı gönderiyi açıyor,
   * sayacın arttığını görüyor ama yorumu okuyamıyordu. Herkes yalnız kendi
   * yorumunu görüyordu; topluluk özelliğinin tamamı bunun üzerine kurulu.
   *
   * GİZLİLİK: anonim yorumda userId ASLA dışarı verilmez (gönderilerdeki
   * authorUserId kuralıyla aynı). Etiket kimlik değildir.
   */
  async listComments(postId: string) {
    const post = await this.prisma.circlePost.findUnique({ where: { id: postId } });
    if (!post || post.status !== 'published') {
      throw new NotFoundException({ code: 'POST_NOT_FOUND', message: 'Gönderi bulunamadı' });
    }
    const rows = await this.prisma.circleComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    // ÖNERİLEN UZMANIN ADI da gönderilir. Yalnız `proId` dönüyordu; istemci
    // kimliği isme çeviremediği için öneri ekranda GÖRÜNMÜYORDU — kullanıcı
    // uzman seçip yorumu yolluyor, karşı tarafa hiçbir uzman bilgisi
    // ulaşmıyordu. Kimlikten ada çevirmeyi istemciye bırakmak, uzman o anki
    // şehir listesinde yoksa yine boş bırakırdı.
    const proIds = [...new Set(rows.map((c) => c.proId).filter((x): x is string => !!x))];
    const pros = proIds.length
      ? await this.prisma.professional.findMany({
          where: { id: { in: proIds } },
          select: { id: true, name: true },
        })
      : [];
    const adByPro = new Map(pros.map((p) => [p.id, p.name]));
    return rows.map((c) => ({
      id: c.id,
      authorLabel: c.authorLabel,
      text: c.text,
      proId: c.proId,
      proName: c.proId ? (adByPro.get(c.proId) ?? null) : null,
      proVerified: c.proVerified,
      createdAt: c.createdAt,
    }));
  }

  async addComment(
    userId: string | undefined,
    role: string | undefined,
    postId: string,
    input: CreateCommentInput,
  ) {
    const post = await this.prisma.circlePost.findUnique({ where: { id: postId } });
    if (!post || post.status !== 'published') {
      throw new NotFoundException({ code: 'POST_NOT_FOUND', message: 'Gönderi bulunamadı' });
    }
    const verdict = await this.moderate(input.text);
    if (verdict.flagged) {
      throw new ForbiddenException({ code: 'COMMENT_BLOCKED', message: verdict.reason });
    }
    const anonymous = input.anonymous ?? false;
    // §15 — "duydum ki iyiymiş" sayılmaz: öneren kişinin o uzmanda TAMAMLANMIŞ
    // randevusu var mı, yazma anında doğrulanır ve sonuç DONDURULUR. Sonradan
    // randevu iptal olsa bile o an gerçekti; geriye dönük değiştirmiyoruz.
    const proVerified =
      input.proId && userId ? await this.hasCompletedWith(userId, input.proId) : false;
    const c = await this.prisma.circleComment.create({
      data: {
        postId,
        userId: userId ?? null,
        authorLabel: await this.authorLabel(userId, anonymous),
        text: input.text,
        ...(input.proId ? { proId: input.proId } : {}),
        proVerified,
      },
    });
    return { id: c.id, proVerified };
  }

  /** Kullanıcının bu uzmanda tamamlanmış randevusu var mı? */
  private async hasCompletedWith(userId: string, proId: string): Promise<boolean> {
    const row = await this.prisma.booking.findFirst({
      where: { userId, proId, status: 'tamamlandi' },
      select: { id: true },
    });
    return row != null;
  }

  /**
   * §14 — FİKİR BİRLİĞİ: bir sorunun cevaplarında kimin kaç kez önerildiği.
   *
   * Yalnız DOĞRULANMIŞ öneriler sayılır (proVerified). Yedi yorumu tek tek
   * okumak yerine "Zarina — 7 kişiden 4'ü" tek kartta görünsün diye.
   * Aynı kullanıcının aynı uzmanı iki kez önermesi BİR sayılır.
   */
  async consensus(postId: string) {
    const rows = await this.prisma.circleComment.findMany({
      where: { postId, proId: { not: null }, proVerified: true },
      select: { proId: true, userId: true, proVerified: true },
    });
    return tallyConsensus(rows);
  }

  // §5.5 — şikâyet; eşik aşınca otomatik gizle + admin kuyruğu
  async report(userId: string | undefined, postId: string, reason?: string) {
    const post = await this.prisma.circlePost.findUnique({ where: { id: postId } });
    if (!post)
      throw new NotFoundException({ code: 'POST_NOT_FOUND', message: 'Gönderi bulunamadı' });
    await this.prisma.circleReport.create({
      data: { postId, userId: userId ?? null, reason: reason ?? '' },
    });
    const reports = post.reports + 1;
    const hide = reports >= REPORT_THRESHOLD;
    await this.prisma.circlePost.update({
      where: { id: postId },
      data: {
        reports,
        ...(hide && post.status === 'published'
          ? { status: 'hidden', moderationReason: `${reports} şikâyet — otomatik gizlendi` }
          : {}),
      },
    });
    return { reports, hidden: hide };
  }

  // ── Admin (§12.5 Moderasyon Merkezi) ────────────────────────────────────
  async queue() {
    const posts = await this.prisma.circlePost.findMany({
      where: { status: { in: ['pending', 'hidden'] } },
      orderBy: { createdAt: 'desc' },
    });
    return posts.map((p) => ({
      id: p.id,
      category: p.category,
      text: p.text,
      authorLabel: p.authorLabel,
      status: p.status,
      reports: p.reports,
      moderationReason: p.moderationReason,
      createdAt: p.createdAt,
    }));
  }

  async resolve(postId: string, decision: 'approve' | 'hide', actorId?: string) {
    const post = await this.prisma.circlePost.findUnique({ where: { id: postId } });
    if (!post)
      throw new NotFoundException({ code: 'POST_NOT_FOUND', message: 'Gönderi bulunamadı' });
    const updated = await this.prisma.circlePost.update({
      where: { id: postId },
      data: {
        status: decision === 'approve' ? 'published' : 'hidden',
        ...(decision === 'approve' ? { reports: 0, moderationReason: '' } : {}),
      },
    });
    await this.prisma.auditLog.create({
      data: {
        action: `circle.${decision}`,
        resourceType: 'circle_post',
        resourceId: postId,
        actorId: actorId ?? null,
        actorRole: 'admin',
      },
    });
    return { id: updated.id, status: updated.status };
  }
}
