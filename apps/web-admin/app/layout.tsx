import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

/**
 * PANEL YAZI TİPİ.
 *
 * Kurucu: "modern premium bir admin sayfası."
 *
 * Sistem yazı tipi (San Francisco / Segoe) panelin "hazır şablon" hissinin
 * yarısıydı: her yerde aynı görünüyor ve markaya ait bir izlenim bırakmıyor.
 * Plus Jakarta Sans küçük punto tablolarda okunaklı, rakamları dar ve
 * başlıklarda sıkı harf aralığıyla karakterli duruyor.
 *
 * `next/font` KENDİ SUNUCUMUZDAN veriyor: dışarıdan istek yok, panel
 * açılırken yazı tipi bekletmesi (FOUT) yaşanmıyor.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-ui',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AYNA Admin',
  description: 'AYNA yönetim ve moderasyon paneli',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
