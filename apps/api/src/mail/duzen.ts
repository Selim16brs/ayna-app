/**
 * E-POSTA DÜZENİ — AYNA.
 *
 * Buradaki parçalar tek tek HTML üretir; şablonlar onları birleştirir.
 * Sebebi biçimsel değil: e-posta istemcileri (özellikle Outlook) modern CSS'i
 * çalıştırmıyor, bu yüzden her şey TABLO ve SATIR İÇİ stille kuruluyor.
 * Bir kez doğru yazılıp her şablonda yeniden kullanılması, her şablonda
 * yeniden hata yapılmasından iyi.
 *
 * Renkler uygulamanın paletiyle AYNI (`theme.palette.ts`): erik #4A1942,
 * porselen zemin #FAF7F5, mürekkep #1E0E1B. E-posta uygulamanın devamı gibi
 * görünmeli; ayrı bir marka gibi değil.
 */

export const RENK = {
  erik: '#4A1942',
  erikSis: '#F5ECF6',
  zemin: '#FAF7F5',
  yuzey: '#FFFFFF',
  murekkep: '#1E0E1B',
  soluk: '#68536A',
  cizgi: '#EFEBE9',
  altin: '#9A5A05',
  onErik: '#FFF0F5',
} as const;

/**
 * Onest uygulamanın yazı tipi ama e-posta istemcileri web fontu çoğunlukla
 * indirmez. Yedek yığın bu yüzden gerçek: okuyanların çoğu sistem yazı
 * tipini görecek ve satır yükseklikleri ona göre ayarlı.
 */
const YAZI =
  "Onest, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export const baslik = (metin: string, hiza: 'left' | 'center' = 'left'): string =>
  `<h1 style="margin:0 0 12px;font-family:${YAZI};font-size:24px;line-height:1.25;font-weight:600;color:${RENK.murekkep};text-align:${hiza};letter-spacing:-0.4px">${metin}</h1>`;

export const paragraf = (metin: string, hiza: 'left' | 'center' = 'left'): string =>
  `<p style="margin:0 0 14px;font-family:${YAZI};font-size:15px;line-height:1.6;color:${RENK.soluk};text-align:${hiza}">${metin}</p>`;

/** Vurgulu kutu — tek bir bilgiyi öne çıkarır (tutar, tarih, kod). */
export const kutu = (baslikMetni: string, govde: string): string =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px">
    <tr><td style="background:${RENK.erikSis};border-radius:16px;padding:16px 18px">
      <div style="font-family:${YAZI};font-size:13px;font-weight:600;color:${RENK.erik};margin-bottom:4px">${baslikMetni}</div>
      <div style="font-family:${YAZI};font-size:15px;line-height:1.55;color:${RENK.murekkep}">${govde}</div>
    </td></tr>
  </table>`;

/**
 * Tek birincil eylem. E-postada iki düğme koymak tıklama oranını bölüyor;
 * ikinci eylem gerekiyorsa metin bağlantısı olarak veriliyor.
 */
export const dugme = (href: string, etiket: string): string =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px">
    <tr><td style="background:${RENK.erik};border-radius:999px">
      <a href="${href}" style="display:inline-block;padding:13px 26px;font-family:${YAZI};font-size:15px;font-weight:600;color:${RENK.onErik};text-decoration:none">${etiket}</a>
    </td></tr>
  </table>`;

export const madde = (maddeler: string[]): string =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px">
    ${maddeler
      .map(
        (m) =>
          `<tr><td style="padding:0 0 8px;font-family:${YAZI};font-size:15px;line-height:1.55;color:${RENK.soluk}">
            <span style="color:${RENK.erik};font-weight:600">•</span>&nbsp;&nbsp;${m}</td></tr>`,
      )
      .join('')}
  </table>`;

export interface DuzenGirdi {
  /** Gelen kutusunda konunun altında görünen satır. Boş bırakılırsa istemci gövdenin başını çeker. */
  onizleme: string;
  govde: string;
  /** Alt bilgideki abonelikten çıkma bağlantısı — pazarlama postalarında ZORUNLU. */
  cikisUrl?: string | undefined;
  dil: 'tr' | 'kk' | 'ru';
}

const ALT_METIN = {
  tr: {
    neden: 'Bu e-postayı AYNA hesabın olduğu için aldın.',
    cik: 'Bu tür e-postaları bırak',
    hak: 'AYNA · Kazakistan',
  },
  kk: {
    neden: 'Бұл хатты AYNA аккаунтың болғандықтан алдың.',
    cik: 'Мұндай хаттардан бас тарту',
    hak: 'AYNA · Қазақстан',
  },
  ru: {
    neden: 'Вы получили это письмо, потому что у вас есть аккаунт AYNA.',
    cik: 'Отписаться от таких писем',
    hak: 'AYNA · Казахстан',
  },
} as const;

/**
 * Dış kabuk.
 *
 * Önizleme satırı gizli bir div: gelen kutusunda konunun yanında görünür ama
 * açılınca okunmaz. Olmadığında istemci gövdenin ilk kelimelerini çekiyor ve
 * çoğu zaman "Merhaba" yazıyor — hiçbir şey anlatmayan bir satır.
 */
export function duzen({ onizleme, govde, cikisUrl, dil }: DuzenGirdi): string {
  const alt = ALT_METIN[dil];
  return `<!doctype html>
<html lang="${dil}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"></head>
<body style="margin:0;padding:0;background:${RENK.zemin}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${onizleme}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${RENK.zemin};padding:28px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
        <tr><td style="padding:0 0 20px">
          <span style="font-family:${YAZI};font-size:19px;font-weight:600;letter-spacing:2px;color:${RENK.murekkep}">AYNA</span>
        </td></tr>
        <tr><td style="background:${RENK.yuzey};border:1px solid ${RENK.cizgi};border-radius:20px;padding:28px 26px">
          ${govde}
        </td></tr>
        <tr><td style="padding:18px 4px 0;font-family:${YAZI};font-size:12px;line-height:1.6;color:${RENK.soluk}">
          ${alt.neden}${cikisUrl ? ` <a href="${cikisUrl}" style="color:${RENK.erik}">${alt.cik}</a>.` : ''}
          <br>${alt.hak} · <a href="https://ayna.salon" style="color:${RENK.erik}">ayna.salon</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
