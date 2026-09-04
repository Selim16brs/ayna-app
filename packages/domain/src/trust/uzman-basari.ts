/**
 * UZMAN BAŞARI YÜZDESİ.
 *
 * Kurucu: "uzman ve salon puan toplayamaz. uzmanlar aldıkları onaylanıp
 * hizmet verilmiş rezervasyon sayısı, değerlendirme notu başarısı, cevap
 * verme süresi ve bunun gibi başarı durumlarına göre yüzde üzerinden
 * değerlendirilir."
 *
 * ── VERİ YOKSA YÜZDE DE YOK ─────────────────────────────────────────────
 *
 * Hiç randevusu olmayan yeni bir uzmana "%0 başarı" yazmak, kötü
 * çalıştığını söylemek olurdu — oysa henüz çalışmamış. Ölçülemeyen
 * bileşen hesaba KATILMIYOR; hiçbiri ölçülemiyorsa sonuç `null` ve ekran
 * yüzde yerine "henüz veri yok" yazıyor.
 *
 * ── AĞIRLIKLAR ──────────────────────────────────────────────────────────
 *
 * Tamamlanan iş en ağırı (%40): müşterinin gerçekten hizmet aldığı tek
 * kanıt. Değerlendirme (%35) ikinci: iş yapılmış ama nasıl yapıldığını o
 * söylüyor. Cevap süresi (%25): müşterinin ilk temasta yaşadığı deneyim.
 */

export interface BasariGirdisi {
  /** Onaylanıp HİZMET VERİLMİŞ randevu sayısı. */
  tamamlanan: number;
  /** Uzmana gelen toplam talep (tamamlanan + kaçırılan + reddedilen). */
  gelenTalep: number;
  /** Ortalama değerlendirme (1–5); değerlendirme yoksa null. */
  puanOrt: number | null;
  /** Talebe ortalama cevap dakikası; hiç cevaplamadıysa null. */
  cevapDk: number | null;
}

export interface BasariSonucu {
  /** 0–100; hiçbir bileşen ölçülemiyorsa null. */
  yuzde: number | null;
  /** Hesaba giren bileşenler — ekran neyin ölçüldüğünü yazabilsin. */
  bilesenler: { ad: 'is' | 'puan' | 'cevap'; yuzde: number }[];
}

/** Cevap süresi eşiği: bu sürede dönen uzman tam puan alıyor. */
export const HIZLI_CEVAP_DK = 30;
/** Bu süreden yavaş cevap sıfır sayılıyor. */
export const YAVAS_CEVAP_DK = 180;

const kirp = (x: number) => Math.max(0, Math.min(1, x));

export function uzmanBasarisi(g: BasariGirdisi): BasariSonucu {
  const bilesenler: { ad: 'is' | 'puan' | 'cevap'; yuzde: number; agirlik: number }[] = [];

  /*
   * İŞ BAŞARISI = tamamlanan / gelen talep.
   *
   * Ham "tamamlanan sayısı" kullanmak büyük salonu her zaman üste
   * çıkarırdı; oran, gelen işi ne kadar sonuca ulaştırdığını söylüyor.
   * Hiç talep gelmemişse ölçülemiyor.
   */
  if (g.gelenTalep > 0) {
    bilesenler.push({ ad: 'is', yuzde: kirp(g.tamamlanan / g.gelenTalep) * 100, agirlik: 40 });
  }

  /*
   * DEĞERLENDİRME 1–5 → 0–100. 1 yıldız taban: 5 üzerinden 1 almak
   * "sıfır başarı" değil, en düşük not.
   */
  if (g.puanOrt !== null) {
    bilesenler.push({ ad: 'puan', yuzde: kirp((g.puanOrt - 1) / 4) * 100, agirlik: 35 });
  }

  /*
   * CEVAP SÜRESİ: 30 dk ve altı tam, 180 dk ve üstü sıfır, arası doğrusal.
   */
  if (g.cevapDk !== null) {
    const oran =
      g.cevapDk <= HIZLI_CEVAP_DK
        ? 1
        : g.cevapDk >= YAVAS_CEVAP_DK
          ? 0
          : 1 - (g.cevapDk - HIZLI_CEVAP_DK) / (YAVAS_CEVAP_DK - HIZLI_CEVAP_DK);
    bilesenler.push({ ad: 'cevap', yuzde: kirp(oran) * 100, agirlik: 25 });
  }

  if (bilesenler.length === 0) return { yuzde: null, bilesenler: [] };

  /*
   * AĞIRLIKLAR ÖLÇÜLEBİLENLER ARASINDA PAYLAŞTIRILIYOR.
   *
   * Eksik bileşeni 0 saymak, henüz değerlendirilmemiş bir uzmanı
   * cezalandırırdı: puanı olmayan biri en fazla %65 alabilirdi.
   */
  const toplamAgirlik = bilesenler.reduce((n, b) => n + b.agirlik, 0);
  const yuzde = bilesenler.reduce((n, b) => n + b.yuzde * b.agirlik, 0) / toplamAgirlik;
  return {
    yuzde: Math.round(yuzde),
    bilesenler: bilesenler.map((b) => ({ ad: b.ad, yuzde: Math.round(b.yuzde) })),
  };
}
