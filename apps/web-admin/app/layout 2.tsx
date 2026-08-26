import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AYNA Admin',
  description: 'AYNA yönetim ve moderasyon paneli',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
