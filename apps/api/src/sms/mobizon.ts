/**
 * MOBIZON.kz — SAF PROTOKOL KATMANI.
 *
 * `smsc.ts` ile aynı düzen: ağ yok, Nest yok, yan etki yok. Yalnız isteğin
 * nasıl kurulduğu ve cevabın nasıl okunduğu.
 *
 * Kaynak: https://mobizon.kz/help/api-docs/message
 *
 * ── NEDEN İKİNCİ BİR SAĞLAYICI ──────────────────────────────────────────
 *
 * Tek sağlayıcıya bağlı kalmak, o sağlayıcı bir gün çalışmadığında kayıt
 * akışının tamamen durması demek. Sağlayıcı artık `SMS_PROVIDER` ile
 * seçiliyor; ikisi de aynı `SmsService` arkasında.
 *
 * SMSC'den İKİ FARKI, ikisi de bizim lehimize:
 *   · Kimlik doğrulama API ANAHTARIYLA. SMSC hesap şifresini her istekte
 *     gönderiyordu — sızarsa panele de girilirdi. Anahtar iptal edilebilir.
 *   · Fiyat her operatörde daha düşük (Kcell 16.60 ₸ vs 19.60 ₸ ortak ad).
 */

export const MOBIZON_UC = 'https://api.mobizon.kz/service/message/sendSmsMessage';

export interface MobizonKimlik {
  anahtar: string;
  /** Kayıtlı gönderen adı. Yoksa hesabın varsayılanı / servis ortak adı. */
  gonderen?: string;
}

/**
 * Sorgu dizesi — Mobizon anahtarı ve biçimi BURADA istiyor.
 *
 * `apiKey` sorgu dizesinde gitmek zorunda (dokümanın kendi örneği böyle).
 * Buna karşılık ALICI NUMARASI ve METİN gövdede: numara kişisel veri,
 * URL'de giderse ara sunucu kayıtlarına düşerdi (§privacy-by-design).
 */
export function istekUcu(kimlik: MobizonKimlik): string {
  const q = new URLSearchParams({ output: 'json', api: 'v1', apiKey: kimlik.anahtar });
  return `${MOBIZON_UC}?${q.toString()}`;
}

/**
 * Gövde parametreleri.
 *
 * `validity` — mesaj teslim edilemezse ne kadar bekletileceği. Dokümanın
 * izin verdiği EN KISA süre olan 60 dakika seçiliyor: OTP zaten 5 dakikada
 * doluyor, telefonu kapalı birine 24 saat sonra ÖLÜ BİR KOD teslim etmenin
 * anlamı yok — kullanıcı geçersiz kodu girip şaşırırdı.
 */
export function istekGovdesi(
  kimlik: MobizonKimlik,
  telefon: string,
  mesaj: string,
): URLSearchParams {
  const p = new URLSearchParams();
  p.set('recipient', telefon);
  p.set('text', mesaj);
  if (kimlik.gonderen) p.set('from', kimlik.gonderen);
  p.set('params[validity]', '60');
  return p;
}

/**
 * Numarayı Mobizon'un istediği biçime getirir: YALNIZ RAKAM, "+" YOK.
 *
 * Doküman açık: "Номер должен быть в международном формате и содержать
 * только цифры". `telefonuBicimle` "+7…" üretiyor — buradaki "+" olduğu
 * gibi gönderilse istek reddedilirdi.
 */
export function numarayiSadelestir(bicimli: string): string {
  return bicimli.replace(/[^0-9]/g, '');
}

export type MobizonSonuc =
  { ok: true; mesajId: string; parca: number } | { ok: false; kod: number | null; hata: string };

/**
 * Mobizon cevabını çözer.
 *
 * Zarf her istekte aynı: `{code, data, message}`. `code === 0` başarı;
 * başka her değer hata (1 doğrulama · 2 kayıt yok · 3 uygulama hatası ·
 * 4/5/6 yanlış modül/metot/biçim · 8 giriş hatası · 9 erişim hatası).
 *
 * DİKKAT — VARSAYILAN BAŞARISIZLIK. `smsc.ts` ile aynı kural: tanımadığı
 * her cevap hata sayılıyor. Bilinmeyeni başarı saymak, hiçbir şey
 * göndermeden "kod gönderildi" demek olurdu.
 */
export function yanitiCoz(ham: unknown): MobizonSonuc {
  if (typeof ham !== 'object' || ham === null) {
    return { ok: false, kod: null, hata: 'yanıt okunamadı' };
  }
  const y = ham as Record<string, unknown>;

  if (y.code !== 0) {
    const kod = typeof y.code === 'number' ? y.code : null;
    /*
     * AYRINTI `data` İÇİNDE. Doküman: "В поле data представлена информация
     * о том, какие поля заполнены неверно."
     *
     * İlk sürümde yalnız `message` okunuyordu ve `message` genel bir cümle
     * ("bir veya birden fazla alan hatalı"). Sonuç: kurucunun telefon
     * değişikliği sessizce düştü, kayıtta HANGİ alanın hatalı olduğu
     * yazmıyordu ve sebebi bulmak için elle API'ye istek atmak gerekti.
     * Artık alan adı ve açıklaması kayda giriyor.
     */
    const ayrinti =
      typeof y.data === 'object' && y.data !== null
        ? Object.entries(y.data as Record<string, unknown>)
            .map(([alan, aciklama]) => `${alan}: ${String(aciklama)}`)
            .join(' | ')
        : '';
    const genel = typeof y.message === 'string' && y.message ? y.message : 'bilinmeyen hata';
    return { ok: false, kod, hata: ayrinti || genel };
  }

  const d = (typeof y.data === 'object' && y.data !== null ? y.data : {}) as Record<
    string,
    unknown
  >;
  if (d.messageId === undefined) {
    // code=0 ama mesaj kimliği yok: teslim edilebilir bir şey üretilmemiş.
    return { ok: false, kod: null, hata: 'mesaj kimliği dönmedi' };
  }
  // Mobizon parça sayısını gönderim yanıtında vermiyor (yalnız durum
  // sorgusunda). Uydurmuyoruz: 1 yazıp geçmek yerine 0 = "bilinmiyor".
  return { ok: true, mesajId: String(d.messageId), parca: 0 };
}

/**
 * Hata TEKRAR DENEMEYE değer mi?
 *
 * Yalnız 3 (tanımlanmamış uygulama hatası) geçici olabilir. 1/4/5/6 bizim
 * isteğimiz bozuk demek — tekrarı aynı sonucu verir. 8/9 kimlik/yetki:
 * tekrar denemek anahtarı boşuna yakar.
 */
export function tekrarDenenir(kod: number | null): boolean {
  return kod === 3;
}
