import { usePathname } from 'expo-router';
import { FloatingTabBar, type TabDef } from './FloatingTabBar';

// §10 — salon alt barı: Ana Sayfa · Takvim · Kadro · Profil
const TABS: TabDef[] = [
  { route: '/salon/home', name: 'home', icon: 'home', labelKey: 'salon.nav.home' },
  { route: '/salon/agenda', name: 'agenda', icon: 'calendar', labelKey: 'salon.nav.agenda' },
  { route: '/salon/staff', name: 'staff', icon: 'people', labelKey: 'salon.nav.staff' },
  { route: '/salon/profile', name: 'profile', icon: 'business', labelKey: 'salon.nav.profile' },
];

function activeName(pathname: string): string {
  if (pathname.startsWith('/salon/agenda')) return 'agenda';
  if (pathname.startsWith('/salon/staff') || pathname.startsWith('/salon/codes')) return 'staff';
  if (pathname.startsWith('/salon/profile')) return 'profile';
  return 'home';
}

/** §10 — salon alt menüsü. Görünüm müşteri barıyla AYNI bileşenden gelir. */
export function SalonTabBar() {
  const pathname = usePathname();
  return <FloatingTabBar tabs={TABS} active={activeName(pathname)} />;
}
