/**
 * TAKVİM MANTIĞI — SAF, NATIVE MODÜLSÜZ.
 *
 * ── NEDEN YAZILDI ───────────────────────────────────────────────────────
 *
 * Kurucu: "takvim asılı kalmış hiçbir değişiklik yapılamıyor... aynı hatalar
 * diğer takvimle giriş yapılan yerlerde de var."
 *
 * Ekranlarda tarih 1 Oca 1970'te (epoch sıfır) donuyor ve dokunmaya yanıt
 * vermiyordu. Sebep tek bir ekranda değil ORTAK KATMANDAYDI: hepsi
 * `@react-native-community/datetimepicker` kullanıyor ve o NATIVE bir modül.
 *
 * `app.json`da `runtimeVersion: sdkVersion` var — yani OTA güncellemeleri
 * AYNI SDK'lı ESKİ yapılara da iniyor. Telefondaki yapı bu modülü
 * içermediğinde JS onu çağırıyor, native taraf yok, görünüm sıfır tarihle
 * boş çiziliyor ve dokunuş hiçbir yere gitmiyor. OTA bunu ÇÖZEMEZ: native
 * modül ancak yeni bir yapı ile gelir, TestFlight yapıları ise şu an
 * başarısız.
 *
 * Bu yüzden takvim saf React Native'e taşındı. Hiçbir native modüle
 * bağlı değil; kurucunun elindeki yapıda OTA ile hemen çalışıyor ve
 * ileride de bu sınıf hatayı üretemez.
 *
 * Bu dosya yalnız MANTIK: çizim `ui/TakvimSecici`de. Ayrı olmasının sebebi
 * mantığın JSX'siz test edilebilmesi (`bolge-adi`, `telefon-bicim` kalıbı).
 */

/** Pazartesi ile başlayan gün kısaltmaları. */
export const GUN_KISA = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'] as const;

export const AY_ADI = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const;

/** Günü yerel gün başına indirger — saat karşılaştırmayı bozmasın. */
export function gunBasi(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** İki tarih AYNI GÜN mü? */
export function ayniGun(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Bir ayın takvim ızgarası: 6 satır × 7 gün.
 *
 * Izgara HER ZAMAN 42 hücre: ay değişince satır sayısı oynarsa altındaki
 * düğmeler zıplıyor ve kullanıcı yanlış yere basıyor.
 *
 * Komşu ayların günleri `ayIcinde: false` ile dönüyor — boş bırakmak
 * haftanın hangi güne denk geldiğini okumayı zorlaştırıyor.
 */
export function ayIzgarasi(yil: number, ay: number): { tarih: Date; ayIcinde: boolean }[] {
  const ilk = new Date(yil, ay, 1);
  // getDay(): 0 = Pazar. Izgara Pazartesi ile başlıyor.
  const kaydir = (ilk.getDay() + 6) % 7;
  const bas = new Date(yil, ay, 1 - kaydir);
  return Array.from({ length: 42 }, (_, i) => {
    const t = new Date(bas.getFullYear(), bas.getMonth(), bas.getDate() + i);
    return { tarih: t, ayIcinde: t.getMonth() === ay };
  });
}

/** Seçilebilir mi? Sınırlar GÜN bazında karşılaştırılıyor. */
export function secilebilir(t: Date, enAz?: Date, enCok?: Date): boolean {
  const g = gunBasi(t).getTime();
  if (enAz && g < gunBasi(enAz).getTime()) return false;
  if (enCok && g > gunBasi(enCok).getTime()) return false;
  return true;
}

/** Ay ekler/çıkarır. Ayın günü taşarsa ayın son gününe sabitlenir. */
export function ayEkle(d: Date, adet: number): Date {
  const hedef = new Date(d.getFullYear(), d.getMonth() + adet, 1);
  const sonGun = new Date(hedef.getFullYear(), hedef.getMonth() + 1, 0).getDate();
  // 31 Mart'tan bir ay geri gidince 31 Şubat olmaz; 28/29'a iniyor.
  return new Date(hedef.getFullYear(), hedef.getMonth(), Math.min(d.getDate(), sonGun));
}

/** Tarihin gün/saatini koruyarak yeni saat-dakika uygular. */
export function saatUygula(gun: Date, saat: number, dakika: number): Date {
  return new Date(gun.getFullYear(), gun.getMonth(), gun.getDate(), saat, dakika, 0, 0);
}

/** "3 Eylül 2026" / "3 Eylül 2026 · 14:30" */
export function tarihYaz(d: Date, saatliMi: boolean): string {
  const g = `${d.getDate()} ${AY_ADI[d.getMonth()]} ${d.getFullYear()}`;
  if (!saatliMi) return g;
  const ss = String(d.getHours()).padStart(2, '0');
  const dd = String(d.getMinutes()).padStart(2, '0');
  return `${g} · ${ss}:${dd}`;
}

/** Saat seçenekleri (0..23). */
export const SAATLER = Array.from({ length: 24 }, (_, i) => i);
/**
 * Dakika seçenekleri — BEŞER.
 *
 * Kurucu: "saat için klasik sistem bir şey yapsan." Klasik çevirmeli
 * seçicide kaydırmak zaten ucuz; çeyrek saate kısmak burada gereksiz bir
 * kısıtlamaya dönüşüyordu (13:10'a randevu yazılamıyordu).
 */
export const DAKIKALAR = Array.from({ length: 12 }, (_, i) => i * 5);

/**
 * Verilen dakikayı çarkın SEÇENEKLERİNDEN en yakınına oturtur.
 *
 * "Şimdi" 19:24 iken listede 24 yok: çark 00'ı işaretliyor ama özet
 * "19:24" yazıyordu — ekranda iki farklı değer görünüyordu. Beraberlikte
 * BÜYÜK olan seçiliyor (geçmişe değil ileriye yuvarla).
 */
export function enYakinDakika(dakika: number): number {
  let en = DAKIKALAR[0]!;
  for (const m of DAKIKALAR) {
    if (Math.abs(m - dakika) <= Math.abs(en - dakika)) en = m;
  }
  return en;
}

/**
 * Bir değerin çark içindeki sırası. Bulunamazsa 0 —
 * çark boş açılmasın.
 */
export function carkSirasi(liste: readonly number[], deger: number): number {
  const i = liste.indexOf(deger);
  return i >= 0 ? i : 0;
}

/**
 * Kaydırma konumundan seçilen sıra.
 *
 * Sınırlara KIRPILIYOR: hızlı savurmada taşan konum listenin dışına
 * çıkıp `undefined` üretiyor ve saat "NaN" oluyordu.
 */
export function carkSecimi(kaydirma: number, ogeYuksekligi: number, adet: number): number {
  const ham = Math.round(kaydirma / ogeYuksekligi);
  return Math.max(0, Math.min(adet - 1, ham));
}

/**
 * SEÇİLEBİLİR YILLAR — takvimin yıl listesi.
 *
 * Kurucu: "1970'de doğan birisi için yıl seçmek çok zor oluyor." Ok
 * tuşlarıyla ay ay geriye gitmek 1970 için 660'tan fazla dokunuş demek.
 * Başlığa basınca doğrudan yıl/ay seçimi açılıyor ve liste buradan
 * geliyor.
 *
 * Sınır verilmemişse pencere GÖRÜNEN yıla göre kuruluyor, "bugüne" göre
 * değil: doğum tarihi için geriye 120 yıl açık olmalı, randevu için ise
 * `enAz`/`enCok` zaten daraltıyor.
 */
export function secilebilirYillar(gorunenYil: number, enAz?: Date, enCok?: Date): number[] {
  const alt = enAz ? enAz.getFullYear() : Math.min(gorunenYil, new Date().getFullYear()) - 120;
  const ust = enCok ? enCok.getFullYear() : Math.max(gorunenYil, new Date().getFullYear()) + 5;
  if (ust < alt) return [gorunenYil];
  const out: number[] = [];
  for (let y = alt; y <= ust; y++) out.push(y);
  return out;
}

/**
 * O yılda bu ay seçilebilir mi? (Ay içinde EN AZ BİR gün sınırlar içinde.)
 *
 * Ayın 1'ini sınamak yetmiyor: `enAz` 15 Mart ise Mart ayının tamamı
 * kapalı görünür, oysa 15–31 Mart seçilebilir.
 */
export function ayAcikMi(yil: number, ay: number, enAz?: Date, enCok?: Date): boolean {
  const ilk = new Date(yil, ay, 1);
  const son = new Date(yil, ay + 1, 0);
  return secilebilir(son, enAz, enCok) || secilebilir(ilk, enAz, enCok);
}

/**
 * Yıl/ay seçilince gösterilecek tarih — GÜN KORUNUYOR ama taşmıyor.
 *
 * 31 Ocak'tayken Şubat seçilirse 31 Şubat olmaz: ayın son gününe iniyor.
 * Sınırların dışına düşerse en yakın sınıra çekiliyor.
 */
export function yilAyUygula(
  mevcut: Date,
  yil: number,
  ay: number,
  enAz?: Date,
  enCok?: Date,
): Date {
  const sonGun = new Date(yil, ay + 1, 0).getDate();
  const hedef = new Date(yil, ay, Math.min(mevcut.getDate(), sonGun));
  if (enAz && hedef < gunBasi(enAz)) return new Date(enAz);
  if (enCok && gunBasi(hedef) > gunBasi(enCok)) return new Date(enCok);
  return hedef;
}
