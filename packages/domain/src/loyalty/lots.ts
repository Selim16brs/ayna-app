/**
 * Para puan defteri — FIFO parti (lot) motoru.
 *
 * NEDEN: defter append-only ve düz. Bir harcama kaydı, hangi kazanımdan
 * düşüldüğünü taşımıyor. Eski `computeAvailableBalance` bu yüzden yalnızca
 * "süresi dolmuş kazanımı toplama katma" diyordu — ve harcama kayıtlarını her
 * zaman düştüğü için bakiye EKSİYE düşebiliyordu:
 *
 *     earn +100 (T'de dolar), spend -100  →  T sonrası bakiye = -100
 *
 * Motor bunun yerine kazanımları PARTİ olarak tutar ve harcamayı partilerden
 * düşer. Böylece harcanmış bir puan sonradan "yanamaz" — çünkü zaten yok.
 *
 * Tüketim sırası: **önce süresi en yakın parti.** Kullanıcının lehine olan sıra
 * budur; aksi hâlde yeni puan harcanır, eski puan yanardı.
 *
 * Saf fonksiyon: tarih üretmez, I/O yapmaz. `at` çağıran tarafından verilir.
 */

export type LotRow = {
  /** earn pozitif, spend negatif. */
  readonly points: number;
  /** Yalnız kazanımda dolu; harcamada null. */
  readonly expiresAt: Date | null;
  readonly createdAt: Date;
};

export type Lot = {
  readonly remaining: number;
  readonly expiresAt: Date | null;
  readonly createdAt: Date;
};

export type LedgerState = {
  /** Şu an harcanabilir puan. Asla negatif olmaz. */
  readonly available: number;
  /** Bugüne kadar süresi dolduğu için yanan toplam puan. */
  readonly expired: number;
  /** Toplam kazanılan (seviye hesabı için; harcama bunu düşürmez). */
  readonly lifetimeEarned: number;
  /** Canlı partiler, süresi en yakın önce. */
  readonly lots: readonly Lot[];
  /** En yakın sona erme anı (canlı parti yoksa null). */
  readonly nextExpiry: Date | null;
  /**
   * Defterde harcama, o an var olan partiden fazlaysa oluşan fark.
   * Sıfırdan büyükse veri tutarsızdır — çağıran taraf bunu log'a yazmalı.
   */
  readonly overspent: number;
};

/** Süresi en yakın önce; eşitse önce kazanılan önce. Süresizler en sona. */
function lotOrder(a: Lot, b: Lot): number {
  const ea = a.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const eb = b.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY;
  if (ea !== eb) return ea - eb;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

/**
 * Defteri kronolojik olarak yeniden oynatır ve `at` anındaki durumu döner.
 *
 * Bir harcama, o harcamanın YAPILDIĞI anda süresi dolmuş partilerden düşülemez —
 * o puanlar zaten yanmıştı. Bu yüzden yanma her harcamadan önce uygulanır.
 */
export function replayLedger(rows: readonly LotRow[], at: Date): LedgerState {
  const sirali = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  let lots: Lot[] = [];
  let expired = 0;
  let lifetimeEarned = 0;
  let overspent = 0;

  // Verilen ana kadar süresi dolan partileri yak.
  const yak = (an: Date) => {
    const kalan: Lot[] = [];
    for (const l of lots) {
      if (l.expiresAt && l.expiresAt.getTime() <= an.getTime()) expired += l.remaining;
      else kalan.push(l);
    }
    lots = kalan;
  };

  for (const r of sirali) {
    if (r.points > 0) {
      lifetimeEarned += r.points;
      lots.push({ remaining: r.points, expiresAt: r.expiresAt, createdAt: r.createdAt });
      continue;
    }
    if (r.points === 0) continue;

    yak(r.createdAt);
    let ihtiyac = -r.points;
    lots.sort(lotOrder);
    for (const l of lots) {
      if (ihtiyac <= 0) break;
      const dus = Math.min(l.remaining, ihtiyac);
      (l as { remaining: number }).remaining -= dus;
      ihtiyac -= dus;
    }
    lots = lots.filter((l) => l.remaining > 0);
    if (ihtiyac > 0) overspent += ihtiyac;
  }

  yak(at);
  lots.sort(lotOrder);

  return {
    available: lots.reduce((s, l) => s + l.remaining, 0),
    expired,
    lifetimeEarned,
    lots,
    nextExpiry: lots.find((l) => l.expiresAt)?.expiresAt ?? null,
    overspent,
  };
}

/** `at` ile `at + gun` arasında yanacak puan toplamı ("puanların yanmasın" uyarısı). */
export function expiringWithin(state: LedgerState, at: Date, gun: number): number {
  const sinir = at.getTime() + gun * 86_400_000;
  return state.lots
    .filter((l) => l.expiresAt && l.expiresAt.getTime() <= sinir)
    .reduce((s, l) => s + l.remaining, 0);
}
