import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { StorageService } from '../storage/storage.service';

const GUN_MS = 24 * 60 * 60 * 1000;
/** Bir "ay" = 30 gün. Takvim ayı kullanılsaydı şubatta alan 28 gün alırdı. */
const AY_GUN = 30;
const FIYAT_ANAHTARI = 'rate.ad_monthly_kzt';
const VARSAYILAN_AYLIK = 200_000;

export type Yerlesim = 'firsatlar' | 'one_cikanlar';

@Injectable()
export class AdOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly storage: StorageService,
  ) {}

  private yok(): never {
    throw new NotFoundException({
      code: 'AD_ORDER_NOT_FOUND',
      message: 'Reklam siparişi bulunamadı',
    });
  }

  private async denetim(action: string, id: string, actorId?: string) {
    await this.prisma.auditLog.create({
      data: {
        action,
        resourceType: 'ad_order',
        resourceId: id,
        actorId: actorId ?? null,
        actorRole: 'admin',
      },
    });
  }

  /**
   * Vitrinin aylık ücreti. Panelden yönetiliyor (`rate.ad_monthly_kzt`);
   * koda gömülseydi fiyat değişikliği yeni sürüm gerektirirdi.
   */
  async aylikUcret(): Promise<number> {
    const s = await this.prisma.setting.findUnique({ where: { key: FIYAT_ANAHTARI } });
    const v = s?.intValue;
    return typeof v === 'number' && v > 0 ? v : VARSAYILAN_AYLIK;
  }

  async fiyat() {
    return { monthly: await this.aylikUcret(), currency: 'KZT' };
  }

  /**
   * Sipariş oluşturur. Tutar SİPARİŞ ANINDA dondurulur: uzman 200.000'i
   * görüp öderken admin fiyatı değiştirirse, ödenen ile beklenen tutar
   * ayrışırdı.
   */
  /**
   * UZMAN KİMLİĞİ SUNUCUDA TÜRETİLİR — istemciden gelene güvenilmez.
   *
   * İstemci `currentUser.id` (KULLANICI kimliği) gönderiyordu ve sunucu
   * doğrulamadan kaydediyordu. Sonuç: ana sayfadaki "Senin İçin
   * Seçtiklerimiz" kartına dokunulunca olmayan bir uzmana gidiliyor,
   * ekran sonsuza kadar "Yükleniyor"da kalıyordu.
   *
   * Aynı kural değerlendirmelerde zaten uygulanıyor ("subjectId istemciden
   * GÜVENİLMEZ — randevudan sunucuda türetilir"). Reklamda eksikti.
   *
   * Uzman kaydı iki yoldan bulunuyor: bağımsız uzman `Specialist.proId`,
   * salon `Business.professionalId`.
   */
  private async uzmanKimligi(userId: string): Promise<string> {
    const sp = await this.prisma.specialist.findFirst({
      where: { userId, proId: { not: null } },
      select: { proId: true },
    });
    if (sp?.proId) return sp.proId;
    const biz = await this.prisma.business.findFirst({
      where: { ownerUserId: userId, professionalId: { not: null } },
      select: { professionalId: true },
    });
    if (biz?.professionalId) return biz.professionalId;
    // Katalog kaydı olmayan hesap reklam veremez: verilse kart hiçbir yere
    // gitmeyen bir bağlantı olurdu.
    throw new BadRequestException('ad.no_professional');
  }

  async olustur(
    userId: string,
    input: {
      proName: string;
      placement: Yerlesim;
      title: string;
      subtitle?: string | undefined;
      description?: string | undefined;
      image: string;
      months?: number | undefined;
    },
  ) {
    const proId = await this.uzmanKimligi(userId);
    const months = Math.min(12, Math.max(1, Math.floor(input.months ?? 1)));
    const amount = (await this.aylikUcret()) * months;
    /*
     * GÖRSEL DEPOLAMAYA YÜKLENİYOR.
     *
     * Buradan geçmiyordu: telefondan seçilen fotoğraf ham base64 olarak
     * veritabanı satırına yazılıyordu. İki sonucu vardı — kayıt megabaytlarca
     * büyüyor ve reklam listesi HER KULLANICININ keşif ekranında o satırları
     * okuyor. Dekont, portföy, salon fotoğrafı: hepsi `storage.put`ten
     * geçiyordu; reklam atlanmıştı.
     *
     * Uzak URL'ye dokunulmuyor (fonksiyon zaten öyle davranıyor).
     */
    const image = (await this.storage.put(input.image, 'ads')) ?? input.image;
    return this.prisma.adOrder.create({
      data: {
        userId,
        proId,
        proName: input.proName,
        placement: input.placement,
        months,
        amount,
        title: input.title,
        subtitle: input.subtitle ?? '',
        description: input.description ?? '',
        image,
      },
    });
  }

  async benimkiler(userId: string) {
    return this.prisma.adOrder.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  /**
   * Dekont yükler. AYNI DEKONT İKİ SİPARİŞTE KULLANILAMAZ — depozitodaki
   * kuralın aynısı: tek ödemenin iki reklamı açmasını engeller.
   */
  async dekontYukle(userId: string, id: string, receiptUriRaw: string) {
    const kayit = await this.prisma.adOrder.findUnique({ where: { id } });
    if (!kayit || kayit.userId !== userId) this.yok();
    if (kayit.status !== 'bekliyor') {
      throw new BadRequestException({
        code: 'AD_ORDER_CLOSED',
        message: 'Bu sipariş kapandı; yeni bir reklam siparişi oluştur.',
      });
    }
    const hash = createHash('sha256').update(receiptUriRaw).digest('hex');
    const tekrar = await this.prisma.adOrder.findFirst({
      where: { id: { not: id }, receiptHash: hash },
      select: { id: true },
    });
    if (tekrar) {
      throw new ConflictException({
        code: 'RECEIPT_REUSED',
        message: 'Bu dekont daha önce başka bir reklam siparişinde kullanılmış',
      });
    }
    const receiptUri = (await this.storage.put(receiptUriRaw, 'receipts')) ?? receiptUriRaw;
    return this.prisma.adOrder.update({
      where: { id },
      data: { receiptUri, receiptAt: new Date(), receiptHash: hash },
    });
  }

  // ── ADMİN ────────────────────────────────────────────────────────────────
  async kuyruk() {
    return this.prisma.adOrder.findMany({
      where: { status: 'bekliyor' },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  /**
   * Ödeme doğrulandı → reklam YAYINA GİRER.
   *
   * Banner ancak burada üretiliyor. Sipariş anında üretilseydi ödenmemiş bir
   * reklam yayına düşerdi. Yayın penceresi de burada kapanıyor: satın alınan
   * süre bitince `catalog.ads()` reklamı kendiliğinden süzer.
   */
  async onayla(id: string, actorId?: string) {
    const o = await this.prisma.adOrder.findUnique({ where: { id } });
    if (!o) this.yok();
    /*
     * ZATEN İŞLENMİŞ SİPARİŞ YENİDEN ONAYLANAMAZ.
     *
     * Durum kapısı yoktu: yayındaki bir siparişi yeniden onaylamak İKİNCİ bir
     * banner üretiyor ve `bannerId`yi onun üstüne yazıyordu. İlk banner
     * `active: true` olarak yayında kalıyor ama artık hiçbir siparişe bağlı
     * değil — panelden sipariş üzerinden kapatılamayan, süresi kendi
     * penceresine göre işleyen ÖKSÜZ bir reklam. Tek ödemeye iki reklam.
     *
     * Yavaş bağlantıda çift tıklamak yetiyordu.
     */
    if (o!.status !== 'bekliyor') {
      throw new BadRequestException({
        code: 'AD_ORDER_CLOSED',
        message: 'Bu sipariş zaten işlendi',
      });
    }
    if (!o!.receiptUri) {
      throw new BadRequestException({
        code: 'RECEIPT_MISSING',
        message: 'Dekont yüklenmeden reklam yayına alınamaz',
      });
    }
    const bas = new Date();
    const bit = new Date(bas.getTime() + o!.months * AY_GUN * GUN_MS);
    const banner = await this.prisma.adBanner.create({
      data: {
        proId: o!.proId,
        title: o!.title,
        subtitle: o!.subtitle,
        description: o!.description,
        image: o!.image,
        placement: o!.placement,
        startsAt: bas,
        endsAt: bit,
        active: true,
      },
    });
    const guncel = await this.prisma.adOrder.update({
      where: { id },
      data: {
        status: 'yayinda',
        bannerId: banner.id,
        periodStart: bas,
        periodEnd: bit,
        reviewedAt: bas,
      },
    });
    await this.denetim('ad_order.onay', id, actorId);
    void this.push.sendTemplate(
      o!.userId,
      'ad.live',
      {
        // Yerleşim adı ŞABLONDA değil: iki vitrinin adı ürün adı gibi,
        // her dilde aynı yazılıyor (kullanıcı panelde de böyle görüyor).
        yer: o!.placement === 'firsatlar' ? 'Fırsatlar' : 'Öne çıkanlar',
        ay: String(o!.months),
      },
      { route: '/seller/ads' },
    );
    return guncel;
  }

  /** Ödeme doğrulanamadı. Reklam ÜRETİLMEZ; uzman yeniden deneyebilir. */
  async reddet(id: string, actorId?: string) {
    const o = await this.prisma.adOrder.findUnique({ where: { id } });
    if (!o) this.yok();
    /*
     * YAYINDAKİ SİPARİŞ "REDDEDİLDİ" YAPILAMAZ.
     *
     * Kapı yoktu: yayındaki bir siparişi reddetmek durumu `reddedildi`
     * yazıyor ama BANNER'A DOKUNMUYORDU. Uzman panelinde "ödemen
     * doğrulanamadı" görürken reklamı yayında akmaya devam ediyordu — ve
     * yönetici reklamın kapandığını sanıyordu.
     *
     * Yayındaki bir reklamı durdurmanın doğru yolu reklam panelinden
     * banner'ı pasife almak; o yol duruyor.
     */
    if (o!.status !== 'bekliyor') {
      throw new BadRequestException({
        code: 'AD_ORDER_CLOSED',
        message: 'Bu sipariş zaten işlendi; yayındaki reklamı reklam panelinden durdur',
      });
    }
    const guncel = await this.prisma.adOrder.update({
      where: { id },
      data: { status: 'reddedildi', reviewedAt: new Date() },
    });
    await this.denetim('ad_order.red', id, actorId);
    void this.push.sendTemplate(o!.userId, 'ad.payment_failed', undefined, {
      route: '/seller/ads',
    });
    return guncel;
  }
}
