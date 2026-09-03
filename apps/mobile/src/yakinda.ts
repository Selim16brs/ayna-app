import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { servicesOf } from './taxonomy';

/**
 * "YAKINDA" ROZETİ — brief §7.4.
 *
 * Brief: "Alt hizmette aktif ve yayında en az 1 uzman yoksa 'Yakında'
 * rozeti görünür; müşteri yine talep oluşturabilir."
 *
 * İkinci cümle rozetin bütün anlamı: bu bir KAPI DEĞİL, bir BEKLENTİ
 * AYARI. Ters pazar yerinin mantığı arz yokken bile talep toplamak;
 * rozet kategoriyi kapatsaydı hiç uzman gelmeyen kategori sonsuza kadar
 * boş kalırdı — eski `active: false` tam olarak bunu yapıyordu.
 *
 * ── ARZ NEDEN SUNUCUDAN GELİYOR ─────────────────────────────────────────
 *
 * Katalogun kendisi uygulamada (`@ayna/domain`) ve ağ olmadan çalışıyor.
 * Değişken olan tek şey arz: hangi alt hizmette yayında uzman var. Bunu
 * yalnız sunucu bilir ve uzman yayına girip çıktıkça değişir.
 *
 * ── AĞ YOKKEN ROZET GÖSTERİLMİYOR ───────────────────────────────────────
 *
 * Sunucuya ulaşılamadığında "hiçbir yerde uzman yok" varsaymak, çevrimdışı
 * bir kullanıcıya BÜTÜN kataloğu "Yakında" diye gösterirdi. Bilgi yoksa
 * rozet de yok: eksik bilgi, yanlış bilgiden iyidir.
 */

const BOS: ReadonlySet<string> = new Set();

interface YakindaDurumu {
  /** Sunucu cevap verdi mi? Vermediyse hiçbir rozet çizilmiyor. */
  biliniyor: boolean;
  /** Arzı OLMAYAN alt hizmet kimlikleri. */
  yakindaOlanlar: ReadonlySet<string>;
}

function useYakindaDurumu(): YakindaDurumu {
  const { data } = useQuery({
    queryKey: ['taxonomy'],
    queryFn: api.taxonomy,
    retry: 1,
    // Arz gün içinde değişiyor ama saniyede bir değişmiyor: 5 dakika,
    // her ekran açılışında ağa gitmemek için.
    staleTime: 300_000,
  });
  if (!data) return { biliniyor: false, yakindaOlanlar: BOS };
  const set = new Set<string>();
  for (const k of data.kategoriler) {
    for (const a of k.altHizmetler) if (a.yakinda) set.add(a.id);
  }
  return { biliniyor: true, yakindaOlanlar: set };
}

/**
 * Bu alt hizmet "Yakında" mı?
 *
 * Sunucu cevap vermediyse HER ZAMAN false — rozet uydurulmuyor.
 */
export function useHizmetYakinda(): (altHizmetId: string) => boolean {
  const { biliniyor, yakindaOlanlar } = useYakindaDurumu();
  return (id) => biliniyor && yakindaOlanlar.has(id);
}

/**
 * Bu kategori "Yakında" mı?
 *
 * Kategori ancak alt hizmetlerinin HEPSİ arzsızsa rozet alıyor. Tek bir
 * alt hizmette bile uzman varsa kategori çalışıyor demektir; ona
 * "Yakında" demek kullanıcıyı var olan uzmandan çevirirdi.
 *
 * Katalogda alt hizmeti olmayan bir kategori (olmamalı) rozet ALMIYOR:
 * boş bir listeden "hepsi arzsız" sonucu çıkarmak, `every` çağrısının
 * boş dizide true dönmesinden ibaret bir kaza olurdu.
 */
export function useKategoriYakinda(): (kategoriId: string) => boolean {
  const { biliniyor, yakindaOlanlar } = useYakindaDurumu();
  return (id) => {
    if (!biliniyor) return false;
    const alt = servicesOf(id);
    if (alt.length === 0) return false;
    return alt.every((s) => yakindaOlanlar.has(s.id));
  };
}
