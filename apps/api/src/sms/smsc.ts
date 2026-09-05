/**
 * SMSC.kz — SAF PROTOKOL KATMANI.
 *
 * Ağ yok, Nest yok, yan etki yok. Burada yalnız iki şey var: isteğin nasıl
 * kurulduğu ve cevabın nasıl okunduğu. Ağ çağrısı `sms.service` içinde.
 * Böylece protokolün tamamı gerçek SMS göndermeden test edilebiliyor —
 * yoksa her test koşusu para harcardı.
 *
 * Kaynak: https://smsc.kz/api/http/ (send.php).
 *
 * ── NEDEN SADECE SMS, TELEGRAM YOK ──────────────────────────────────────
 *
 * SMSC'de `tg=1` ile Telegram'a doğrulama kodu göndermek SMS'ten ~%10 ucuz.
 * KULLANILMIYOR. Dokümanda Telegram'ı OLMAYAN numara için SMS'e düşüleceğine
 * dair hiçbir söz yok; otomatik yedek yok. Kendi yedeğimizi yazmak da
 * mümkün değil: "gitti" cevabı numaranın Telegram'da olduğunu kanıtlamıyor,
 * yani başarısızlığı GÜVENİLİR ŞEKİLDE anlayamıyoruz.
 *
 * Kurucu: "sistem hiçbir şeyi kendiliğinden uydurmamalı, her şey %100 doğru
 * çalışmalı." Anlayamadığımız bir duruma yedek kuramayız — sonucu, kaydolmaya
 * çalışan ama kod hiç gelmeyen bir kullanıcı olurdu. SMS herkese gider.
 */

/** SMSC'nin gönderim ucu. */
export const SMSC_UC = 'https://smsc.kz/sys/send.php';

/**
 * Yedek sunucu. SMSC'nin kendi dokümanı bunu veriyor; ilk adres ağ
 * seviyesinde düşerse OTP'nin tamamen durmaması için var.
 */
export const SMSC_YEDEK_UC = 'https://www2.smsc.kz/sys/send.php';

export interface SmscKimlik {
  login: string;
  sifre: string;
  /** Kayıtlı gönderen adı. Yoksa SMSC ortak adıyla gönderir. */
  gonderen?: string;
}

/**
 * İstek parametreleri.
 *
 * GET yerine POST gövdesi kullanılıyor: şifre ve TELEFON NUMARASI sorgu
 * dizesinde giderse ara sunucu ve erişim kayıtlarına düşer. Numara kişisel
 * veri (§privacy-by-design), URL'de taşınmaz.
 */
export function istekGovdesi(kimlik: SmscKimlik, telefon: string, mesaj: string): URLSearchParams {
  const p = new URLSearchParams();
  p.set('login', kimlik.login);
  p.set('psw', kimlik.sifre);
  p.set('phones', telefon);
  p.set('mes', mesaj);
  // Kiril metin windows-1251 varsayılanıyla bozulur.
  p.set('charset', 'utf-8');
  // JSON cevap. fmt=0 serbest metin döner ve ayrıştırması kırılgandır.
  p.set('fmt', '3');
  if (kimlik.gonderen) p.set('sender', kimlik.gonderen);
  return p;
}

export type SmscSonuc =
  { ok: true; mesajId: string; parca: number } | { ok: false; kod: number | null; hata: string };

/**
 * SMSC cevabını çözer.
 *
 * Başarı:  {"id": 123, "cnt": 1}
 * Hata:    {"error": "...", "error_code": N}
 *
 * DİKKAT — VARSAYILAN BAŞARISIZLIK. Tanımadığı her cevap hata sayılıyor.
 * Ters tasarım (bilinmeyeni başarı saymak) kullanıcıya "kod gönderildi"
 * deyip hiçbir şey göndermemek demekti.
 */
export function yanitiCoz(ham: unknown): SmscSonuc {
  if (typeof ham !== 'object' || ham === null) {
    return { ok: false, kod: null, hata: 'yanıt okunamadı' };
  }
  const y = ham as Record<string, unknown>;

  // Hata ÖNCE bakılıyor: SMSC hata cevabında da `id` gönderebiliyor
  // (kod 3,6,7,8). Önce `id`ye baksaydık başarısız gönderimi başarı
  // sayardık.
  if (y.error_code !== undefined || y.error !== undefined) {
    const kod = typeof y.error_code === 'number' ? y.error_code : null;
    const hata = typeof y.error === 'string' ? y.error : 'bilinmeyen hata';
    return { ok: false, kod, hata };
  }

  if (y.id !== undefined) {
    const parca = typeof y.cnt === 'number' ? y.cnt : 1;
    return { ok: true, mesajId: String(y.id), parca };
  }

  return { ok: false, kod: null, hata: 'beklenmeyen yanıt' };
}

/**
 * Hata TEKRAR DENEMEYE değer mi?
 *
 * SMSC kodları (doküman): 1 parametre hatası · 2 yanlış login/şifre ·
 * 3 bakiye yetersiz · 4 IP engelli · 5 tarih biçimi · 6 mesaj yasaklı ·
 * 7 numara biçimi · 8 alıcıya iletilemiyor · 9 çok sık istek.
 *
 * Yalnız 9 geçici. Diğerlerinde tekrar denemek aynı hatayı üretir ve
 * bakiye yetersizken (3) döngüye girmek işi büsbütün kötüleştirir.
 */
export function tekrarDenenir(kod: number | null): boolean {
  return kod === 9;
}

/**
 * OTP metni. Kısa ve tek parça.
 *
 * SMSC parça başına ücretlendiriyor: latin 160, KİRİL 70 karakter. Rusça
 * metin 70'i geçerse fatura ikiye katlanır. Üçü de 70'in altında ve
 * `otp-mesaji.test.ts` bunu her koşuda ölçüyor.
 *
 * Marka adı başta: kullanıcı kodun kimden geldiğini görmeden girmemeli
 * (kimlik avına karşı).
 */
export function otpMesaji(kod: string, dil: string): string {
  if (dil === 'ru') return `AYNA: код ${kod}. Никому не сообщайте.`;
  if (dil === 'kk') return `AYNA: коды ${kod}. Ешкімге айтпаңыз.`;
  return `AYNA: kodun ${kod}. Kimseyle paylaşma.`;
}

/**
 * Numarayı SMSC'nin beklediği uluslararası biçime getirir.
 *
 * `normalizePhone` yalnız rakam dışını atıyor; Kazakistan'da bu yetmiyor
 * çünkü insanlar numarayı ÜÇ FARKLI ŞEKİLDE yazıyor:
 *
 *   8 777 123 45 67   → 87771234567   (yerel alışkanlık, Sovyet mirası)
 *   777 123 45 67     → 7771234567    (ülke kodsuz)
 *   +7 777 123 45 67  → 77771234567   (uluslararası)
 *
 * Üçü de AYNI telefon. Ham hâlleriyle gönderilirse ilk ikisi başka bir
 * numaraya gider ya da reddedilir — kod hiç ulaşmaz.
 *
 * KZ mobil: ülke kodu 7, ardından 7 ile başlayan 10 hane.
 *
 * `+` İŞARETİ BİLEREK: SMSC "+"suz numaraları kendi tahminiyle düzeltiyor.
 * KZ numarasını burada zaten doğru kurduk, üstüne bir de tahmin
 * istemiyoruz. Tanımadığımız (yabancı) numarada ise "+" KOYMUYORUZ —
 * kendi bilmediğimiz bir biçimi doğruymuş gibi mühürlemektense SMSC'nin
 * düzeltmesine izin vermek daha az hatalı.
 */
export function telefonuBicimle(ham: string): string {
  const rakam = (ham ?? '').replace(/[^0-9]/g, '');

  /*
   * ULUSLARARASI BİÇİM ARTIK GÜVENİLİR — "+" korunuyor.
   *
   * Aşağıdaki "tanımadığımız numaraya + koymuyoruz" kuralı, numaranın
   * doğruluğundan emin olunamadığı için yazılmıştı: SMSC'nin tahmini,
   * bizim yanlış mühürlememizden iyiydi.
   *
   * O belirsizlik kalktı: `auth.dto` artık telefonu E.164 olarak DOĞRULUYOR
   * (`+` + ülke kodu + numara), yani buraya ulaşan "+"lı numara geçerliliği
   * ölçülmüş bir numaradır. Ülke seçici de 11 ülkeden 245'e çıktı — Türkiye,
   * Kırgızistan, Almanya numaraları artık "+"sız gidip sağlayıcının Kazak
   * numarası sanmasına bırakılamaz.
   *
   * KZ numaraları bu daldan da doğru çıkıyor: "+77771234567" → "+77771234567".
   */
  if ((ham ?? '').trim().startsWith('+') && rakam.length >= 8) return `+${rakam}`;

  // 8XXXXXXXXXX → 7XXXXXXXXXX (yerel "8" ülke kodu yerine geçiyor)
  if (rakam.length === 11 && rakam.startsWith('8') && rakam[1] === '7') {
    return `+7${rakam.slice(1)}`;
  }
  // 7XXXXXXXXX (ülke kodsuz 10 hane) → başına 7
  if (rakam.length === 10 && rakam.startsWith('7')) {
    return `+7${rakam}`;
  }
  // 77XXXXXXXXX — zaten tam.
  if (rakam.length === 11 && rakam.startsWith('77')) {
    return `+${rakam}`;
  }
  // Tanımadığımız biçim: dokunmuyoruz, SMSC düzeltsin.
  return rakam;
}

/**
 * Biçimlenmiş numara ULUSLARARASI olarak gönderilebilir mi?
 *
 * ── BU KONTROL BİR SESSİZ HATADAN DOĞDU ────────────────────────────────
 *
 * `telefonuBicimle` yalnız Kazakistan numaralarını tanıyor; tanımadığını
 * OLDUĞU GİBİ geçiriyor (bilerek — yabancı bir numarayı yanlış biçime
 * zorlamaktansa sağlayıcının düzeltmesine bırakmak daha az hatalı).
 *
 * Ama "olduğu gibi geçir" ile "gönderilebilir" aynı şey değildi. Kurucu
 * telefon değişikliğinde numarayı ÜLKE KODSUZ yazdı ("0555…"); numara
 * sağlayıcıya öylece gitti, Mobizon "uluslararası biçime uymuyor" diye
 * reddetti ve kullanıcıya yalnızca "kod gönderilemedi" göründü. Ne yanlış
 * yaptığını anlamasının yolu yoktu.
 *
 * Artık ağa çıkmadan önce burada duruyor ve çağıran taraf kullanıcıya
 * "numarayı ülke koduyla yaz" diyebiliyor.
 *
 * KURAL — E.164:
 *   · Ülke kodu dahil 10–15 hane.
 *   · BAŞTA SIFIR OLAMAZ. Sıfır ulusal önek ("0555…", "08…"); uluslararası
 *     biçimde asla bulunmaz ve tam olarak bu hatayı üretiyordu.
 */
export function numaraGecerliMi(bicimli: string): boolean {
  const d = (bicimli ?? '').replace(/[^0-9]/g, '');
  if (d.length < 10 || d.length > 15) return false;
  if (d.startsWith('0')) return false;
  return true;
}
