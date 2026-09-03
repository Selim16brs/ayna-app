import { KATALOG, altHizmetinKategorisi, kategoriBul } from './katalog.js';

// Uzmanın HANGİ ALANLARDA hizmet verdiği — hizmet kimliklerinden türetilir.
//
// SORUN: uzman kayıtta birden çok alan seçebiliyordu ama sunucuya YALNIZ TEK
// bir `sector` gidiyordu (fiyat girilen ilk hizmetin kategorisi). Sonuç:
//  - Saç + tırnak yapan uzman yalnız saçta görünüyor, tırnak aramasında yok.
//  - Hiçbir hizmeti eşleşmeyen uzman 'hair' varsayılanına düşüyor, yani hiç
//    saç yapmayan biri saç aramasında çıkıyordu.
//
// ── AYRAÇTAN TÜRETME BİTTİ ─────────────────────────────────────────────
//
// Eskiden kategori, kimliğin İLK TİREYE kadarki parçasıydı ('hair-cut' →
// 'hair'). Katalog kimlikleri artık `hair.haircut` ve kategorilerin
// kendisinde alt çizgi var ('lashes_brows'); tireye bakan kod
// 'hair.haircut'ı olduğu gibi "alan" sanardı ve o uzman HİÇBİR aramada
// çıkmazdı. Kategori artık KATALOGDAN okunuyor.

/** Bir uzmanın en çok kaç alanda görünebileceği — kötüye kullanım sınırı. */
export const MAX_SECTORS = 12;

const KATEGORI_KIMLIKLERI = new Set(KATALOG.map((k) => k.id));

/**
 * Tek bir hizmet kimliğinin kategorisi.
 *
 * Üç durum, sırayla:
 *   1. Katalogdaki alt hizmet — `hair.haircut` → `hair`.
 *   2. Kategorinin kendisi — `hair` (salon kaydı alan seçiyor, hizmet değil).
 *   3. ESKİ ya da demo kimlik — `hair-cut`, `hair-1`. Ayraçtan önceki parça
 *      GERÇEK bir kategoriyse kabul ediliyor. Bu tolerans bilerek dar:
 *      tanınmayan önek atılıyor, çünkü uydurulmuş bir "alan" hiçbir aramayla
 *      eşleşmeyen hayalet kategori üretir.
 */
export function categoryOfServiceId(raw: string): string | undefined {
  const ham = raw.trim();
  if (!ham) return undefined;
  const alt = altHizmetinKategorisi(ham);
  if (alt) return alt;
  if (kategoriBul(ham)) return ham;
  const onek = ham.split(/[.-]/)[0]?.trim().toLowerCase();
  return onek && KATEGORI_KIMLIKLERI.has(onek) ? onek : undefined;
}

/**
 * Hizmet kimliklerinden alan (kategori) setini çıkarır.
 *
 * Sıra korunur: ilk hizmetin alanı ilk sırada kalır, böylece "ana alan"
 * kavramı bozulmadan sürer. Tekrarlar elenir.
 */
export function sectorsFromServiceIds(ids: readonly unknown[]): string[] {
  const out: string[] = [];
  for (const raw of ids) {
    if (typeof raw !== 'string') continue;
    const kat = categoryOfServiceId(raw);
    if (!kat) continue;
    if (!out.includes(kat)) out.push(kat);
    if (out.length >= MAX_SECTORS) break;
  }
  return out;
}

/**
 * Uzman bu alanda hizmet veriyor mu?
 *
 * Alan seti boş olan ESKİ kayıtlar için tek `sector` alanına düşülür —
 * geçiş sırasında kimse keşiften kaybolmasın.
 */
export function servesSector(
  pro: { sectors?: readonly string[] | null; sector?: string | null },
  sector: string,
): boolean {
  const set = pro.sectors;
  if (set && set.length > 0) return set.includes(sector);
  return pro.sector === sector;
}
