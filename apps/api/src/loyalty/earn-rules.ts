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
export const EARN_RULES = new Map<string, EarnRule>(
  Object.entries({
    // Uzman gelmedi telafisi — nadir olay, günde birden fazlası şüphelidir.
    'rewards.earn.provider_noshow': { points: 1000, dailyLimit: 2 },
    // Doğrulanmış yorum — tamamlanmış randevu başına bir yorum yazılabilir.
    'rewards.earn.review': { points: 40, dailyLimit: 5 },
    // İlk randevu ödülü — ömür boyu bir kez; günlük 1 + aşağıdaki lifetime kontrolü.
    'rewards.earn.first_booking': { points: 300, dailyLimit: 1 },
    // W2W katkısı — mikro kazanım; şartname "sınırlı W2W katkısı" diyor.
    'rewards.earn.w2w_like': { points: 1, dailyLimit: 20 },
  }),
);

/** Ömür boyu yalnız bir kez kazanılabilen sebepler. */
export const ONCE_PER_LIFETIME = new Set(['rewards.earn.first_booking']);

export function ruleFor(reason: string): EarnRule | undefined {
  return EARN_RULES.get(reason);
}
