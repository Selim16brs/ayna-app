import { Injectable, NotFoundException } from '@nestjs/common';
import { ACILIS_MESAJLARI, type SplashMesaji, uzakKatalogAyikla } from '@ayna/domain';
import { PrismaService } from '../prisma/prisma.service';
import type { SplashMesajGirdisi, SplashOlcumGirdisi } from './splash.dto';

type Satir = Awaited<ReturnType<PrismaService['splashMessage']['findMany']>>[number];

/**
 * AÇILIŞ MESAJLARI — sunucu tarafı (brief §7.1, §7.2, §7.3).
 *
 * ── TABLO BOŞKEN DE ÇALIŞIYOR ───────────────────────────────────────────
 *
 * Panelde hiç kayıt yoksa `katalog()` cihazla gelen YEREL PAKETİ dönüyor.
 * Boş liste dönseydik, uygulama "uzak katalog geldi ama boş" diye kendi
 * paketini de bırakabilir ya da her açılışta boşuna sorgu yapardı. Tablo
 * boş olmak normaldir: panelden bir şey değiştirilene kadar kimse satır
 * yazmaz.
 *
 * ── YAYINLANMADAN ÖNCE DOĞRULANIYOR ─────────────────────────────────────
 *
 * Ürettiğimiz katalog, cihazın uygulayacağı doğrulamadan (`uzakKatalogAyikla`)
 * BURADA da geçiriliyor. Geçmezse yayınlamıyoruz — bozuk katalog cihaza
 * gitse zaten reddedilirdi, ama o zaman hatayı kimse görmezdi. Sunucuda
 * kalması, panelde hatanın görünür olması demek.
 */
@Injectable()
export class SplashService {
  constructor(private readonly prisma: PrismaService) {}

  private satirdanMesaj(s: Satir): SplashMesaji {
    const m: SplashMesaji = {
      id: s.code,
      grup: s.grup as SplashMesaji['grup'],
      etiket: s.etiket as SplashMesaji['etiket'],
      metin: { tr: s.tr, kk: s.kk, ru: s.ru },
    };
    if (s.saatBas !== null && s.saatSon !== null) m.saat = [s.saatBas, s.saatSon];
    if (s.haftaSonu) m.haftaSonu = true;
    if (s.gunler.length > 0) m.gunler = s.gunler;
    if (
      s.pencereBasAy !== null &&
      s.pencereBasGun !== null &&
      s.pencereSonAy !== null &&
      s.pencereSonGun !== null
    ) {
      m.pencere = {
        bas: [s.pencereBasAy, s.pencereBasGun],
        son: [s.pencereSonAy, s.pencereSonGun],
      };
    }
    if (s.oncelikliOzelGun) m.oncelikliOzelGun = true;
    if (s.adGerekli) m.adGerekli = true;
    if (s.dogumGunu) m.dogumGunu = true;
    if (s.adsizTr && s.adsizKk && s.adsizRu) {
      m.adsizMetin = { tr: s.adsizTr, kk: s.adsizKk, ru: s.adsizRu };
    }
    if (s.davranis) m.davranis = s.davranis as NonNullable<SplashMesaji['davranis']>;
    return m;
  }

  /** Cihazın indireceği katalog. Sürüm = en son değişiklik zamanı. */
  async katalog(): Promise<{ surum: string; mesajlar: readonly SplashMesaji[] }> {
    const satirlar = await this.prisma.splashMessage.findMany({
      where: { active: true },
      orderBy: [{ sira: 'asc' }, { code: 'asc' }],
    });
    if (satirlar.length === 0) return { surum: 'yerel', mesajlar: ACILIS_MESAJLARI };

    const enSonMs = Math.max(...satirlar.map((s) => s.updatedAt.getTime()));
    const aday = {
      surum: new Date(enSonMs).toISOString(),
      mesajlar: satirlar.map((s) => this.satirdanMesaj(s)),
    };

    // Cihazın uygulayacağı doğrulamanın AYNISI. Geçmiyorsa yayınlamıyoruz.
    return uzakKatalogAyikla(aday) ?? { surum: 'yerel', mesajlar: ACILIS_MESAJLARI };
  }

  /** Panel listesi — pasifler dahil. */
  async liste() {
    return this.prisma.splashMessage.findMany({ orderBy: [{ sira: 'asc' }, { code: 'asc' }] });
  }

  /**
   * Panelden yerel paketi tabloya aktar.
   *
   * Panel boş bir tabloyla açıldığında yönetici "mesajlar nerede?" diye
   * sormasın diye: tek tuşla 54 mesaj kayda geçiyor. VAR OLAN satırlara
   * DOKUNMUYOR — yöneticinin düzenlemesini geri almazdı.
   */
  async yerelPaketiAktar(): Promise<{ eklenen: number }> {
    const mevcut = new Set(
      (await this.prisma.splashMessage.findMany({ select: { code: true } })).map((x) => x.code),
    );
    const yeni = ACILIS_MESAJLARI.filter((m) => !mevcut.has(m.id));
    let sira = 0;
    for (const m of ACILIS_MESAJLARI) {
      sira += 10;
      if (mevcut.has(m.id)) continue;
      await this.prisma.splashMessage.create({
        data: { ...this.girdidenVeri(m as never), code: m.id, sira },
      });
    }
    return { eklenen: yeni.length };
  }

  private girdidenVeri(g: SplashMesajGirdisi | SplashMesaji) {
    const m = g as SplashMesajGirdisi & SplashMesaji;
    const metin = m.metin ?? { tr: '', kk: '', ru: '' };
    return {
      grup: m.grup,
      etiket: m.etiket ?? 'neutral',
      tr: metin.tr,
      kk: metin.kk,
      ru: metin.ru,
      active: m.active ?? true,
      saatBas: m.saat?.[0] ?? null,
      saatSon: m.saat?.[1] ?? null,
      haftaSonu: m.haftaSonu ?? false,
      gunler: [...(m.gunler ?? [])],
      pencereBasAy: m.pencere?.bas[0] ?? null,
      pencereBasGun: m.pencere?.bas[1] ?? null,
      pencereSonAy: m.pencere?.son[0] ?? null,
      pencereSonGun: m.pencere?.son[1] ?? null,
      oncelikliOzelGun: m.oncelikliOzelGun ?? false,
      adGerekli: m.adGerekli ?? false,
      dogumGunu: m.dogumGunu ?? false,
      adsizTr: m.adsizMetin?.tr ?? null,
      adsizKk: m.adsizMetin?.kk ?? null,
      adsizRu: m.adsizMetin?.ru ?? null,
      davranis: m.davranis ?? null,
    };
  }

  async kaydet(code: string, g: SplashMesajGirdisi) {
    const veri = this.girdidenVeri(g);
    const satir = await this.prisma.splashMessage.upsert({
      where: { code },
      create: { code, sira: g.sira ?? 0, ...veri },
      update: { ...veri, ...(g.sira === undefined ? {} : { sira: g.sira }) },
    });
    return satir;
  }

  async pasifeAl(code: string, active: boolean) {
    const var_ = await this.prisma.splashMessage.findUnique({ where: { code } });
    if (!var_) throw new NotFoundException('Mesaj bulunamadı');
    return this.prisma.splashMessage.update({ where: { code }, data: { active } });
  }

  /**
   * GÖSTERİM / ATLAMA SAYACI — brief §7.3.
   *
   * Kişiye bağlı satır yazılmıyor: gün + mesaj + dil kırılımında sayaç
   * artıyor. Kim gördü bilgisi skip oranı için gerekmiyor; tutmak
   * gereksiz bir iz olurdu.
   */
  async olcumYaz(g: SplashOlcumGirdisi): Promise<void> {
    const gun = new Date(Date.UTC(g.gun.getUTCFullYear(), g.gun.getUTCMonth(), g.gun.getUTCDate()));
    await this.prisma.splashStat.upsert({
      where: { gun_code_locale: { gun, code: g.code, locale: g.locale } },
      create: { gun, code: g.code, locale: g.locale, gosterim: 1, atlama: g.atlandi ? 1 : 0 },
      update: { gosterim: { increment: 1 }, ...(g.atlandi ? { atlama: { increment: 1 } } : {}) },
    });
  }

  /** Panel raporu: mesaj başına gösterim, atlama ve skip oranı. */
  async rapor(gunSayisi = 30) {
    const esik = new Date(Date.now() - gunSayisi * 86400000);
    const satirlar = await this.prisma.splashStat.groupBy({
      by: ['code'],
      where: { gun: { gte: esik } },
      _sum: { gosterim: true, atlama: true },
    });
    return satirlar
      .map((s) => {
        const gosterim = s._sum.gosterim ?? 0;
        const atlama = s._sum.atlama ?? 0;
        return {
          code: s.code,
          gosterim,
          atlama,
          // Gösterim yokken oran YOK — 0 yazsaydık "hiç atlanmıyor" gibi
          // okunur ve düşük performanslı mesaj ayıklaması yanlış çalışırdı.
          skipOrani: gosterim === 0 ? null : Math.round((atlama / gosterim) * 1000) / 1000,
        };
      })
      .sort((a, b) => (b.skipOrani ?? -1) - (a.skipOrani ?? -1));
  }
}
