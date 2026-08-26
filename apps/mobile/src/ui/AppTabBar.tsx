import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../locale';
import { useStore } from '../store';
import { font, space } from '../theme';
import { useTheme } from '../theme-context';

type IoniconName = keyof typeof Ionicons.glyphMap;

// MD §5.0 — sıra ve ikon: Keşfet(pusula) · Randevularım(takvim) · Benim İçin(kalp) · W2W(ikili kişi) · Profil(kişi)
const TABS: { route: string; name: string; icon: IoniconName; labelKey: MessageKey }[] = [
  { route: '/discover', name: 'discover', icon: 'compass', labelKey: 'nav.discover' },
  { route: '/bookings', name: 'bookings', icon: 'calendar', labelKey: 'nav.bookings' },
  { route: '/care', name: 'care', icon: 'heart', labelKey: 'nav.care' },
  { route: '/circle', name: 'circle', icon: 'people', labelKey: 'nav.circle' },
  { route: '/profile', name: 'profile', icon: 'person', labelKey: 'nav.profile' },
];

// Kanvas ölçüleri (Main.dc.html §"kademeli bulanıklık + yüzen nav")
const PILL_H = 68; // yüzen barın yüksekliği
const PILL_SIDE = 16; // ekran kenarından boşluk
const PILL_BOTTOM = 26; // güvenli alan yoksa alttan boşluk
const FADE_H = 130; // içeriğin bara eridiği geçiş yüksekliği

// İçeriğin yüzen barın altında kalmaması için ekranların ayırması gereken boşluk.
// Bar artık ekrana yapışık değil, yukarıda duruyor → eskisinden fazla.
export const TAB_BAR_CLEARANCE = PILL_BOTTOM + PILL_H + 20;

// Aktif sekme: pathname'e göre (push edilen ekranlar ilgili sekmeye eşlenir)
function activeName(pathname: string): string {
  if (pathname.startsWith('/bookings') || pathname.startsWith('/booking')) return 'bookings';
  if (pathname.startsWith('/circle')) return 'circle';
  if (pathname.startsWith('/care')) return 'care';
  if (pathname.startsWith('/profile')) return 'profile';
  return 'discover';
}

// Kullanıcının EYLEM BEKLEYEN randevusu var mı — nokta yalnız gerçek sinyalle
// yanar. Anlamı olmayan bir rozet, hiç rozet olmamasından kötüdür.
const NEEDS_ACTION = ['deposit_pending', 'alternative_proposed', 'completed_pending', 'disputed'];

/**
 * Global alt menü — kanvas Main.dc.html §"yüzen nav".
 *
 * Önceki sürüm düz, opak, kenardan kenara beyaz bir bardı (kodun kendi yorumu
 * "VELOURA stili: düz beyaz bar" diyordu) ve kanvasla ilgisi yoktu. Her ekranda
 * görünen tek öğe olduğu için uygulamanın "eski" hissettiren en büyük parçasıydı.
 *
 * Kanvas: koyu YÜZEN hap; aktif sekme gül rengi hap içinde ikon + etiket,
 * pasifler yalnız ikon. Barın üstünde içeriğin eridiği kademeli geçiş.
 */
export function AppTabBar() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const active = activeName(pathname);
  const bookings = useStore((s) => s.bookings);
  const eylemBekleyen = bookings.some((b) => NEEDS_ACTION.includes(b.status));

  const bottom = Math.max(insets.bottom, PILL_BOTTOM - 10) + 10;

  return (
    <View
      style={[styles.wrap, { height: bottom + PILL_H + FADE_H * 0.4 }]}
      pointerEvents="box-none"
    >
      {/* Kademeli geçiş: içerik bara doğru eriyor, altında kesilmiş gibi durmuyor */}
      <View style={styles.fade} pointerEvents="none">
        <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['rgba(251,248,246,0)', 'rgba(251,248,246,0.72)', colors.bg]}
          locations={[0, 0.62, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={[styles.pill, { backgroundColor: colors.ink, bottom }]}>
        {TABS.map((tab) => {
          const focused = tab.name === active;
          const icon = (focused ? tab.icon : `${tab.icon}-outline`) as IoniconName;
          return (
            <Pressable
              key={tab.name}
              onPress={() => router.navigate(tab.route as never)}
              style={focused ? styles.itemOn : styles.item}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={t(tab.labelKey)}
            >
              {focused ? (
                <View style={[styles.activePill, { backgroundColor: colors.rose }]}>
                  <Ionicons name={icon} size={19} color={colors.onAccent} />
                  <Text
                    numberOfLines={1}
                    allowFontScaling={false}
                    style={[styles.activeLabel, { color: colors.onAccent }]}
                  >
                    {t(tab.labelKey)}
                  </Text>
                </View>
              ) : (
                <>
                  <Ionicons name={icon} size={22} color="rgba(251,248,246,0.66)" />
                  {tab.name === 'bookings' && eylemBekleyen ? (
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: colors.rose, borderColor: colors.ink },
                      ]}
                    />
                  ) : null}
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: FADE_H },
  pill: {
    position: 'absolute',
    left: PILL_SIDE,
    right: PILL_SIDE,
    height: PILL_H,
    borderRadius: 36,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space(1),
    // Kanvas: içeriden ince aydınlık çizgi + geniş yumuşak gölge
    shadowColor: '#262219',
    shadowOpacity: 0.32,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', height: PILL_H },
  itemOn: { alignItems: 'center', justifyContent: 'center', height: PILL_H },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
    height: 50,
    paddingHorizontal: space(2.25),
    borderRadius: 25,
  },
  activeLabel: { fontSize: 16, fontFamily: font.semibold },
  dot: {
    position: 'absolute',
    top: 16,
    right: '30%',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
});
