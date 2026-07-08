import { useEffect, useState } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { LocaleProvider, useLocale } from '../src/locale';
import {
  addPushDeepLinkListener,
  registerForRemotePush,
  syncBookingReminders,
} from '../src/notifications';
import { useStore } from '../src/store';
import { ThemeProvider, useTheme } from '../src/theme-context';
import { AppTabBar, NailCursor, SalonTabBar, SellerTabBar } from '../src/ui';

function ThemedStack() {
  const { colors, isDark } = useTheme();
  const { t, locale } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);
  const token = useStore((s) => s.token);
  const bookings = useStore((s) => s.bookings);
  const hydrateBookings = useStore((s) => s.hydrateBookings);
  const hydrateDemands = useStore((s) => s.hydrateDemands);
  const hydrateLoyalty = useStore((s) => s.hydrateLoyalty);
  const refreshMembership = useStore((s) => s.refreshMembership);
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
    void hydrateDemands(); // §5.2 Faz A — taleplerim + gelen teklifler buluttan
    void hydrateLoyalty(); // Faz B — puan/çekiliş/ledger yeniden açılışta da buluttan
    void refreshMembership(); // medya (foto/cutout) + tier açılışta HESAPTAN (bayat yerel kopya ezilir)
  }, [hydrateBookings, hydrateDemands, hydrateLoyalty, refreshMembership]);
  // EK Z.5 — giriş yapıldığında (token gelince) Expo push token'ı backend'e kaydet
  useEffect(() => {
    if (token) void registerForRemotePush(token);
  }, [token]);
  // EK Z.5 — push bildirimine dokunma → DEEP-LINK (doğrudan ilgili ekrana)
  useEffect(() => {
    const sub = addPushDeepLinkListener((route) => router.push(route as never));
    return () => sub.remove();
  }, [router]);
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
  }, [
    checkReminders,
    expireDemands,
    expireDeposits,
    expireResponses,
    pruneNotifications,
    runAutoReengage,
    applyApprovedProfileChanges,
    locale,
    pathname,
  ]);

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
  // Gövde/UI fontu = SF (sistem, RN varsayılanı). Caveat yalnız dekoratif el yazısı.
  // NOT: font yüklemesini BLOKE ETMİYORUZ — EAS Update/Expo Go'da font asset'i asılı
  // kalırsa uygulama sonsuza kadar beyaz kalıyordu. Uygulama hemen açılır; Caveat
  // yüklenince kendiliğinden yerine oturur (o ana kadar sistem fontuna düşer).
  useFonts({ Caveat_700Bold });

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
