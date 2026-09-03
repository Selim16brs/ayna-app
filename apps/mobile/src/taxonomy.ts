import type { Ionicons } from '@expo/vector-icons';
import { KATALOG, aramaAnahtari, ucDil, type UcDil } from '@ayna/domain';
import { varsayilan } from './hizmet-varsayilan';

type IoniconName = keyof typeof Ionicons.glyphMap;

/**
 * AYNA — KATEGORİ MİMARİSİ.
 *
 * Bu dosya ARTIK KATALOG DEĞİL. Kategoriler ve alt hizmetler
 * `@ayna/domain` → `KATALOG` içinde; kaynağı `AYNA_HIZMET_KATALOGU_BRIEF.md`
 * v1.0 ve orası hem sunucunun hem uygulamanın okuduğu tek liste.
 *
 * Burada kalan şey UYGULAMANIN GÖRÜNÜMÜ: katalog kimliklerine ikon ve
 * (ayrı dosyadan) süre/fiyat/döngü bağlanıyor. Eskiden 12 kategori ve
 * `hair-cut` gibi kimlikler BU dosyada elle yazılıydı — brief §1 bunu
 * açıkça yasaklıyor ("ikinci bir liste, hard-coded kategori YASAKTIR").
 *
 * ── "AKTİF" KAVRAMI KALKTI ──────────────────────────────────────────────
 *
 * Eskiden Wellness ve Stil `active: false` ile GİZLENİYORDU. Brief §7.4
 * bunun yerine arz-güdümlü davranış istiyor: kategori her zaman görünür,
 * o an yayında uzmanı yoksa "Yakında" rozeti alır. Gizlemek, talebi de
 * görünmez yapıyordu — hiç kimse istemediği için hiç uzman gelmiyordu.
 * Rozet hesabı sunucuda (`GET /taxonomy`), çünkü arzı orası biliyor.
 */

export type TaxLocale = 'tr' | 'kk' | 'ru';
export type Tri = UcDil;

/** Üç dilli metinden geçerli dildekini seçer (eksikse TR). */
export const tri = (t: Tri, locale: string): string => ucDil(t, locale);

export interface TaxService {
  /** Katalog kimliği: `kategori.alt` (örn `hair.haircut`). DEĞİŞTİRİLEMEZ. */
  id: string;
  label: Tri;
  durationMin: number;
  price: number;
  /** Bakım döngüsü — bakım takvimi bunu kullanır (yoksa periyodik değil). */
  periodDays?: number;
  popular?: boolean;
}

export interface TaxCategory {
  /** Katalog kimliği (örn `lashes_brows`). DEĞİŞTİRİLEMEZ. */
  id: string;
  /** Üç dilli kategori adı — KATALOGDAN. i18n'de kopyası YOK. */
  ad: Tri;
  icon: IoniconName;
  services: TaxService[];
}

/**
 * Kategori ikonu (Ionicons).
 *
 * Ana sayfadaki ÇİZİLMİŞ ikonlar burada değil — onlar `hizmet-ikon.ts`te.
 * Bu eşleme haritada, bildirim tercihlerinde ve çizimin olmadığı yerlerde
 * kullanılıyor; brief §6.2'deki ikon konseptini takip ediyor.
 */
const IKON: Record<string, IoniconName> = {
  hair: 'cut-outline',
  nails: 'color-palette-outline',
  lashes_brows: 'eye-outline',
  epilation: 'flash-outline',
  skin: 'water-outline',
  makeup: 'brush-outline',
  massage: 'hand-left-outline',
  spa: 'flower-outline',
  body_contouring: 'body-outline',
  hair_health: 'medkit-outline',
  style: 'shirt-outline',
  wellness: 'leaf-outline',
  other: 'ellipsis-horizontal-circle-outline',
};

export const TAXONOMY: TaxCategory[] = KATALOG.map((k) => ({
  id: k.id,
  ad: k.ad,
  icon: IKON[k.id] ?? 'sparkles-outline',
  services: k.altHizmetler.map((a) => {
    const v = varsayilan(a.id);
    return {
      id: a.id,
      label: a.ad,
      durationMin: v.durationMin,
      price: v.price,
      ...(v.periodDays === undefined ? {} : { periodDays: v.periodDays }),
      ...(v.popular ? { popular: true } : {}),
    };
  }),
}));

/**
 * Görünen kategoriler.
 *
 * Brief §7.4 gereği TAMAMI görünüyor; arzı olmayan "Yakında" rozetiyle
 * çıkıyor. Ad eski çağıranlar bozulmasın diye korundu.
 */
export const activeCategories = (): TaxCategory[] => TAXONOMY;

export const findCategory = (id: string): TaxCategory | undefined =>
  TAXONOMY.find((c) => c.id === id);

export const servicesOf = (categoryId: string): TaxService[] =>
  findCategory(categoryId)?.services ?? [];

export const allServices = (): TaxService[] => TAXONOMY.flatMap((c) => c.services);

export const findService = (id: string): TaxService | undefined =>
  allServices().find((s) => s.id === id);

export const findServiceWithCategory = (
  id: string,
): { service: TaxService; category: TaxCategory } | undefined => {
  for (const category of TAXONOMY) {
    const service = category.services.find((s) => s.id === id);
    if (service) return { service, category };
  }
  return undefined;
};

/** Kategori adı, seçili dilde. Kimlik tanınmazsa boş döner (uydurma yok). */
export const kategoriAdi = (id: string, locale: string): string => {
  const c = findCategory(id);
  return c ? tri(c.ad, locale) : '';
};

/**
 * ── ÜÇ DİLLİ ARAMA (brief §4.4) ─────────────────────────────────────────
 *
 * Arama SEÇİLİ DİLE BAKMAZ. Kazakistan'da kullanıcı arayüzü Kazakça olsa
 * da "маникюр" yazıyor; arayüz Rusça olsa da "kirpik" arayan oluyor.
 * Eskiden yalnız o anki dildeki etiket taranıyordu ve öteki iki dildeki
 * karşılığını yazan hiçbir sonuç göremiyordu.
 *
 * TÜRKÇE "I" TUZAĞI: `toLocaleLowerCase('tr-TR')` "MANIKÜR"ü "manıkür"
 * yapar ve katalogdaki "manikür"le eşleşmez. Bu yüzden i/ı/İ/I dördü de
 * tek bir "i"ye indirgeniyor — arama tarafında bu ayrım bilgi taşımıyor,
 * yalnız eşleşmeyi bozuyor.
 */
/**
 * Arama anahtarı — `@ayna/domain`den geliyor.
 *
 * Burada kendi kopyası vardı ve Türkçe "İ" tuzağına düşüyordu:
 * `'İ'.toLowerCase()` iki kod noktası üretiyor ('i' + birleşen nokta) ve
 * "MANİKÜR" araması HİÇBİR SONUÇ döndürmüyordu. Kural artık tek yerde;
 * sunucunun regüle hizmet taraması da oradan besleniyor.
 */
export { aramaAnahtari };

/** Metin, üç dilli adın herhangi bir dilindeki karşılığında geçiyor mu? */
const ucDildeGecer = (ad: Tri, sorgu: string): boolean => {
  const q = aramaAnahtari(sorgu);
  if (!q) return false;
  return (['tr', 'kk', 'ru'] as const).some((d) => aramaAnahtari(ad[d]).includes(q));
};

/** Kategori kimliği verilen sorguyla üç dilde eşleşiyor mu? */
export const kategoriAra = (id: string, sorgu: string): boolean => {
  const c = findCategory(id);
  return c ? ucDildeGecer(c.ad, sorgu) : false;
};

/** Sorguyla üç dilde eşleşen alt hizmetler. */
export const hizmetAra = (sorgu: string): TaxService[] =>
  allServices().filter((s) => ucDildeGecer(s.label, sorgu));
