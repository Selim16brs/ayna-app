import { useEffect, useRef, useState } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Alert } from 'react-native';
import { fillParams, LocaleProvider, useLocale } from '../src/locale';
import {
  addPushDeepLinkListener,
  addPushReceivedListener,
  registerForRemotePush,
  syncBookingReminders,
} from '../src/notifications';
import { useStore } from '../src/store';
import { acilisKatalogunuEsitle, acilisOlcumuGonder } from '../src/acilis-esitleme';
import { api } from '../src/api';
import { acilisMesajiHazirla } from '../src/acilis-mesaji-kapisi';
import { AcilisMesaji } from '../src/ui/AcilisMesaji';
import { gecerliKatalog, type SplashSonucu } from '@ayna/domain';
import { useBackExit } from '../src/use-back-exit';
import { ThemeProvider, useTheme } from '../src/theme-context';
import {
  AppTabBar,
  ErrorBoundary,
  kurGlobalHataYakalayici,
  NailCursor,
  OfflineBanner,
  SalonTabBar,
  SellerTabBar,
} from '../src/ui';

function ThemedStack() {
  const { colors, isDark } = useTheme();
  const { t, locale } = useLocale();
  const pathname = usePathname();
  // §14 — SEKME KÖKÜ: burada geri tuşu geçmişi boşaltıp uygulamayı UYARISIZ
  // kapatıyordu. Kök yollarda çift dokunuş isteniyor; alt ekranlarda normal
  // geri davranışı bozulmasın diye yalnız bu yollarda aktif.
  const kokYol =
    pathname === '/discover' ||
    pathname === '/bookings' ||
    pathname === '/care' ||
    pathname === '/circle' ||
    pathname === '/profile' ||
    pathname === '/seller/reports' ||
    pathname === '/salon/home';
  useBackExit(kokYol);
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);
  const token = useStore((s) => s.token);
  const bookings = useStore((s) => s.bookings);
  const hydrateBookings = useStore((s) => s.hydrateBookings);
  const hydrateDemands = useStore((s) => s.hydrateDemands);
  const hydrateLoyalty = useStore((s) => s.hydrateLoyalty);
  const hydrateCare = useStore((s) => s.hydrateCare);
  const hydrateAlways = useStore((s) => s.hydrateAlways);
  const hydratePrefs = useStore((s) => s.hydratePrefs);
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
    // §5.2 — açılışta talepler buluttan gelir; SON KAPANIŞTAN BERİ yeni teklif düştüyse pop-up
    void hydrateDemands().then(() => {
      const s = useStore.getState();
      if (!s.token || s.currentUser?.role !== 'user') return;
      const fresh = s.takeNewOffers();
      if (fresh.count > 0)
        Alert.alert(t('newoffers.t'), fillParams(t('newoffers.b'), { n: fresh.count }), [
          { text: t('promo.later'), style: 'cancel' },
          {
            text: t('newoffers.cta'),
            onPress: () =>
              router.push(
                fresh.demandId
                  ? (`/quote/results?id=${fresh.demandId}` as never)
                  : ('/bookings' as never),
              ),
          },
        ]);
    });
    void hydrateLoyalty(); // Faz B — puan/çekiliş/ledger yeniden açılışta da buluttan
    void refreshMembership(); // medya (foto/cutout) + tier açılışta HESAPTAN (bayat yerel kopya ezilir)
    // §bakım — rutin/an/günlük. Bunlar eskiden hiç sunucuya gitmiyordu;
    // yazma tarafını bağlayıp okumayı unutmak, veriyi tek yönlü bırakırdı:
    // yeni cihazda ekran boş açılırdı.
    void hydrateCare();
    // §11 — Always. Okuma bağlanmazsa karşı tarafın gönderdiği istek HİÇ
    // görünmez: kullanıcı "İstekler" sekmesini boş görür ve bağ kurulmaz.
    void hydrateAlways();
    // §tercihler — bildirim/anonim/geri çağırma ayarları. Okuma bağlanmazsa
    // kullanıcı yeni cihazda kapattığı bildirimi geri açılmış bulur.
    void hydratePrefs();
  }, [
    hydrateBookings,
    hydrateDemands,
    hydrateLoyalty,
    refreshMembership,
    hydrateCare,
    hydrateAlways,
  ]);
  // EK Z.5 — giriş yapıldığında (token gelince) Expo push token'ı backend'e kaydet
  useEffect(() => {
    if (token) void registerForRemotePush(token);
  }, [token]);
  // MD_000 §4.2 — uygulama AÇIKKEN push düşerse randevu/talep listeleri anında tazelenir
  useEffect(() => {
    const sub = addPushReceivedListener(() => {
      void hydrateBookings();
      void hydrateDemands();
    });
    return () => sub.remove();
  }, [hydrateBookings, hydrateDemands]);
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
  // Alt bar GLOBAL. Ekranın en altına sabit bir yazma alanı koyan sayfalarda
  // (sohbet, W2W yorum) barın altında kalıyor ve kullanıcı mesaj yazamıyordu.
  // Bu ekranlar zaten yığın (stack) sayfası; kendi geri butonları var.
  const composerScreen = /^\/messages\/[^/]+$/.test(pathname) || /^\/circle\/[^/]+$/.test(pathname);
  const baseHidden =
    !currentUser ||
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/language') ||
    composerScreen;

  /*
   * ── AÇILIŞ MESAJI ────────────────────────────────────────────────────
   *
   * Brief §1: yalnız MÜŞTERİ rolünde, her açılışta bir öncekinden farklı
   * mesaj. Seçim `acilisMesajiHazirla` içinde; burası yalnız ne zaman
   * çizileceğini biliyor.
   *
   * BİR KEZ SEÇİLİYOR: her render'da yeniden seçseydik mesaj ekranda
   * dururken değişirdi. `useState` başlatıcısı bunu bir kereye indiriyor.
   *
   * Uzman/salon oturumunda `null` dönüyor ve ekran HİÇ kurulmuyor.
   */
  const [acilis, setAcilis] = useState<SplashSonucu | null>(null);
  const [acilisBitti, setAcilisBitti] = useState(false);
  const acilisSecildi = useRef(false);
  useEffect(() => {
    if (acilisSecildi.current || !currentUser) return;
    acilisSecildi.current = true;
    const st = useStore.getState();
    // Doğum tarihi profil pasaportunda; hesapta yoksa doğum günü mesajı
    // hiç seçilmiyor (uydurma tarih yok).
    const dogumTarihiMs = (currentUser as { birthDateMs?: number }).birthDateMs ?? null;
    const sonuc = acilisMesajiHazirla({
      rol: currentUser.role,
      dil: locale,
      ad: currentUser.name,
      /*
       * Cinsiyet sunucuda serbest metin (`string`); motor yalnız
       * 'female'ı özel sayıyor (brief §4). Bilinmeyen her değer
       * `neutral` davranıyor — tanımadığımız bir değeri kadın saymak,
       * dişil çekimli mesajı yanlış kişiye göstermek olurdu.
       */
      cinsiyet: currentUser.gender === 'female' ? 'female' : 'other',
      dogumTarihiMs: dogumTarihiMs,
      randevular: st.bookings,
      puan: st.points,
      dahaOnceAcildi: st.sonAcilisMs != null,
      sonAcilisMs: st.sonAcilisMs,
      durum: st.acilisDurumu,
      // Brief §7.1 — uzak katalog varsa o, yoksa cihazdaki paket.
      katalog: gecerliKatalog(st.acilisKatalog),
    });
    st.setSonAcilis(Date.now());
    /*
     * Eşitleme mesaj SEÇİLDİKTEN SONRA başlıyor: indirmeyi beklemek
     * açılışa bekleme eklerdi (brief §6.1). Yeni katalog bir SONRAKİ
     * açılışta devreye giriyor.
     */
    void acilisKatalogunuEsitle(api.splashKatalog, st.acilisKatalog, st.setAcilisKatalog);
    if (!sonuc) return;
    st.setAcilisDurumu(sonuc.durum);
    setAcilis(sonuc);
  }, [currentUser, locale]);

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
      {/* §10 — ÇEVRİMDIŞI BANDI en üstte, her ekranda. */}
      <OfflineBanner />
      {/* Açılış mesajı EN ÜSTTE: geçiş bitene kadar ana sayfayı örtüyor. */}
      {acilis && !acilisBitti ? (
        <AcilisMesaji
          sonuc={acilis}
          hazir={true}
          bitti={(atlandi) => {
            // Brief §7.3 — gösterim + skip oranı. Kişi kimliği gitmiyor.
            acilisOlcumuGonder(api.splashOlcum, acilis.id, locale, atlandi);
            setAcilisBitti(true);
          }}
        />
      ) : null}
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

// §9 — ASYNC ve OLAY İŞLEYİCİSİ hataları hata sınırına DÜŞMEZ. Üretimde
// yakalanmamış bir JS hatası uygulamayı sessizce kapatıyordu; artık
// yakalanıyor ve uygulama ayakta kalıyor. Sentry bağlanınca kayıt buraya
// eklenecek (şimdilik yalnız geliştirmede görünür).
kurGlobalHataYakalayici((e, olumcul) => {
  if (__DEV__) {
    console.error(`[yakalanmamış${olumcul ? ' · ölümcül' : ''}]`, e);
  }
});

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  // Gövde/UI fontu = Onest (tek aile, 56 Kiril dili + TR + ₸). Caveat yalnız dekoratif el yazısı.
  // NOT: font yüklemesini BLOKE ETMİYORUZ — EAS Update/Expo Go'da font asset'i asılı
  // kalırsa uygulama sonsuza kadar beyaz kalıyordu. Uygulama hemen açılır; fontlar
  // yüklenince kendiliğinden yerine oturur (o ana kadar sistem fontuna düşer).
  useFonts({
    'Onest-Regular': require('../assets/fonts/Onest-Regular.ttf'),
    'Onest-Medium': require('../assets/fonts/Onest-Medium.ttf'),
    'Onest-SemiBold': require('../assets/fonts/Onest-SemiBold.ttf'),
    /*
     * Açılış mesajları el yazısı — brief §5.2'nin KRİTİK KISITI: font
     * Türkçe, Rusça Kiril ve KAZAKÇAYA ÖZGÜ Kiril harflerini (ә ғ қ ң ө
     * ұ ү һ і) eksiksiz kapsamalı. Beş aday fontun karakter tablosu tek
     * tek okundu; Marck Script ve Neucha kazak gliflerini taşımıyordu.
     * Pacifico üç alfabeyi de kapsıyor, OFL lisanslı (uygulamaya gömme
     * serbest) ve kurucunun seçimi.
     */
    'Pacifico-Regular': require('../assets/fonts/Pacifico-Regular.ttf'),
    Caveat_700Bold,
  });

  return (
    // §9 — HATA SINIRI EN DIŞTA. Uygulamada hiçbir sınır YOKTU: tek bir render
    // hatası (ör. sunucudan beklenmedik biçimde veri gelmesi) uygulamayı
    // kapatıyordu. Sağlayıcıların DIŞINDA duruyor ki tema/dil sağlayıcısının
    // kendisi patlasa bile kurtarma ekranı çizilebilsin.
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LocaleProvider>
            <ThemedStack />
          </LocaleProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
