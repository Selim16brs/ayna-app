import {
  ACILIS_MESAJLARI,
  type SplashEtiket,
  type SplashGrup,
  type SplashMesaji,
  type TarihPenceresi,
} from './mesajlar.js';

/**
 * UZAK KATALOG — `AYNA_ACILIS_MESAJLARI_BRIEF.md` §7.1.
 *
 * "Tüm mesajlar uygulamayla birlikte cihazda gelir (splash internetsiz de
 * çalışır); açılışta arka planda sunucudan güncel katalog senkronize
 * edilir. Yeni mesaj/pencere değişikliği app güncellemesi gerektirmez."
 *
 * ── HEPSİ YA DA HİÇBİRİ ─────────────────────────────────────────────────
 *
 * Tek bir bozuk satır bütün yükü reddettiriyor; kırık satırı atlayıp
 * gerisini almıyoruz. Sebebi: panelde yapılan bir yazım hatası, sessizce
 * bir mesajı katalogdan düşürürdü ve kimse fark etmezdi. Reddedersek
 * cihaz son geçerli kataloğu kullanmaya devam eder — kullanıcı hiçbir şey
 * kaybetmez, hata görünür kalır.
 *
 * ── EKRAN BOŞ KALAMAZ ───────────────────────────────────────────────────
 *
 * Panelden herkes pasife alınırsa uzak katalog GEÇERSİZ sayılıyor: seçim
 * motoruna boş havuz vermek, açılışta boş bir ekran demek olurdu. En az
 * bir koşulsuz (her zaman gösterilebilir) mesaj şart.
 */

const dilAlani = (o: Record<string, unknown>, ad: string): boolean => {
  const v = o[ad];
  if (typeof v !== 'object' || v === null) return false;
  const d = v as Record<string, unknown>;
  return (['tr', 'kk', 'ru'] as const).every(
    (k) => typeof d[k] === 'string' && (d[k] as string).trim().length > 0,
  );
};

const GRUPLAR = new Set<string>(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
const ETIKETLER = new Set<string>(['female', 'neutral']);
const DAVRANISLAR = new Set<string>([
  'ilk_acilis',
  'uzun_yokluk',
  'yarin_randevu',
  'bugun_randevu',
  'randevu_sonrasi',
  'puan_hazir',
]);

const tamSayi = (v: unknown, alt: number, ust: number): boolean =>
  typeof v === 'number' && Number.isInteger(v) && v >= alt && v <= ust;

const gunCifti = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && tamSayi(v[0], 1, 12) && tamSayi(v[1], 1, 31);

const pencereGecerli = (v: unknown): v is TarihPenceresi => {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return gunCifti(p.bas) && gunCifti(p.son);
};

/** Tek mesajı doğrula; geçersizse null. */
function mesajAyikla(ham: unknown): SplashMesaji | null {
  if (typeof ham !== 'object' || ham === null) return null;
  const o = ham as Record<string, unknown>;

  if (typeof o.id !== 'string' || o.id.trim() === '') return null;
  if (typeof o.grup !== 'string' || !GRUPLAR.has(o.grup)) return null;
  if (typeof o.etiket !== 'string' || !ETIKETLER.has(o.etiket)) return null;
  if (!dilAlani(o, 'metin')) return null;

  const m: SplashMesaji = {
    id: o.id,
    grup: o.grup as SplashGrup,
    etiket: o.etiket as SplashEtiket,
    metin: o.metin as SplashMesaji['metin'],
  };

  if (o.saat !== undefined) {
    const s = o.saat;
    // Saat aralığı [dahil, hariç): 24 geçerli üst uç (akşam 17–24).
    if (!Array.isArray(s) || s.length !== 2 || !tamSayi(s[0], 0, 23) || !tamSayi(s[1], 1, 24)) {
      return null;
    }
    if ((s[1] as number) <= (s[0] as number)) return null;
    m.saat = [s[0] as number, s[1] as number];
  }
  if (o.haftaSonu !== undefined) {
    if (o.haftaSonu !== true) return null;
    m.haftaSonu = true;
  }
  if (o.gunler !== undefined) {
    if (!Array.isArray(o.gunler) || o.gunler.length === 0) return null;
    if (!o.gunler.every((g) => tamSayi(g, 0, 6))) return null;
    m.gunler = o.gunler as number[];
  }
  if (o.pencere !== undefined) {
    if (!pencereGecerli(o.pencere)) return null;
    m.pencere = o.pencere;
  }
  if (o.oncelikliOzelGun !== undefined) {
    if (o.oncelikliOzelGun !== true) return null;
    // Öncelikli özel gün penceresiz anlamsız: pencere yoksa "ilk açılışta
    // kesin göster" kuralı her gün tetiklenir ve havuzu kilitler.
    if (!m.pencere) return null;
    m.oncelikliOzelGun = true;
  }
  if (o.adGerekli !== undefined) {
    if (o.adGerekli !== true) return null;
    m.adGerekli = true;
  }
  if (o.dogumGunu !== undefined) {
    if (o.dogumGunu !== true) return null;
    m.dogumGunu = true;
  }
  if (o.adsizMetin !== undefined) {
    if (!dilAlani(o, 'adsizMetin')) return null;
    m.adsizMetin = o.adsizMetin as SplashMesaji['metin'];
  }
  if (o.davranis !== undefined) {
    if (typeof o.davranis !== 'string' || !DAVRANISLAR.has(o.davranis)) return null;
    m.davranis = o.davranis as NonNullable<SplashMesaji['davranis']>;
  }
  return m;
}

/** Koşulsuz gösterilebilir mi — genel havuzun taşıyıcısı. */
export function kosulsuz(m: SplashMesaji): boolean {
  return (
    !m.saat &&
    !m.haftaSonu &&
    !m.gunler &&
    !m.pencere &&
    !m.adGerekli &&
    !m.dogumGunu &&
    !m.davranis
  );
}

export interface UzakKatalog {
  surum: string;
  mesajlar: readonly SplashMesaji[];
}

/**
 * Sunucudan gelen ham gövdeyi kataloğa çevir; güvenilmezse null.
 *
 * null dönmek "kataloğu değiştirme" demektir — çağıran yerel paketi
 * kullanmaya devam eder.
 */
export function uzakKatalogAyikla(ham: unknown): UzakKatalog | null {
  if (typeof ham !== 'object' || ham === null) return null;
  const o = ham as Record<string, unknown>;
  if (typeof o.surum !== 'string' || o.surum.trim() === '') return null;
  if (!Array.isArray(o.mesajlar)) return null;

  const mesajlar: SplashMesaji[] = [];
  const kimlikler = new Set<string>();
  for (const ham2 of o.mesajlar) {
    const m = mesajAyikla(ham2);
    if (!m) return null;
    // Aynı kimlik iki kez: rotasyon durumu kimliğe bağlı, kopya kimlik
    // "görüldü" işaretini paylaşır ve mesajlardan biri hiç çıkmaz.
    if (kimlikler.has(m.id)) return null;
    kimlikler.add(m.id);
    mesajlar.push(m);
  }
  if (!mesajlar.some(kosulsuz)) return null;
  return { surum: o.surum, mesajlar };
}

/** Cihazın kullanacağı katalog: geçerli uzak varsa o, yoksa yerel paket. */
export function gecerliKatalog(uzak: UzakKatalog | null | undefined): readonly SplashMesaji[] {
  return uzak && uzak.mesajlar.length > 0 ? uzak.mesajlar : ACILIS_MESAJLARI;
}
