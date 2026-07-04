import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../locale';
import { space } from '../theme';
import { useTheme } from '../theme-context';

type IoniconName = keyof typeof Ionicons.glyphMap;

// §9.1 — uzman/salon alt barı: Ana Sayfa · Menü · Profil (Talepler+Takvim ana ekranda; yönetim öğeleri Menü'de)
const TABS: { route: string; name: string; icon: IoniconName; labelKey: MessageKey }[] = [
  { route: '/seller/reports', name: 'reports', icon: 'home', labelKey: 'seller.nav.home' },
  { route: '/seller/menu', name: 'menu', icon: 'grid', labelKey: 'seller.nav.menu' },
  { route: '/seller/offline', name: 'offline', icon: 'add-circle', labelKey: 'seller.nav.offline' },
  { route: '/profile', name: 'profile', icon: 'person', labelKey: 'seller.nav.profile' },
];

// Aktif sekme foreground'u: kullanıcı alt barıyla AYNI (marka lime'ının okunur koyu tonu)
const ACTIVE = '#6F8C1B';

function activeName(pathname: string): string {
  if (pathname.startsWith('/seller/menu')) return 'menu';
  if (pathname.startsWith('/seller/offline')) return 'offline';
  if (pathname.startsWith('/profile')) return 'profile';
  return 'reports';
}

/** §9.1 — satıcı (uzman/salon) alt menüsü — kullanıcı AppTabBar'ıyla AYNI tasarım. */
export function SellerTabBar() {
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
