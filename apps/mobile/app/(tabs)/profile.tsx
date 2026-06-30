import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocale } from '../../src/locale';
import type { MessageKey } from '@ayna/i18n';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { useStore } from '../../src/store';
import { Screen, Segmented, Text } from '../../src/ui';
import type { ThemeMode } from '../../src/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

const makeMenuColors = (colors: ColorTokens) => [
  colors.rose,
  colors.orange,
  colors.teal,
  colors.blue,
  colors.plum,
  colors.rose,
  colors.orange,
  colors.teal,
];

const MENU: { key: MessageKey; icon: IoniconName; danger?: boolean }[] = [
  { key: 'profile.menu.passport', icon: 'card-outline' },
  { key: 'profile.menu.rewards', icon: 'gift-outline' },
  { key: 'profile.menu.budget', icon: 'wallet-outline' },
  { key: 'profile.menu.safe', icon: 'shield-checkmark-outline' },
  { key: 'profile.menu.privacy', icon: 'lock-closed-outline' },
  { key: 'profile.menu.notifications', icon: 'notifications-outline' },
  { key: 'profile.menu.language', icon: 'language-outline' },
  { key: 'profile.menu.help', icon: 'help-circle-outline' },
  { key: 'profile.menu.logout', icon: 'log-out-outline', danger: true },
];

export default function ProfileScreen() {
  const { t } = useLocale();
  const { colors, gradients, shadow, preference, setPreference } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const MENU_COLORS = makeMenuColors(colors);
  const router = useRouter();

  const completedCount = useStore((s) => s.bookings.filter((b) => b.status === 'completed').length);
  const points = useStore((s) => s.points);
  const reviewCount = useStore((s) =>
    Object.values(s.userReviews).reduce((n, a) => n + a.length, 0),
  );

  const appearance: 'system' | ThemeMode = preference ?? 'system';
  const onAppearance = (value: 'system' | ThemeMode) =>
    setPreference(value === 'system' ? null : value);

  const onPress = (key: MessageKey) => {
    if (key === 'profile.menu.passport') router.push('/profile/passport');
    else if (key === 'profile.menu.rewards') router.push('/rewards');
    else if (key === 'profile.menu.budget') router.push('/profile/budget');
    else if (key === 'profile.menu.safe') router.push('/profile/safe');
    else if (key === 'profile.menu.privacy') router.push('/profile/privacy');
    else if (key === 'profile.menu.notifications') router.push('/notifications');
    else if (key === 'profile.menu.help') router.push('/profile/help');
    else if (key === 'profile.menu.language' || key === 'profile.menu.logout') router.replace('/');
  };

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileRow}>
          <LinearGradient colors={gradients.rose} style={styles.avatar}>
            <Text variant="title" tone="onColor">
              A
            </Text>
          </LinearGradient>
          <View style={styles.profileText}>
            <Text variant="h2" tone="rose">
              Aigerim
            </Text>
            <Pressable onPress={() => router.push('/profile/edit')}>
              <Text variant="caption" tone="rose">
                {t('profile.edit')}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.stats, shadow.soft]}>
          <Stat value={`${completedCount}`} label={t('profile.stat.bookings')} />
          <View style={styles.statDivider} />
          <Stat value={`${points}`} label={t('profile.stat.points')} />
          <View style={styles.statDivider} />
          <Stat value={`${reviewCount || 5}`} label={t('profile.stat.reviews')} />
        </View>

        <View style={styles.appearance}>
          <View style={styles.appearanceHead}>
            <Ionicons name="contrast-outline" size={18} color={colors.inkSoft} />
            <Text variant="bodyStrong" tone="ink" style={styles.appearanceTitle}>
              {t('profile.appearance')}
            </Text>
          </View>
          <Segmented
            value={appearance}
            onChange={onAppearance}
            options={[
              { value: 'system', label: t('profile.appearance.system') },
              { value: 'light', label: t('profile.appearance.light') },
              { value: 'dark', label: t('profile.appearance.dark') },
            ]}
          />
        </View>

        <View style={styles.group}>
          {MENU.filter((m) => !m.danger).map((m, i, arr) => (
            <Pressable
              key={m.key}
              style={[styles.row, i < arr.length - 1 && styles.rowBorder]}
              onPress={() => onPress(m.key)}
            >
              <View
                style={[styles.menuIcon, { backgroundColor: MENU_COLORS[i % MENU_COLORS.length] }]}
              >
                <Ionicons name={m.icon} size={18} color={colors.onColor} />
              </View>
              <Text variant="bodyStrong" tone="ink" style={styles.menuLabel}>
                {t(m.key)}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        <View style={[styles.group, styles.groupGap]}>
          {MENU.filter((m) => m.danger).map((m) => (
            <Pressable key={m.key} style={styles.row} onPress={() => onPress(m.key)}>
              <View style={[styles.menuIcon, styles.menuIconDanger]}>
                <Ionicons name={m.icon} size={18} color={colors.onColor} />
              </View>
              <Text variant="bodyStrong" tone="rose" style={styles.menuLabel}>
                {t(m.key)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Text variant="title" tone="ink">
        {value}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), paddingBottom: space(4) },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(2),
      marginBottom: space(2.5),
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileText: { gap: 4 },
    stats: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      paddingVertical: space(2),
      marginBottom: space(3),
    },
    stat: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, height: 30, backgroundColor: colors.line },
    appearance: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(2),
      marginBottom: space(2),
      gap: space(1.5),
    },
    appearanceHead: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    appearanceTitle: { flex: 1 },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
    },
    groupGap: { marginTop: space(2) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.5),
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
    menuIcon: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuIconDanger: { backgroundColor: colors.danger },
    menuLabel: { flex: 1 },
  });
