import { usePathname } from 'expo-router';
import { FloatingTabBar, type TabDef } from './FloatingTabBar';

// §9.1 — uzman/salon alt barı: Ana Sayfa · Menü · Kayıt ekle · Profil
const TABS: TabDef[] = [
  { route: '/seller/reports', name: 'reports', icon: 'home', labelKey: 'seller.nav.home' },
  { route: '/seller/menu', name: 'menu', icon: 'grid', labelKey: 'seller.nav.menu' },
  { route: '/seller/offline', name: 'offline', icon: 'add-circle', labelKey: 'seller.nav.offline' },
  { route: '/profile', name: 'profile', icon: 'person', labelKey: 'seller.nav.profile' },
];

function activeName(pathname: string): string {
  if (pathname.startsWith('/seller/menu')) return 'menu';
  if (pathname.startsWith('/seller/offline')) return 'offline';
  if (pathname.startsWith('/profile')) return 'profile';
  return 'reports';
}

/** §9.1 — satıcı alt menüsü. Görünüm müşteri barıyla AYNI bileşenden gelir. */
export function SellerTabBar() {
  const pathname = usePathname();
  return <FloatingTabBar tabs={TABS} active={activeName(pathname)} />;
}
