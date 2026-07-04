import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../locale';
import { space } from '../theme';
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

// İçeriğin alt bar altında kalmaması için ekranların ayırması gereken boşluk
export const TAB_BAR_CLEARANCE = 88;

// Aktif sekme foreground'u: marka lime'ının beyazda okunur koyu tonu (aynı hue ailesi)
const ACTIVE = '#6F8C1B';

// Aktif sekme: pathname'e göre (push edilen ekranlar ilgili sekmeye eşlenir)
function activeName(pathname: string): string {
  if (pathname.startsWith('/bookings') || pathname.startsWith('/booking')) return 'bookings';
  if (pathname.startsWith('/circle')) return 'circle';
  if (pathname.startsWith('/care')) return 'care';
  if (pathname.startsWith('/profile')) return 'profile';
  return 'discover';
}

/** Global alt menü — VELOURA stili: düz beyaz bar, outline ikon + etiket, aktif yeşil. */
export function AppTabBar() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const active = activeName(pathname);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          paddingBottom: (insets.bottom || space(1.5)) + space(0.5),
        },
      ]}
    >
      {TABS.map((tab) => {
        const focused = tab.name === active;
        const icon = (focused ? tab.icon : `${tab.icon}-outline`) as IoniconName;
        const color = focused ? ACTIVE : colors.muted;
        return (
          <Pressable
            key={tab.name}
            onPress={() => router.navigate(tab.route as never)}
            style={styles.item}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={t(tab.labelKey)}
          >
            <Ionicons name={icon} size={24} color={color} />
            <Text
              numberOfLines={1}
              style={[styles.label, { color, fontWeight: focused ? '700' : '500' }]}
            >
              {t(tab.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: space(1.25),
    paddingHorizontal: space(1),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontSize: 11, letterSpacing: 0.1 },
});
