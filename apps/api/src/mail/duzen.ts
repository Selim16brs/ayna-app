/**
 * E-POSTA DÜZENİ — AYNA.
 *
 * Parçalar tek tek HTML üretir, şablonlar birleştirir. Sebep biçimsel değil:
 * e-posta istemcileri (özellikle Outlook) modern CSS çalıştırmıyor, her şey
 * TABLO ve SATIR İÇİ stille kuruluyor. Bir kez doğru yazılıp her şablonda
 * kullanılması, her şablonda yeniden hata yapılmasından iyi.
 *
 * Renkler uygulamanın paletiyle AYNI (`theme.palette.ts`). E-posta
 * uygulamanın devamı gibi görünmeli, ayrı bir marka gibi değil.
 */

export const RENK = {
  erik: '#4A1942',
  erikKoyu: '#2D0A2E',
  erikSis: '#F5ECF6',
  zemin: '#FAF7F5',
  yuzey: '#FFFFFF',
  murekkep: '#1E0E1B',
  soluk: '#68536A',
  cizgi: '#EFEBE9',
  altin: '#9A5A05',
  altinSis: '#FDF3E7',
  yesil: '#2F7A4A',
  yesilSis: '#E3F2E8',
  onErik: '#FFF0F5',
} as const;

/**
 * Onest uygulamanın yazı tipi ama e-posta istemcileri web fontu indirmez.
 * Yedek yığın bu yüzden gerçek: okuyanların çoğu sistem yazı tipini görecek.
 */
const YAZI =
  "Onest, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/** Varlıklar API'den servis ediliyor — Gmail `data:` URI'yi siler. */
const varlik = (dosya: string): string =>
  `${process.env.EMAIL_ASSET_URL ?? 'https://api.ayna.salon'}/brand/${dosya}`;

/* ─────────────────────────  METİN  ───────────────────────── */

export const baslik = (metin: string, hiza: 'left' | 'center' = 'left'): string =>
  `<h1 style="margin:0 0 12px;font-family:${YAZI};font-size:25px;line-height:1.22;font-weight:600;color:${RENK.murekkep};text-align:${hiza};letter-spacing:-0.5px">${metin}</h1>`;

/** Başlığın üstündeki küçük büyük-harf etiket — konuyu bir kelimede söyler. */
export const ustEtiket = (metin: string, renk: string = RENK.erik): string =>
  `<div style="margin:0 0 8px;font-family:${YAZI};font-size:11px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase;color:${renk}">${metin}</div>`;

export const paragraf = (metin: string, hiza: 'left' | 'center' = 'left'): string =>
  `<p style="margin:0 0 14px;font-family:${YAZI};font-size:15px;line-height:1.62;color:${RENK.soluk};text-align:${hiza}">${metin}</p>`;

/* ─────────────────────────  BLOKLAR  ───────────────────────── */

/**
 * KOYU ERİK BANT — tek bir rakamı öne çıkarır (tutar, gün sayısı).
 *
 * Ekranda "ekran başına tek koyu öge" kuralı var; e-postada da öyle:
 * bir postada en fazla bir bant. İkisi yan yana gelince ikisi de vurgu
 * olmaktan çıkıyor.
 */
export const rakamBant = (etiket: string, rakam: string, alt?: string): string =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px">
    <tr><td style="background:${RENK.erik};border-radius:18px;padding:22px 24px;text-align:center">
      <div style="font-family:${YAZI};font-size:11px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase;color:rgba(255,240,245,.72)">${etiket}</div>
      <div style="font-family:${YAZI};font-size:34px;line-height:1.15;font-weight:600;color:${RENK.onErik};margin-top:6px;letter-spacing:-0.8px">${rakam}</div>
      ${alt ? `<div style="font-family:${YAZI};font-size:13px;color:rgba(255,240,245,.78);margin-top:6px">${alt}</div>` : ''}
    </td></tr>
  </table>`;

/** Yumuşak kutu — bilgi taşır, vurgu çalmaz. */
export const kutu = (
  baslikMetni: string,
  govde: string,
  ton: 'erik' | 'altin' | 'yesil' = 'erik',
): string => {
  const z = { erik: RENK.erikSis, altin: RENK.altinSis, yesil: RENK.yesilSis }[ton];
  const y = { erik: RENK.erik, altin: RENK.altin, yesil: RENK.yesil }[ton];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px">
    <tr><td style="background:${z};border-radius:16px;padding:16px 18px">
      <div style="font-family:${YAZI};font-size:12px;font-weight:600;letter-spacing:.6px;text-transform:uppercase;color:${y};margin-bottom:5px">${baslikMetni}</div>
      <div style="font-family:${YAZI};font-size:15px;line-height:1.55;color:${RENK.murekkep}">${govde}</div>
    </td></tr>
  </table>`;
};

/** Etiket–değer satırları: randevu künyesi gibi yapılandırılmış bilgi için. */
export const kunye = (satirlar: [string, string][]): string =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border:1px solid ${RENK.cizgi};border-radius:16px">
    ${satirlar
      .map(
        ([e, d], i) =>
          `<tr>
            <td style="padding:13px 18px;font-family:${YAZI};font-size:13px;color:${RENK.soluk};${i ? `border-top:1px solid ${RENK.cizgi}` : ''}">${e}</td>
            <td align="right" style="padding:13px 18px;font-family:${YAZI};font-size:15px;font-weight:600;color:${RENK.murekkep};${i ? `border-top:1px solid ${RENK.cizgi}` : ''}">${d}</td>
          </tr>`,
      )
      .join('')}
  </table>`;

/**
 * Tek birincil eylem. İki düğme tıklamayı bölüyor; ikinci eylem gerekirse
 * metin bağlantısı olarak veriliyor.
 */
export const dugme = (href: string, etiket: string): string =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px">
    <tr><td style="background:${RENK.erik};border-radius:999px">
      <a href="${href}" style="display:inline-block;padding:14px 30px;font-family:${YAZI};font-size:15px;font-weight:600;color:${RENK.onErik};text-decoration:none">${etiket}</a>
    </td></tr>
  </table>`;

/** İkincil eylem — düğme değil, altı çizili bağlantı. */
export const baglanti = (href: string, etiket: string): string =>
  `<p style="margin:0 0 14px;font-family:${YAZI};font-size:14px"><a href="${href}" style="color:${RENK.erik};text-decoration:underline">${etiket}</a></p>`;

export const madde = (maddeler: string[]): string =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px">
    ${maddeler
      .map(
        (m) =>
          `<tr>
            <td width="24" valign="top" style="padding:0 0 10px;font-family:${YAZI};font-size:15px;line-height:1.55;color:${RENK.erik};font-weight:700">•</td>
            <td style="padding:0 0 10px;font-family:${YAZI};font-size:15px;line-height:1.55;color:${RENK.soluk}">${m}</td>
          </tr>`,
      )
      .join('')}
  </table>`;

/** Numaralı adımlar — sıra bilgi taşıdığında (ödeme akışı gibi). */
export const adimlar = (liste: string[]): string =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px">
    ${liste
      .map(
        (m, i) =>
          `<tr>
            <td width="30" valign="top" style="padding:0 0 12px">
              <div style="width:22px;height:22px;border-radius:999px;background:${RENK.erikSis};font-family:${YAZI};font-size:12px;font-weight:600;color:${RENK.erik};text-align:center;line-height:22px">${i + 1}</div>
            </td>
            <td style="padding:1px 0 12px;font-family:${YAZI};font-size:15px;line-height:1.55;color:${RENK.soluk}">${m}</td>
          </tr>`,
      )
      .join('')}
  </table>`;

export interface DuzenGirdi {
  /** Gelen kutusunda konunun altında görünen satır. */
  onizleme: string;
  govde: string;
  /** Abonelikten çıkma bağlantısı — yalnız pazarlama postalarında. */
  cikisUrl?: string | undefined;
  dil: 'tr' | 'kk' | 'ru';
}

const ALT = {
  tr: {
    neden: 'Bu e-postayı AYNA hesabın olduğu için aldın.',
    cik: 'Bu tür e-postaları bırak',
    slogan: 'Güvenle randevu al',
  },
  kk: {
    neden: 'Бұл хатты AYNA аккаунтың болғандықтан алдың.',
    cik: 'Мұндай хаттардан бас тарту',
    slogan: 'Сеніммен жазыл',
  },
  ru: {
    neden: 'Вы получили это письмо, потому что у вас есть аккаунт AYNA.',
    cik: 'Отписаться от таких писем',
    slogan: 'Записывайтесь спокойно',
  },
} as const;

/**
 * Dış kabuk.
 *
 * Başlıkta GERÇEK LOGO var, yazıyla "AYNA" değil. Logo API'den geliyor;
 * görselleri kapalı okuyanlar için `alt` metni marka adını taşıyor.
 *
 * Önizleme satırı gizli bir div: gelen kutusunda konunun yanında görünür,
 * açılınca okunmaz. Olmazsa istemci gövdenin ilk kelimelerini çekiyor ve
 * çoğu zaman "Merhaba" yazıyor — hiçbir şey anlatmayan bir satır.
 */
export function duzen({ onizleme, govde, cikisUrl, dil }: DuzenGirdi): string {
  const alt = ALT[dil];
  return `<!doctype html>
<html lang="${dil}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"></head>
<body style="margin:0;padding:0;background:${RENK.zemin}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${onizleme}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${RENK.zemin};padding:24px 16px 32px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px">

        <tr><td style="background:${RENK.erik};border-radius:22px 22px 0 0;padding:26px 26px 22px;text-align:center">
          <img src="${varlik('ayna-logo-beyaz.png')}" width="132" height="55" alt="AYNA"
               style="display:inline-block;border:0;outline:none;text-decoration:none">
          <div style="font-family:${YAZI};font-size:12px;letter-spacing:1.2px;color:rgba(255,240,245,.7);margin-top:8px">${alt.slogan}</div>
        </td></tr>

        <tr><td style="background:${RENK.yuzey};border:1px solid ${RENK.cizgi};border-top:0;border-radius:0 0 22px 22px;padding:30px 28px">
          ${govde}
        </td></tr>

        <tr><td style="padding:20px 6px 0;text-align:center;font-family:${YAZI};font-size:12px;line-height:1.65;color:${RENK.soluk}">
          ${alt.neden}${cikisUrl ? `<br><a href="${cikisUrl}" style="color:${RENK.erik}">${alt.cik}</a>` : ''}
          <br><br><a href="https://ayna.salon" style="color:${RENK.erik};text-decoration:none;font-weight:600">ayna.salon</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}
