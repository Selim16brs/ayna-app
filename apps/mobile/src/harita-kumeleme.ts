/**
 * HARİTA KÜMELEME — aynı adreste duran sağlayıcılar.
 *
 * Kurucu: "eğer birden fazla uzman salon ile aynı lokasyonu girdiyse
 * salon olarak görünsün haritada ama üzerine basılınca o salona bağlı
 * uzmanlar görünsün."
 *
 * Önceden her sağlayıcı ayrı bir iğneydi: aynı salonda çalışan beş uzman
 * beş iğne demek, hepsi üst üste. Kullanıcı ne kaç işletme olduğunu
 * anlıyor ne de birine basabiliyordu — üstteki iğne diğerlerini örtüyor.
 *
 * ── AYNI KONUM NE DEMEK ─────────────────────────────────────────────────
 *
 * Koordinatlar birebir eşit olmuyor: aynı binayı haritada işaretleyen iki
 * kişi birkaç metre kayık iğne bırakıyor. ~11 m'lik bir ızgaraya
 * yuvarlanıyor (4 ondalık ≈ 11 m). Daha kaba bir ızgara komşu binaları
 * birleştirir, daha ince olan aynı binayı ayırırdı.
 */

export interface KumelenebilirSaglayici {
  id: string;
  kind: string;
  lat?: number | null;
  lng?: number | null;
}

export interface HaritaKumesi<T extends KumelenebilirSaglayici> {
  /** İğnenin temsilcisi — varsa SALON, yoksa ilk sağlayıcı. */
  bas: T;
  /** Temsilcinin altındaki diğerleri (temsilci hariç). */
  digerleri: T[];
  lat: number;
  lng: number;
}

/** ~11 m ızgara. */
const IZGARA = 1e4;
const anahtar = (lat: number, lng: number) =>
  `${Math.round(lat * IZGARA)}:${Math.round(lng * IZGARA)}`;

export function haritaKumeleri<T extends KumelenebilirSaglayici>(
  saglayicilar: readonly T[],
): HaritaKumesi<T>[] {
  const gruplar = new Map<string, T[]>();
  for (const p of saglayicilar) {
    if (p.lat == null || p.lng == null) continue;
    const k = anahtar(p.lat, p.lng);
    const g = gruplar.get(k);
    if (g) g.push(p);
    else gruplar.set(k, [p]);
  }
  const out: HaritaKumesi<T>[] = [];
  for (const grup of gruplar.values()) {
    /*
     * SALON TEMSİL EDİYOR. Aynı adreste salon da uzman da varsa iğne
     * salonun: müşteri o adreste bir işletme olduğunu görmeli, orada
     * çalışan bir kişiyi değil.
     *
     * Salon yoksa (bağımsız uzmanlar aynı binada) ilk uzman temsil
     * ediyor; diğerleri yine altında listeleniyor.
     */
    const salon = grup.find((p) => p.kind === 'salon');
    const bas = salon ?? grup[0]!;
    out.push({
      bas,
      digerleri: grup.filter((p) => p.id !== bas.id),
      lat: bas.lat!,
      lng: bas.lng!,
    });
  }
  return out;
}
