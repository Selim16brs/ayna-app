import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, Text } from '../../src/ui';

type Key = 'care' | 'moment' | 'personal' | 'booking';
const GROUPS: { key: Key; icon: keyof typeof Ionicons.glyphMap; label: MessageKey; desc: MessageKey }[] = [
  { key: 'booking', icon: 'calendar-outline', label: 'notifprefs.booking', desc: 'notifprefs.booking_desc' },
  { key: 'care', icon: 'sparkles-outline', label: 'notifprefs.care', desc: 'notifprefs.care_desc' },
  { key: 'moment', icon: 'gift-outline', label: 'notifprefs.moment', desc: 'notifprefs.moment_desc' },
  { key: 'personal', icon: 'create-outline', label: 'notifprefs.personal', desc: 'notifprefs.personal_desc' },
];

export default function NotificationPrefsScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const prefs = useStore((s) => s.notifPrefs);
  const toggle = useStore((s) => s.toggleNotifPref);

  return (
    <Screen edges={[]}>
      <StackHeader title={t('notifprefs.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" tone="muted" style={styles.hint}>
          {t('notifprefs.hint')}
        </Text>

        <View style={[styles.group, shadow.soft]}>
          {GROUPS.map((g, i) => (
            <View key={g.key} style={[styles.row, i < GROUPS.length - 1 && styles.rowBorder]}>
              <View style={[styles.icon, { backgroundColor: colors.roseSoft }]}>
                <Ionicons name={g.icon} size={19} color={colors.rose} />
              </View>
              <View style={styles.rowText}>
                <Text variant="bodyStrong" tone="ink">
                  {t(g.label)}
                </Text>
                <Text variant="caption" tone="muted">
                  {t(g.desc)}
                </Text>
              </View>
              <Switch
                value={prefs[g.key]}
                onValueChange={() => toggle(g.key)}
                trackColor={{ true: colors.accent, false: colors.line }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>

        {/* Bildirim kutusuna köprü */}
        <Pressable style={[styles.inboxRow, shadow.soft]} onPress={() => router.push('/notifications')}>
          <Ionicons name="mail-outline" size={19} color={colors.ink} />
          <Text variant="bodyStrong" tone="ink" style={styles.inboxText}>
            {t('notifprefs.view_inbox')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingTop: space(2), paddingBottom: space(6), gap: space(2) },
    hint: { marginLeft: space(0.5) },
    group: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), paddingHorizontal: space(2), paddingVertical: space(1.75) },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
    icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    rowText: { flex: 1, gap: 2 },
    inboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
    },
    inboxText: { flex: 1 },
  });
