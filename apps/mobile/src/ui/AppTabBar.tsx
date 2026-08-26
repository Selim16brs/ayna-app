import { usePathname } from 'expo-router';
import { useStore } from '../store';
import { FloatingTabBar, type TabDef } from './FloatingTabBar';

// MD §5.0 — sıra ve ikon: Keşfet(pusula) · Randevularım(takvim) · Benim İçin(kalp) · W2W(ikili) · Profil(kişi)
const TABS: TabDef[] = [
  { route: '/discover', name: 'discover', icon: 'compass', labelKey: 'nav.discover' },
  { route: '/bookings', name: 'bookings', icon: 'calendar', labelKey: 'nav.bookings' },
  { route: '/care', name: 'care', icon: 'heart', labelKey: 'nav.care' },
  { route: '/circle', name: 'circle', icon: 'people', labelKey: 'nav.circle' },
  { route: '/profile', name: 'profile', icon: 'person', labelKey: 'nav.profile' },
];

// Kullanıcının EYLEM BEKLEYEN randevusu — nokta yalnız gerçek sinyalle yanar.
const NEEDS_ACTION = ['deposit_pending', 'alternative_proposed', 'completed_pending', 'disputed'];

// Aktif sekme: pathname'e göre (push edilen ekranlar ilgili sekmeye eşlenir)
function activeName(pathname: string): string {
  if (pathname.startsWith('/bookings') || pathname.startsWith('/booking')) return 'bookings';
  if (pathname.startsWith('/circle')) return 'circle';
  if (pathname.startsWith('/care')) return 'care';
  if (pathname.startsWith('/profile')) return 'profile';
  return 'discover';
}

/** Müşteri alt menüsü. Görünüm FloatingTabBar'da — burada yalnız sekme listesi. */
export function AppTabBar() {
  const pathname = usePathname();
  const bookings = useStore((s) => s.bookings);
  const eylemBekleyen = bookings.some((b) => NEEDS_ACTION.includes(b.status));
  const tabs = TABS.map((t) => (t.name === 'bookings' ? { ...t, badge: eylemBekleyen } : t));
  return <FloatingTabBar tabs={tabs} active={activeName(pathname)} />;
}
