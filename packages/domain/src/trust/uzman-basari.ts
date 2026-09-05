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
 *
 * Cevap süresi tek başına yüzde ÜRETMEZ (aşağıda `isKaniti`): hızlı dönmek
 * işin iyi yapıldığının kanıtı değildir.
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

/**
 * İŞ BAŞARISI İÇİN EN AZ TALEP.
 *
 * Tek talep bir ölçü değil. Yeni kayıt olan uzmana bir talep gelip henüz
 * cevaplamadığında oran 0/1 = %0 çıkıyordu ve müşteri onu "başarısız"
 * diye görüyordu — oysa daha ilk işi. Canlıda görülen durum tam buydu.
 *
 * Bu eşiğin altında iş bileşeni ÖLÇÜLEMİYOR sayılıyor: ağırlığı diğer
 * bileşenlere dağılıyor, hiçbiri yoksa yüzde `null` ve ekranda rozet hiç
 * çizilmiyor. Modülün en baştaki kuralı zaten buydu; tek talep onu
 * deliyordu.
 */
export const EN_AZ_TALEP = 3;

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
   * `EN_AZ_TALEP`ten az talep gelmişse ölçülemiyor — tek talep bir
   * başarı ölçüsü değil.
   */
  if (g.gelenTalep >= EN_AZ_TALEP) {
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
   * ── CEVAP SÜRESİ TEK BAŞINA BAŞARI DEĞİLDİR ─────────────────────────────
   *
   * Canlıda görülen: hiç işi tamamlanmamış, hiç değerlendirilmemiş bir
   * uzmanın kartında yeşil "↗ %100 başarı" rozeti. Sebep, tek ölçülebilen
   * bileşenin cevap süresi olması: ağırlıklar ölçülebilenler arasında
   * paylaştırıldığı için %25'lik bileşen tek başına kalınca %100 oluyordu.
   *
   * Bir talebe hızlı dönmek, İŞİN İYİ YAPILDIĞININ kanıtı değil. Müşteri o
   * rozeti "aldığı işlerin %100'ü iyi gitmiş" diye okuyor — oysa uzmanın
   * henüz tamamlanmış tek işi yok. Kurucunun kuralı net: sistem hiçbir şeyi
   * kendiliğinden uydurmaz.
   *
   * Bu yüzden yüzde için İŞ KANITI şart: ya yeterli talep üzerinden iş
   * oranı, ya da en az bir değerlendirme. İkisi de yoksa cevap süresi
   * hesaba giriyor ama TEK BAŞINA yüzde üretmiyor — rozet hiç çizilmiyor.
   */
  const isKaniti = bilesenler.some((b) => b.ad === 'is' || b.ad === 'puan');
  if (!isKaniti) return { yuzde: null, bilesenler: [] };

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
