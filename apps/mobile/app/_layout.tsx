import { useEffect, useState } from 'react';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { LocaleProvider, useLocale } from '../src/locale';
import { syncBookingReminders } from '../src/notifications';
import { useStore } from '../src/store';
import { ThemeProvider, useTheme } from '../src/theme-context';
import { AppTabBar, NailCursor, SalonTabBar, SellerTabBar } from '../src/ui';

function ThemedStack() {
  const { colors, isDark } = useTheme();
  const { t, locale } = useLocale();
  const pathname = usePathname();
  const currentUser = useStore((s) => s.currentUser);
  const bookings = useStore((s) => s.bookings);
  const hydrateBookings = useStore((s) => s.hydrateBookings);
  const loadContent = useStore((s) => s.loadContent);
  const checkReminders = useStore((s) => s.checkReminders);
  const expireDemands = useStore((s) => s.expireDemands);
  const expireDeposits = useStore((s) => s.expireDeposits);
  const expireResponses = useStore((s) => s.expireResponses);
  const pruneNotifications = useStore((s) => s.pruneNotifications);
  const runAutoReengage = useStore((s) => s.runAutoReengage);
  const applyApprovedProfileChanges = useStore((s) => s.applyApprovedProfileChanges);
  useEffect(() => {
    void hydrateBookings();
  }, [hydrateBookings]);
  // §4.1 — onaylı randevular için 24s/2s YEREL OS bildirimi planla (randevu listesi değişince eşitle)
  useEffect(() => {
    void syncBookingReminders(bookings, t);
  }, [bookings, t]);
  // §12.6/§12.10 — blog + haftalık tema + segmentine uyan toplu duyurular.
  // currentUser değişince tekrar çağrılır ki giriş sonrası duyurular da düşsün.
  useEffect(() => {
    void loadContent();
  }, [loadContent, currentUser]);
  // §4.1/§4.3/§5.2 — her gezinmede: hatırlatmalar + süresi dolan talepler + dekont süresi (mock scheduler)
  useEffect(() => {
    checkReminders();
    expireDemands();
    expireDeposits();
    expireResponses(); // §4.1.3 — uzman yanıt süresi dolan talepleri düşür
    pruneNotifications(); // §5.7 — 30 günden eski bildirimleri temizle
    runAutoReengage(locale); // §11 — premium uzmanda periyodu dolan müşterilere otomatik geri çağırma
    void applyApprovedProfileChanges(); // §profil-onay — admin onayladıysa salon/uzman değişikliğini uygula
  }, [checkReminders, expireDemands, expireDeposits, expireResponses, pruneNotifications, runAutoReengage, applyApprovedProfileChanges, locale, pathname]);

  // §9/§10 — panel giriş ROLÜNE göre AYRI: salon → SalonTabBar, uzman → SellerTabBar. Müşteri modu kaldırıldı.
  const role = currentUser?.role;
  const isSalon = role === 'salon';
  const isExpert = role === 'professional';
  const baseHidden =
    !currentUser ||
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/language');

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NailCursor>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        />
      </NailCursor>
      {baseHidden ? null : isSalon ? (
        <SalonTabBar />
      ) : isExpert ? (
        <SellerTabBar />
      ) : pathname.startsWith('/seller') || pathname.startsWith('/salon') ? null : (
        <AppTabBar />
      )}
    </>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  // Gövde/UI fontu = SF (sistem, RN varsayılanı — fontFamily verilmez). Sadece Caveat el yazısı yüklenir.
  // Font yüklenmezse (hata) uygulama BEYAZ ekranda kalmasın — hata olsa da devam et.
  const [fontsLoaded, fontError] = useFonts({
    Caveat_700Bold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LocaleProvider>
          <ThemedStack />
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
