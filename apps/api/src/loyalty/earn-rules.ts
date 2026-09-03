/**
 * PUAN KAZANIM KURALLARI — saf mantık, sunucu otoritesi.
 *
 * GÜVENLİK AÇIĞI DÜZELTMESİ: `POST /loyalty/earn` daha önce istemciden gelen
 * `points` değerini (1..10000) HİÇBİR doğrulama yapmadan ledger'a yazıyordu.
 * 1 puan = 1 ₸ ve puan bir ödemenin %50'sini karşıladığı için, kayıtlı herhangi
 * bir kullanıcı tek istekte 10.000 ₸ değerinde kredi basabiliyor ve isteği
 * tekrarlayarak bunu sınırsız sürdürebiliyordu.
 *
 * Kapatma iki kurala dayanıyor:
 *   1. TUTARI İSTEMCİ SEÇEMEZ — sebep koduna karşılık gelen tutar burada sabit.
 *   2. SINIRSIZ TEKRAR EDİLEMEZ — sebep başına günlük adet sınırı.
 *
 * Bu bir ARA ÇÖZÜMDÜR. Kalıcı çözüm, kazanımın istemci çağrısıyla değil
 * sunucudaki gerçek olayla (randevu tamamlandı, yorum doğrulandı, davet edilen
 * ilk randevusunu bitirdi) tetiklenmesidir — gelir şartnamesi Faz 3.
 */

export interface EarnRule {
  /** Sunucunun vereceği puan. İstemcinin gönderdiği değer YOK SAYILIR. */
  points: number;
  /** Aynı sebeple 24 saat içinde en fazla kaç kez kazanılabilir. */
  dailyLimit: number;
}

/**
 * Yalnız bu sebepler kabul edilir; listede olmayan sebep 400 üretir.
 *
 * DİKKAT — düz nesne kullanılmaz: `EARN_RULES['__proto__']` düz nesnede
 * Object.prototype döndürür ve doğrulama "sebep tanımlı" sanır. `Map` ile
 * arama prototip zincirine bakmaz. (Bu tuzağı testin kendisi yakaladı.)
 */
/**
 * İSTEMCİ BEYANIYLA KAZANILABİLEN SEBEP KALMADI.
 *
 * Kurucu denetimi haklı çıkardı: canlıda "uzman gelmedi" için 1000 puan
 * verilmişti ama o kullanıcının `no_show_uzman` durumunda SIFIR randevusu
 * vardı; "yorum" için 6 ödül vardı ama gerçek yorum sayısı 1'di.
 *
 * Sebep: bu tablo tutarı ve günlük adedi denetliyordu ama OLAYIN OLUP
 * OLMADIĞINI hiç sormuyordu. Sunucu istemcinin beyanına inanıyordu.
 *
 * Kazanım artık `olay-odulleri.ts` içinden, olayın veritabanındaki KANITI
 * okunarak yazılıyor. Tablo BİLEREK BOŞ: `POST /loyalty/earn` hiçbir sebebi
 * kabul etmiyor. Tabloyu silmek yerine boş bırakmak, buraya yeni bir sebep
 * eklemenin neden yanlış olduğunu okunur tutuyor.
 */
export const EARN_RULES = new Map<string, EarnRule>();

/** Ömür boyu yalnız bir kez kazanılabilen sebepler. */
export const ONCE_PER_LIFETIME = new Set<string>();

export function ruleFor(reason: string): EarnRule | undefined {
  return EARN_RULES.get(reason);
}
