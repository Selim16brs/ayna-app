/**
 * ŞİFRE KURALI — `AYNA` kayıt akışı.
 *
 * Kurucu: "şifre oluştururken en az 1 büyük harf, rakam isteyelim. bunu
 * şifre altında belirtelim kullanıcıya. şu andaki kayıtlı olanlar kalsın
 * ama bundan sonrakilerde dikkat edelim."
 *
 * ── SADECE YENİ ŞİFRELERDE ──────────────────────────────────────────────
 *
 * Kural KAYIT ve ŞİFRE DEĞİŞTİRME yollarında uygulanıyor; GİRİŞTE
 * uygulanmıyor. Girişte de dayatsaydık, kuralı karşılamayan eski
 * şifreyle kayıtlı herkes bir gecede uygulamadan kilitlenirdi.
 *
 * ── NEDEN BURADA ────────────────────────────────────────────────────────
 *
 * Aynı kural iki yerde lazım: sunucu (tek gerçek kapı) ve uygulama
 * (kullanıcıya anında geri bildirim). İki kopya zamanla ayrışır ve
 * kullanıcı "şifrem uygun" diyen bir ekrandan reddedilirdi.
 */

export const SIFRE_ASGARI_UZUNLUK = 6;

export interface SifreDurumu {
  uzunlukTamam: boolean;
  buyukHarfVar: boolean;
  rakamVar: boolean;
  gecerli: boolean;
}

/**
 * BÜYÜK HARF ÜÇ ALFABEDE.
 *
 * `/[A-Z]/` yazsaydım Kiril ve Türkçe büyük harfler sayılmazdı: "Şifre"
 * kelimesindeki Ş ya da "Пароль"deki П büyük harf değilmiş gibi
 * davranılır ve kullanıcı kuralı karşıladığı hâlde reddedilirdi.
 * Karşılaştırma harfin kendi büyük/küçük hâline bakıyor.
 */
function buyukHarfMi(ch: string): boolean {
  return ch !== ch.toLowerCase() && ch === ch.toUpperCase();
}

export function sifreDurumu(sifre: string): SifreDurumu {
  const uzunlukTamam = sifre.length >= SIFRE_ASGARI_UZUNLUK;
  const buyukHarfVar = [...sifre].some(buyukHarfMi);
  const rakamVar = /\d/.test(sifre);
  return {
    uzunlukTamam,
    buyukHarfVar,
    rakamVar,
    gecerli: uzunlukTamam && buyukHarfVar && rakamVar,
  };
}

export const sifreGecerli = (sifre: string): boolean => sifreDurumu(sifre).gecerli;
