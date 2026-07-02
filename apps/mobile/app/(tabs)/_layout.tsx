import { Tabs } from 'expo-router';
import { useLocale } from '../../src/locale';

// Alt bar artık global (src/ui/AppTabBar, root layout'ta) — bu navigator kendi barını çizmez.
export default function TabsLayout() {
  const { t } = useLocale();

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => null}>
      <Tabs.Screen name="discover" options={{ title: t('nav.discover') }} />
      <Tabs.Screen name="bookings" options={{ title: t('nav.bookings') }} />
      <Tabs.Screen name="circle" options={{ title: t('nav.circle') }} />
      <Tabs.Screen name="care" options={{ title: t('nav.care') }} />
      <Tabs.Screen name="profile" options={{ title: t('nav.profile') }} />
    </Tabs>
  );
}
