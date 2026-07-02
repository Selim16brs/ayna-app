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
  useEffect(() => {
    void hydrateBookings();
  }, [hydrateBookings]);

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
  const [fontsLoaded] = useFonts({ DancingScript_700Bold });

  if (!fontsLoaded) return null;

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
