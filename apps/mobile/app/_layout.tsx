import { useEffect, useState } from 'react';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts, DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import { LocaleProvider } from '../src/locale';
import { useStore } from '../src/store';
import { ThemeProvider, useTheme } from '../src/theme-context';
import { AppTabBar, NailCursor } from '../src/ui';

function ThemedStack() {
  const { colors, isDark } = useTheme();
  const pathname = usePathname();
  const currentUser = useStore((s) => s.currentUser);
  const hydrateBookings = useStore((s) => s.hydrateBookings);
  const loadContent = useStore((s) => s.loadContent);
  const checkReminders = useStore((s) => s.checkReminders);
  const expireDemands = useStore((s) => s.expireDemands);
  const expireDeposits = useStore((s) => s.expireDeposits);
  useEffect(() => {
    void hydrateBookings();
  }, [hydrateBookings]);
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
  }, [checkReminders, expireDemands, expireDeposits, pathname]);

  // Alt bar her içerik ekranında; giriş/onboarding/satıcı akışında gizli
  const hideTabBar =
    !currentUser ||
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/language') ||
    pathname.startsWith('/seller');

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
      {hideTabBar ? null : <AppTabBar />}
    </>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  // Font yüklenmezse (hata) uygulama BEYAZ ekranda kalmasın — hata olsa da devam et,
  // el yazısı font sistem fontuna düşer.
  const [fontsLoaded, fontError] = useFonts({ DancingScript_700Bold });

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
