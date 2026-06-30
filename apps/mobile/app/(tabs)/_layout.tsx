import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';
import { useLocale } from '../../src/locale';
import { useTheme } from '../../src/theme-context';

export default function TabsLayout() {
  const { t } = useLocale();
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        // Buzlu cam alt menü (frosted glass) — içerik altından geçer
        tabBarBackground: () => (
          <BlurView
            intensity={isDark ? 40 : 60}
            tint={isDark ? 'dark' : 'light'}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.surface + (isDark ? 'B0' : 'C8') },
            ]}
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopColor: colors.line,
          height: 88,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: t('nav.discover'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('nav.bookings'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="circle"
        options={{
          title: t('nav.circle'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="care"
        options={{
          title: t('nav.care'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
