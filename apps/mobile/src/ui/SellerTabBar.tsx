import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../locale';
import { space } from '../theme';
import { useTheme } from '../theme-context';

type IoniconName = keyof typeof Ionicons.glyphMap;

// MD §9.1 — uzman/salon alt barı: Ana Sayfa/Dashboard · Talepler · Takvim · Profil
const TABS: { route: string; name: string; icon: IoniconName; labelKey: MessageKey }[] = [
  { route: '/seller/reports', name: 'reports', icon: 'home', labelKey: 'seller.nav.home' },
  { route: '/seller/requests', name: 'requests', icon: 'pricetags', labelKey: 'seller.nav.requests' },
  { route: '/seller/agenda', name: 'agenda', icon: 'calendar', labelKey: 'seller.nav.agenda' },
  { route: '/profile', name: 'profile', icon: 'person', labelKey: 'seller.nav.profile' },
];

function activeName(pathname: string): string {
  if (pathname.startsWith('/seller/requests')) return 'requests';
  if (pathname.startsWith('/seller/agenda')) return 'agenda';
  if (pathname.startsWith('/profile')) return 'profile';
  return 'reports';
}

/** §9.1 — satıcı (uzman/salon) modunda görünen alt menü. */
export function SellerTabBar() {
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
  activeTile: { width: 44, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  inactiveTile: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.1 },
});
