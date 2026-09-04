import {
  ACILIS_MESAJLARI,
  PUAN_ESIGI,
  type SplashMesaji,
  type TarihPenceresi,
} from './mesajlar.js';

/**
 * AÇILIŞ MESAJI SEÇİMİ — brief §3 (öncelik ve rotasyon), §4 (cinsiyet).
 *
 * ── SAF FONKSİYON ───────────────────────────────────────────────────────
 *
 * Ne saat okuyor ne depo: her şey `Baglam` içinde geliyor ve yeni durum
 * geri dönüyor. Seçim kuralları bu yüzden test edilebilir; ekran yalnız
 * bağlamı toplayıp sonucu çiziyor.
 *
 * ── ÜST ÜSTE AYNI MESAJ YOK ─────────────────────────────────────────────
 *
 * Brief: "hiçbir koşulda üst üste iki açılışta aynı mesaj görünmez."
 * Öncelikli dallardan (doğum günü, özel gün, davranış) gelen mesajlar da
 * `sonGosterilen`e yazılıyor — yoksa bir davranış mesajı iki açılış
 * boyunca tekrarlayabilirdi.
 */

export type SplashDil = 'tr' | 'kk' | 'ru';

/** Cihazda saklanan rotasyon durumu. */
export interface SplashDurumu {
  /** Bu turda gösterilmiş kimlikler (havuz bitince sıfırlanır). */
  gorulenler: string[];
  /** Bir önceki açılışta gösterilen kimlik. */
  sonGosterilen: string | null;
  /** Kimlik → son gösterim anı (ms). Sıklık limitleri buradan. */
  sonGosterimZamani: Record<string, number>;
}

export const BOS_DURUM: SplashDurumu = {
  gorulenler: [],
  sonGosterilen: null,
  sonGosterimZamani: {},
};

export interface SplashBaglami {
  /** Cihaz yerel saati — tüm tarih/saat kontrolleri bununla (brief §3). */
  simdi: Date;
  dil: string;
  ad?: string | null | undefined;
  /** Brief §4: yalnız 'female' tüm mesajları görüyor. */
  cinsiyet?: 'female' | 'male' | 'other' | null | undefined;
  dogumGunu?: { ay: number; gun: number } | null | undefined;
  /** bh_01 — kayıt sonrası ilk açılış. */
  ilkAcilis?: boolean;
  /** bh_02 — son açılıştan bu yana geçen gün. */
  yoklukGunu?: number | null | undefined;
  /** bh_03 / bh_04 — onaylı randevu kimliği (sıklık limiti randevu başına). */
  yarinRandevuId?: string | null | undefined;
  bugunRandevuId?: string | null | undefined;
  /** bh_05 — tamamlanmış ve henüz duyurulmamış randevu kimliği. */
  tamamlananRandevuId?: string | null | undefined;
  /** bh_06 — kullanılabilir puan. */
  puan?: number;
  durum: SplashDurumu;
  /**
   * Kullanılacak katalog — brief §7.1 uzak güncelleme.
   *
   * Verilmezse cihazla gelen yerel paket. Sunucudan inen katalog
   * `uzakKatalogAyikla` doğrulamasından geçmiş olmalı.
   */
  katalog?: readonly SplashMesaji[] | undefined;
}

export interface SplashSonucu {
  id: string;
  /** Ekrana yazılacak metin — yer tutucular doldurulmuş. */
  metin: string;
  /**
   * Metnin KALIN çizilecek parçası — brief dışı, kurucunun isteği
   * ("önemli kelime bold olsun").
   *
   * Metnin İÇİNDEN bir parça; ekran onu arayıp üçe bölüyor. Bulunamazsa
   * (ör. uzak katalogda vurgu yanlış girilmiş) hiçbir şey kalınlaşmıyor,
   * mesaj yine tam çıkıyor.
   */
  vurgu: string | null;
  grup: SplashMesaji['grup'];
  durum: SplashDurumu;
}

/**
 * Metni [önce, vurgu, sonra] olarak böl. Vurgu yoksa ya da metinde
 * geçmiyorsa vurgu parçası boş döner.
 */
export function vurguyuBol(metin: string, vurgu: string | null): [string, string, string] {
  if (!vurgu) return [metin, '', ''];
  const i = metin.indexOf(vurgu);
  if (i < 0) return [metin, '', ''];
  return [metin.slice(0, i), vurgu, metin.slice(i + vurgu.length)];
}

const GUN = 24 * 60 * 60 * 1000;
const HAFTA = 7 * GUN;

/** Yıl sınırını AŞAN pencereler de doğru çalışıyor (31 Ara – 7 Oca). */
export function pencereIcinde(p: TarihPenceresi, t: Date): boolean {
  const gun = (ay: number, g: number) => ay * 100 + g;
  const su = gun(t.getMonth() + 1, t.getDate());
  const bas = gun(p.bas[0], p.bas[1]);
  const son = gun(p.son[0], p.son[1]);
  return bas <= son ? su >= bas && su <= son : su >= bas || su <= son;
}

/** Mesaj şu an geçerli mi? (saat, gün, pencere, ad, cinsiyet) */
function uygun(msj: SplashMesaji, b: SplashBaglami): boolean {
  // Brief §4 — cinsiyet kadın değilse yalnız `neutral`.
  if (msj.etiket === 'female' && b.cinsiyet !== 'female') return false;
  if (msj.adGerekli && !b.ad?.trim()) return false;

  const saat = b.simdi.getHours();
  const gun = b.simdi.getDay();
  if (msj.saat && !(saat >= msj.saat[0] && saat < msj.saat[1])) return false;
  if (msj.haftaSonu && !(gun === 0 || gun === 6)) return false;
  if (msj.gunler && !msj.gunler.includes(gun)) return false;
  if (msj.pencere && !pencereIcinde(msj.pencere, b.simdi)) return false;
  return true;
}

/** Metni dile çevirip `{name}` yer tutucusunu doldurur. */
/** Seçilen dildeki vurgu parçası; tanımsızsa null. */
function vurguKur(msj: SplashMesaji, b: SplashBaglami): string | null {
  if (!msj.vurgu) return null;
  const dil = (['tr', 'kk', 'ru'] as const).includes(b.dil as SplashDil)
    ? (b.dil as SplashDil)
    : 'tr';
  return msj.vurgu[dil] ?? msj.vurgu.tr ?? null;
}

function metniKur(msj: SplashMesaji, b: SplashBaglami): string {
  const ad = b.ad?.trim();
  const dil = (['tr', 'kk', 'ru'] as const).includes(b.dil as SplashDil)
    ? (b.dil as SplashDil)
    : 'tr';
  // pn_02: ad yoksa kısaltılmış varyant (brief §2.6) — mesaj düşmüyor.
  const kaynak = !ad && msj.adsizMetin ? msj.adsizMetin : msj.metin;
  return (kaynak[dil] ?? kaynak.tr).replace('{name}', ad ?? '');
}

/** Bugünün başlangıcı (cihaz yerel saati). */
const gunBasi = (t: Date) => new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();

function bugunGosterildi(id: string, b: SplashBaglami): boolean {
  const z = b.durum.sonGosterimZamani[id];
  return z !== undefined && z >= gunBasi(b.simdi);
}

function sonHaftaGosterildi(id: string, b: SplashBaglami): boolean {
  const z = b.durum.sonGosterimZamani[id];
  return z !== undefined && b.simdi.getTime() - z < HAFTA;
}

const katalogu = (b: SplashBaglami): readonly SplashMesaji[] => b.katalog ?? ACILIS_MESAJLARI;

/*
 * Yapısal mesajı katalogda ARA — bulunamazsa null.
 *
 * Uzak katalog bh_04'ü kaldırabilir. `!` ile "kesin vardır" deseydim,
 * o kataloğu indiren cihazda randevusu olan herkes AÇILIŞTA ÇÖKERDİ.
 * Bulunamayan mesaj sessizce atlanıyor; sıradaki kural devralıyor.
 */
const bul = (b: SplashBaglami, id: string): SplashMesaji | null =>
  katalogu(b).find((x) => x.id === id) ?? null;

/**
 * Davranış mesajlarının sıklık limitleri.
 *
 * bh_03/04/05 "randevu başına 1": limit kimliğe DEĞİL randevuya bağlı,
 * bu yüzden anahtar `bh_03:<randevuId>`. Aynı randevu için ikinci kez
 * gösterilmiyor ama bir sonraki randevuda yeniden gösteriliyor.
 */
function davranisAdayi(b: SplashBaglami): { msj: SplashMesaji; anahtar: string } | null {
  const sirali: [string, string | null | undefined, boolean][] = [
    ['bh_04', b.bugunRandevuId, true],
    ['bh_03', b.yarinRandevuId, true],
    ['bh_05', b.tamamlananRandevuId, true],
    ['bh_06', (b.puan ?? 0) >= PUAN_ESIGI ? 'puan' : null, false],
    ['bh_02', (b.yoklukGunu ?? 0) >= 30 ? 'yokluk' : null, false],
  ];
  for (const [id, deger, randevuBazli] of sirali) {
    if (!deger) continue;
    const anahtar = randevuBazli ? `${id}:${deger}` : id;
    const z = b.durum.sonGosterimZamani[anahtar];
    if (randevuBazli ? z !== undefined : sonHaftaGosterildi(anahtar, b)) continue;
    const msj = bul(b, id);
    if (!msj) continue;
    return { msj, anahtar };
  }
  return null;
}

/** Genel havuz: A + B + G + o an geçerli C/D/E-sezon + pn_01. */
function havuz(b: SplashBaglami): SplashMesaji[] {
  return katalogu(b).filter(
    (x) => x.grup !== 'H' && !x.dogumGunu && !x.oncelikliOzelGun && uygun(x, b),
  );
}

/**
 * SEÇ — brief §3'teki sıra: ilk eşleşen kazanır.
 *
 * `rastgele` dışarıdan geliyor: test sonucu belirleyebilsin diye.
 * Varsayılanı `Math.random`.
 */
export function acilisMesajiSec(
  b: SplashBaglami,
  rastgele: () => number = Math.random,
): SplashSonucu {
  const yaz = (msj: SplashMesaji, anahtar = msj.id): SplashSonucu => ({
    id: msj.id,
    metin: metniKur(msj, b),
    vurgu: vurguKur(msj, b),
    grup: msj.grup,
    durum: {
      // Havuz kimliği turda işaretleniyor; öncelikli dallar havuza ait
      // değil, onlar turu KİRLETMİYOR.
      gorulenler:
        msj.grup === 'H' || msj.dogumGunu || msj.oncelikliOzelGun
          ? b.durum.gorulenler
          : [...new Set([...b.durum.gorulenler, msj.id])],
      sonGosterilen: msj.id,
      sonGosterimZamani: { ...b.durum.sonGosterimZamani, [anahtar]: b.simdi.getTime() },
    },
  });

  // 1 · bh_01 — ömürde bir kez.
  if (b.ilkAcilis && b.durum.sonGosterimZamani.bh_01 === undefined) {
    const hosGeldin = bul(b, 'bh_01');
    if (hosGeldin) return yaz(hosGeldin);
  }

  // 2 · Doğum günü — o günkü ilk açılış. Özel güne denk gelirse KAZANIR.
  if (
    b.dogumGunu &&
    b.dogumGunu.ay === b.simdi.getMonth() + 1 &&
    b.dogumGunu.gun === b.simdi.getDate() &&
    !bugunGosterildi('pn_02', b)
  ) {
    const dogum = bul(b, 'pn_02');
    if (dogum) return yaz(dogum);
  }

  // 3 · Öncelikli özel gün — pencere içindeki ilk açılış.
  const ozel = katalogu(b).find(
    (x) => x.oncelikliOzelGun && uygun(x, b) && !bugunGosterildi(x.id, b),
  );
  if (ozel) return yaz(ozel);

  // 4 · Davranış mesajları.
  const dav = davranisAdayi(b);
  if (dav) return yaz(dav.msj, dav.anahtar);

  // 5 · Genel havuz — tekrarsız döngü.
  const tumu = havuz(b);
  let kalan = tumu.filter((x) => !b.durum.gorulenler.includes(x.id));
  let turSifirlandi = false;
  if (kalan.length === 0) {
    // Tur bitti: karıştır ve yeniden başla. Yeni turun ilki bir önceki
    // gösterimle AYNI OLAMAZ (brief §3).
    kalan = tumu.filter((x) => x.id !== b.durum.sonGosterilen);
    if (kalan.length === 0) kalan = tumu;
    turSifirlandi = true;
  }
  /*
   * ÜST ÜSTE AYNI MESAJ NEDEN ÇIKAMIYOR — burada ek bir süzgeç YOK.
   *
   * Tur içinde: son gösterilen `gorulenler`de, `kalan` onu zaten
   * dışlıyor. Tur bitiminde: yukarıdaki sıfırlama son gösterileni
   * açıkça çıkarıyor. Öncelikli dallar (davranış, özel gün, doğum günü)
   * havuzda değil ve kendi sıklık limitleri var.
   *
   * Buraya bir süzgeç daha koymuştum; hiçbir mutasyon onu düşüremedi
   * çünkü hiçbir zaman iş yapmıyordu. Yapmayan koruma, okuyanı korunma
   * var sanmaya iter.
   *
   * TEK İSTİSNA havuzun tek mesaja düşmesi — o zaman tekrar kaçınılmaz
   * ve hiçbir süzgeç kurtarmaz.
   */
  const secilen = kalan[Math.floor(rastgele() * kalan.length)] ?? kalan[0]!;

  const sonuc = yaz(secilen);
  if (turSifirlandi) sonuc.durum.gorulenler = [secilen.id];
  return sonuc;
}
