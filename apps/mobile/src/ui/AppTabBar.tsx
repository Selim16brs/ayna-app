import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../locale';
import { space } from '../theme';
import { useTheme } from '../theme-context';

type IoniconName = keyof typeof Ionicons.glyphMap;

const TABS: { route: string; name: string; icon: IoniconName; labelKey: MessageKey }[] = [
  { route: '/discover', name: 'discover', icon: 'compass', labelKey: 'nav.discover' },
  { route: '/bookings', name: 'bookings', icon: 'calendar', labelKey: 'nav.bookings' },
  { route: '/circle', name: 'circle', icon: 'people', labelKey: 'nav.circle' },
  { route: '/care', name: 'care', icon: 'heart', labelKey: 'nav.care' },
  { route: '/profile', name: 'profile', icon: 'person', labelKey: 'nav.profile' },
];

// İçeriğin alt bar altında kalmaması için ekranların ayırması gereken boşluk
export const TAB_BAR_CLEARANCE = 92;

// Aktif sekme: pathname'e göre (push edilen ekranlar ilgili sekmeye eşlenir)
function activeName(pathname: string): string {
  if (pathname.startsWith('/bookings') || pathname.startsWith('/booking')) return 'bookings';
  if (pathname.startsWith('/circle')) return 'circle';
  if (pathname.startsWith('/care')) return 'care';
  if (pathname.startsWith('/profile')) return 'profile';
  return 'discover';
}

/** Tüm içerik ekranlarında görünen global alt menü (yüzen koyu bar + etiketli sekmeler). */
export function AppTabBar() {
  const { colors, isDark } = useTheme();
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const barBg = isDark ? colors.surfaceMuted : '#201C1B';
  const active = activeName(pathname);

  return (
    <View
      style={[styles.wrap, { paddingBottom: insets.bottom || space(1.5) }]}
      pointerEvents="box-none"
    >
      <View style={[styles.bar, { backgroundColor: barBg }]}>
        {TABS.map((tab) => {
          const focused = tab.name === active;
          const icon = (focused ? tab.icon : `${tab.icon}-outline`) as IoniconName;
          return (
            <Pressable
              key={tab.name}
              onPress={() => router.navigate(tab.route as never)}
              style={styles.item}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={t(tab.labelKey)}
            >
              {focused ? (
                <View style={[styles.activeTile, { backgroundColor: colors.accent }]}>
                  <Ionicons name={icon} size={22} color={colors.onAccent} />
                </View>
              ) : (
                <View style={styles.inactiveTile}>
                  <Ionicons name={icon} size={22} color="rgba(255,255,255,0.6)" />
                </View>
              )}
              <Text
                numberOfLines={1}
                style={[styles.label, { color: focused ? '#FFFFFF' : 'rgba(255,255,255,0.55)' }]}
              >
                {t(tab.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space(2),
    paddingTop: space(1.5),
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 32,
    height: 74,
    paddingHorizontal: space(1),
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  activeTile: {
    width: 44,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveTile: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.1 },
});
