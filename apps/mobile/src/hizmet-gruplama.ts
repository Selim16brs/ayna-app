import { TAXONOMY, findServiceWithCategory, type Tri } from './taxonomy';

/**
 * HİZMETLERİ KATEGORİYE GÖRE GRUPLAR — brief §4.7.
 *
 * "Profilde uzmanın hizmetleri kategori → alt hizmet hiyerarşisiyle
 * gruplu gösterilir; kategori ikonları başlıklarda kullanılır."
 *
 * Brief §4.1 ile uzman aynı alt hizmetin altına birden çok satır
 * ekleyebiliyor ("Kök boyası", "Tam boya"). Düz liste artık okunmuyor:
 * dört kategoride çalışan bir uzmanın on beş satırı sırasız akıyor ve
 * müşteri aradığı hizmeti bulamıyor.
 *
 * ── BAĞSIZ SATIRLAR KAYBOLMUYOR ─────────────────────────────────────────
 *
 * Eski kayıtlarda ve serbest yazılmış hizmetlerde katalog bağı yok. Onları
 * atmak uzmanın GERÇEKTEN sunduğu bir hizmeti profilden silmek olurdu;
 * sona, kategorisiz bir gruba konuyorlar.
 *
 * ── SIRA KATALOG SIRASI ─────────────────────────────────────────────────
 *
 * Uzmanın ekleme sırası değil: uzman hizmetlerini rastgele eklemiş
 * olabilir, müşteri her profilde aynı düzeni görmeli. Alfabetik de değil —
 * dil değişince sıra değişirdi.
 */

export interface HizmetGrubu<T> {
  /** Kategori kimliği; kategorisiz grupta `null`. */
  kategoriId: string | null;
  /** Üç dilli kategori adı; kategorisiz grupta `null`. */
  ad: Tri | null;
  satirlar: T[];
}

/** Kategori kimliği → katalogdaki sıra. */
const SIRA = new Map(TAXONOMY.map((c, i) => [c.id, i]));

export function hizmetleriGrupla<T extends { serviceId?: string | null }>(
  satirlar: readonly T[],
): HizmetGrubu<T>[] {
  const gruplar = new Map<string, HizmetGrubu<T>>();
  const kategorisiz: T[] = [];

  for (const s of satirlar) {
    const bulunan = s.serviceId ? findServiceWithCategory(s.serviceId) : undefined;
    if (!bulunan) {
      kategorisiz.push(s);
      continue;
    }
    const kat = bulunan.category;
    const g = gruplar.get(kat.id) ?? { kategoriId: kat.id, ad: kat.ad, satirlar: [] };
    g.satirlar.push(s);
    gruplar.set(kat.id, g);
  }

  const sirali = [...gruplar.values()].sort(
    (a, b) => (SIRA.get(a.kategoriId!) ?? 0) - (SIRA.get(b.kategoriId!) ?? 0),
  );
  return kategorisiz.length
    ? [...sirali, { kategoriId: null, ad: null, satirlar: kategorisiz }]
    : sirali;
}
