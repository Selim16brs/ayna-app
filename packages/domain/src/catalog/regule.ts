import { aramaAnahtari } from './arama.js';
import { altHizmetinKategorisi } from './katalog.js';

/**
 * REGÜLE HİZMET TARAMASI — brief §5.
 *
 * Brief: "Enjeksiyon işlemleri (botoks, dudak/yüz dolgusu, mezoterapi),
 * diş işlemleri (beyazlatma dahil), beslenme/diyetisyen danışmanlığı
 * katalogda YER ALMAZ ve uzman kaydında seçilemez… Uzman, manuel hizmet
 * adına bu işlemleri yazarsa admin panelde moderasyon kuyruğuna düşer
 * (basit anahtar kelime kontrolü — ботокс, филлер, dolgu vb.)."
 *
 * Sebep brief'te açık: uzmanlar SMS + yüz doğrulamayla ANINDA yayına
 * geçiyor. Lisanssız medikal işlem satışı hukuki ve itibar riski.
 *
 * ── ENGELLEMİYOR, İŞARETLİYOR ───────────────────────────────────────────
 *
 * Brief "moderasyon kuyruğuna düşer" diyor, "reddedilir" demiyor. Fark
 * önemli: anahtar kelime taraması hata yapar ve otomatik reddetme, meşru
 * bir uzmanın kaydını sessizce boşa çıkarırdı. Kayıt tamamlanıyor, hizmet
 * kaydediliyor, karar yöneticide.
 *
 * ── YANLIŞ POZİTİF: "DOLGU" ─────────────────────────────────────────────
 *
 * Brief örnek olarak "dolgu" veriyor ama TIRNAK dünyasında "dolgu"
 * (protez tırnak dolgusu / коррекция) günlük ve tamamen meşru bir hizmet.
 * Her "dolgu"yu işaretlemek, her tırnak uzmanını kuyruğa düşürür ve
 * kuyruğu kullanılmaz hâle getirirdi — asıl tehlikeli kayıtlar gürültüde
 * kaybolurdu.
 *
 * Bu yüzden bazı sözcükler KATEGORİYE DUYARLI: `haric` listesindeki
 * kategoriye bağlı bir hizmette o sözcük işaretlenmiyor. Serbest yazılmış,
 * hiçbir kategoriye bağlanmamış bir "dudak dolgusu" ise işaretleniyor.
 *
 * Aynı sebeple "beyazlatma" tek başına aranmıyor: CİLT beyazlatma meşru
 * bir kozmetik hizmet, regüle olan DİŞ beyazlatma. Öbek aranıyor.
 */

export interface ReguleKural {
  /** Küçük harfe indirgenmiş arama öbeği. */
  ifade: string;
  /** Yöneticiye gösterilecek kısa sebep. */
  sebep: string;
  /**
   * Bu kategorilere bağlı hizmetlerde ARANMAZ.
   *
   * Boşsa her yerde aranır. Yalnız gerçekten çakışan sözcükler için
   * kullanılıyor — muafiyet listesi büyürse tarama işe yaramaz hâle gelir.
   */
  haric?: readonly string[];
}

/**
 * Anahtar kelimeler — üç dil.
 *
 * Liste brief §5'teki üç başlığı karşılıyor: enjeksiyon, diş, beslenme.
 * Kazakçada bu terimlerin çoğu Rusçadan alıntı ve öyle yazılıyor; ayrı
 * satır açmak yerine Rusça biçim zaten yakalıyor.
 */
export const REGULE_KURALLAR: readonly ReguleKural[] = [
  // ── Enjeksiyon ────────────────────────────────────────────────────────
  /*
   * "botoks" SAÇTA meşru: katalogun kendisinde `hair.keratin` =
   * "Keratin & Saç Botoksu" var. Saç botoksu enjeksiyon değil, keratin
   * bakımıdır. Saça bağlı hizmetlerde aranmıyor; brief §5'in yasakladığı
   * yüz botoksudur.
   */
  { ifade: 'botoks', sebep: 'Enjeksiyon (botoks)', haric: ['hair', 'hair_health'] },
  { ifade: 'ботокс', sebep: 'Enjeksiyon (botoks)', haric: ['hair', 'hair_health'] },
  { ifade: 'botox', sebep: 'Enjeksiyon (botoks)', haric: ['hair', 'hair_health'] },
  { ifade: 'filler', sebep: 'Enjeksiyon (dolgu)' },
  { ifade: 'филлер', sebep: 'Enjeksiyon (dolgu)' },
  /*
   * "dolgu" TIRNAKTA meşru (protez tırnak dolgusu). Tırnağa bağlı
   * hizmetlerde aranmıyor; başka her yerde aranıyor.
   */
  { ifade: 'dolgu', sebep: 'Enjeksiyon (dolgu)', haric: ['nails'] },
  { ifade: 'mezoterapi', sebep: 'Enjeksiyon (mezoterapi)' },
  { ifade: 'мезотерап', sebep: 'Enjeksiyon (mezoterapi)' },
  { ifade: 'биоревитализ', sebep: 'Enjeksiyon (biorevitalizasyon)' },
  { ifade: 'контурная пластика', sebep: 'Enjeksiyon (kontur plastik)' },
  { ifade: 'гиалурон', sebep: 'Enjeksiyon (hyaluronik asit)' },
  { ifade: 'hyaluron', sebep: 'Enjeksiyon (hyaluronik asit)' },

  // ── Diş ───────────────────────────────────────────────────────────────
  /*
   * "beyazlatma" TEK BAŞINA aranmıyor: cilt beyazlatma meşru bir kozmetik
   * hizmet. Regüle olan DİŞ beyazlatma — öbek aranıyor.
   */
  { ifade: 'diş beyazlatma', sebep: 'Diş (beyazlatma)' },
  { ifade: 'dis beyazlatma', sebep: 'Diş (beyazlatma)' },
  { ifade: 'отбеливание зуб', sebep: 'Diş (beyazlatma)' },
  { ifade: 'тіс ағарту', sebep: 'Diş (beyazlatma)' },
  { ifade: 'винир', sebep: 'Diş (veneer)' },
  { ifade: 'veneer', sebep: 'Diş (veneer)' },
  { ifade: 'lamina diş', sebep: 'Diş (lamina)' },
  { ifade: 'стоматолог', sebep: 'Diş hekimliği' },

  // ── Beslenme ──────────────────────────────────────────────────────────
  { ifade: 'diyetisyen', sebep: 'Beslenme danışmanlığı' },
  { ifade: 'диетолог', sebep: 'Beslenme danışmanlığı' },
  { ifade: 'нутрициолог', sebep: 'Beslenme danışmanlığı' },
  { ifade: 'beslenme danışman', sebep: 'Beslenme danışmanlığı' },
  { ifade: 'beslenme danisman', sebep: 'Beslenme danışmanlığı' },
];

/**
 * HİÇBİR ZAMAN işaretlenmeyecek öbekler.
 *
 * Kategori muafiyeti yalnız hizmet bir alt hizmete BAĞLIYSA çalışıyor.
 * Uzman "Saç botoksu" diye serbest yazıp hiçbir şeye bağlamazsa kategori
 * bilinmiyor ve kural devreye girerdi — oysa saç botoksu katalogda duran
 * meşru bir hizmet (`hair.keratin`).
 *
 * Liste KISA tutuluyor: her muafiyet taramada bir delik demek.
 */
const GUVENLI_IFADELER: readonly string[] = [
  'saç botoks',
  'sac botoks',
  'ботокс для волос',
  'шаш ботокс',
  'ботокс волос',
  // Tırnak dolgusu — kategoriye bağlanmamış serbest yazımlar için.
  'tırnak dolgu',
  'tirnak dolgu',
];

/**
 * Arama anahtarı — ortak normalleştirici (`arama.ts`).
 *
 * Kural burada TEKRARLANMIYOR: uygulamanın üç dilli araması da aynı
 * işlemi yapıyor ve iki kopya olsaydı biri düzeltilip öteki bozuk
 * kalırdı. (Nitekim öyle oldu.)
 */
export const reguleAnahtari = aramaAnahtari;

/**
 * Bir hizmet adı regüle bir işlemi anlatıyor mu?
 *
 * @param ad        uzmanın yazdığı serbest hizmet adı
 * @param serviceId bağlı olduğu katalog alt hizmeti (varsa) — kategoriye
 *                  duyarlı kurallar bunu kullanıyor
 * @returns eşleşen kuralın sebebi, yoksa `undefined`
 */
export function reguleSebebi(ad: string, serviceId?: string | null): string | undefined {
  const metin = reguleAnahtari(ad);
  if (!metin) return undefined;
  // Güvenli öbek varsa hiç bakılmıyor: adın tamamı meşru bir hizmeti
  // anlatıyor, içindeki sözcük tek başına yanıltıcı.
  if (GUVENLI_IFADELER.some((g) => metin.includes(reguleAnahtari(g)))) return undefined;
  const kategori = serviceId ? altHizmetinKategorisi(serviceId) : undefined;
  for (const k of REGULE_KURALLAR) {
    if (k.haric && kategori && k.haric.includes(kategori)) continue;
    if (metin.includes(reguleAnahtari(k.ifade))) return k.sebep;
  }
  return undefined;
}

/** Hizmet listesindeki regüle satırlar — yöneticiye gidecek kayıtlar. */
export function reguleHizmetler(
  satirlar: readonly { name?: unknown; id?: unknown; serviceId?: unknown }[],
): { ad: string; sebep: string }[] {
  const out: { ad: string; sebep: string }[] = [];
  const gorulen = new Set<string>();
  for (const s of satirlar) {
    if (typeof s?.name !== 'string') continue;
    const bagli = typeof s.serviceId === 'string' ? s.serviceId : (s.id as string | undefined);
    const sebep = reguleSebebi(s.name, typeof bagli === 'string' ? bagli : null);
    if (!sebep) continue;
    const anahtar = reguleAnahtari(s.name);
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    out.push({ ad: s.name.trim(), sebep });
  }
  return out;
}
