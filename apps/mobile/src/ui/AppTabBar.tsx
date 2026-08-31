import { usePathname } from 'expo-router';
import { birincilAksiyon } from '../booking-flow';
import type { BookingStatus } from '../data';
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

/**
 * Kullanıcının EYLEM BEKLEYEN randevusu var mı? — nokta yalnız gerçek sinyalle yanar.
 *
 * Cevap `birincilAksiyon`dan türetiliyor: kartta bir düğme varsa sekmede de
 * nokta olmalı, yoksa olmamalı. Burada eskiden elle yazılmış bir durum listesi
 * vardı ve brief §3 sözlüğü değiştiğinde listedeki adların HİÇBİRİ artık var
 * olmadığı için nokta sessizce hiç yanmıyordu.
 *
 * Değerlendirme dışarıda: 7 gün açık kalan isteğe bağlı bir davet, bekleyen
 * iş değil — noktayı bir hafta yanık bırakmak sinyali değersizleştirirdi.
 */
function eylemBekliyorMu(status: BookingStatus): boolean {
  if (status === 'tamamlandi' || status === 'degerlendirme') return false;
  return birincilAksiyon(status, 'musteri') !== null;
}

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
  const eylemBekleyen = bookings.some((b) => eylemBekliyorMu(b.status));
  const tabs = TABS.map((t) => (t.name === 'bookings' ? { ...t, badge: eylemBekleyen } : t));
  return <FloatingTabBar tabs={tabs} active={activeName(pathname)} />;
}
