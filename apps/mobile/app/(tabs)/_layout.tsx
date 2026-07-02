import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale } from '../../src/locale';
import { space } from '../../src/theme';
import { useTheme } from '../../src/theme-context';

type IoniconName = keyof typeof Ionicons.glyphMap;
const ICONS: Record<string, IoniconName> = {
  discover: 'compass',
  bookings: 'calendar',
  circle: 'people',
  care: 'heart',
  profile: 'person',
};

// Yüzen koyu pill alt menü (Booksy / referans dili) — aktif sekme coral pill + etiket.
function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const barBg = isDark ? colors.surfaceMuted : '#201C1B';

  return (
    <View style={[styles.wrap, { paddingBottom: (insets.bottom || space(1.5)) }]} pointerEvents="box-none">
      <View style={[styles.bar, { backgroundColor: barBg }]}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const { options } = descriptors[route.key]!;
          const label = (options.title as string) ?? route.name;
          const base = ICONS[route.name] ?? 'ellipse';
          const icon = (focused ? base : `${base}-outline`) as IoniconName;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.item}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
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
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useLocale();

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="discover" options={{ title: t('nav.discover') }} />
      <Tabs.Screen name="bookings" options={{ title: t('nav.bookings') }} />
      <Tabs.Screen name="circle" options={{ title: t('nav.circle') }} />
      <Tabs.Screen name="care" options={{ title: t('nav.care') }} />
      <Tabs.Screen name="profile" options={{ title: t('nav.profile') }} />
    </Tabs>
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
  // Aktif sekme: lime yuvarlak-kare tile + altında etiket (referans)
  activeTile: {
    width: 44,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveTile: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.1 },
});
