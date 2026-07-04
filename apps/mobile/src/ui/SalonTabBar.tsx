import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../locale';
import { space } from '../theme';
import { useTheme } from '../theme-context';

type IoniconName = keyof typeof Ionicons.glyphMap;

// §10 — SALON alt barı (uzmandan AYRI): kadro-merkezli yönetim navigasyonu.
// Ana Sayfa (kadro dashboard) · Takvim (uzman-sütunlu) · Kadro (uzman yönetimi) · Profil (salon-seviyesi).
const TABS: { route: string; name: string; icon: IoniconName; labelKey: MessageKey }[] = [
  { route: '/salon/home', name: 'home', icon: 'home', labelKey: 'salon.nav.home' },
  { route: '/salon/agenda', name: 'agenda', icon: 'calendar', labelKey: 'salon.nav.agenda' },
  { route: '/salon/staff', name: 'staff', icon: 'people', labelKey: 'salon.nav.staff' },
  { route: '/salon/profile', name: 'profile', icon: 'business', labelKey: 'salon.nav.profile' },
];

const ACTIVE = '#6F8C1B';

function activeName(pathname: string): string {
  if (pathname.startsWith('/salon/agenda')) return 'agenda';
  if (pathname.startsWith('/salon/staff') || pathname.startsWith('/salon/codes')) return 'staff';
  if (pathname.startsWith('/salon/profile')) return 'profile';
  return 'home';
}

/** §10 — salon sahibi alt menüsü (uzman SellerTabBar'ından bağımsız). */
export function SalonTabBar() {
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
