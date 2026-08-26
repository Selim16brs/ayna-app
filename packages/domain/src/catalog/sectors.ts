// Uzmanın HANGİ ALANLARDA hizmet verdiği — hizmet kimliklerinden türetilir.
//
// SORUN: uzman kayıtta birden çok alan seçebiliyordu ama sunucuya YALNIZ TEK
// bir `sector` gidiyordu (fiyat girilen ilk hizmetin kategorisi). Sonuç:
//  - Saç + tırnak yapan uzman yalnız saçta görünüyor, tırnak aramasında yok.
//  - Hiçbir hizmeti eşleşmeyen uzman 'hair' varsayılanına düşüyor, yani hiç
//    saç yapmayan biri saç aramasında çıkıyordu.
//
// Hizmet kimlikleri iki tarafta da `<kategori>-<...>` biçiminde ('hair-cut',
// 'nails-art', sunucu demo kataloğunda 'hair-1'). Alan seti bu önekten
// türetilir; ayrı bir alan tutup ikisini senkron tutmaya çalışmak, birinin
// diğerinden sapması demekti.

/** Bir uzmanın en çok kaç alanda görünebileceği — kötüye kullanım sınırı. */
export const MAX_SECTORS = 12;

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
    const tire = raw.indexOf('-');
    // Tireyle BAŞLAYAN kimlik bozuktur ('-orphan'): kategorisi yok, atlanır.
    // Yoksa '-orphan' olduğu gibi bir "alan" hâline gelir ve hiçbir aramayla
    // eşleşmeyen hayalet kategori üretirdi.
    if (tire === 0) continue;
    // Tiresiz kimlik kategorinin KENDİSİDİR ('hair'); tireli olan alt hizmet.
    const kat = (tire > 0 ? raw.slice(0, tire) : raw).trim().toLowerCase();
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
