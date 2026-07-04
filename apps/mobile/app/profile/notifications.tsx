import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { activeCategories } from '../../src/taxonomy';
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
  // §9.3 — uzman/salon: talep bildirim filtreleri (kategori + saat aralığı)
  const isSeller = useStore((s) => s.currentUser?.role === 'professional' || s.currentUser?.role === 'salon');
  const demandNotif = useStore((s) => s.demandNotif);
  const setDemandNotif = useStore((s) => s.setDemandNotif);
  const cats = activeCategories();
  const toggleCat = (id: string) =>
    setDemandNotif({
      cats: demandNotif.cats.includes(id)
        ? demandNotif.cats.filter((x) => x !== id)
        : [...demandNotif.cats, id],
    });
  const stepHour = (which: 'from' | 'to', delta: number) => {
    if (which === 'from')
      setDemandNotif({ from: Math.max(0, Math.min(demandNotif.to - 1, demandNotif.from + delta)) });
    else setDemandNotif({ to: Math.max(demandNotif.from + 1, Math.min(24, demandNotif.to + delta)) });
  };
  const hh = (n: number) => `${String(n).padStart(2, '0')}:00`;

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
              <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name={g.icon} size={19} color={colors.accentFg} />
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

        {/* §9.3 — uzman/salon: talep bildirim filtreleri */}
        {isSeller ? (
          <View style={[styles.demandBox, shadow.soft]}>
            <Text variant="bodyStrong" tone="ink">
              {t('notifprefs.demand_title')}
            </Text>
            <Text variant="caption" tone="muted" style={styles.demandHint}>
              {t('notifprefs.demand_hint')}
            </Text>

            <Text variant="caption" tone="accentFg" style={styles.demandLabel}>
              {t('notifprefs.demand_cats')}
            </Text>
            <View style={styles.catRow}>
              {cats.map((c) => {
                const on = demandNotif.cats.length === 0 || demandNotif.cats.includes(c.id);
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => toggleCat(c.id)}
                    style={[styles.catChip, demandNotif.cats.includes(c.id) && styles.catChipOn]}
                  >
                    <Ionicons name={c.icon} size={13} color={on ? colors.accentFg : colors.muted} />
                    <Text variant="caption" tone={on ? 'ink' : 'muted'}>
                      {t(c.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text variant="caption" tone="accentFg" style={styles.demandLabel}>
              {t('notifprefs.demand_hours')}
            </Text>
            <View style={styles.hourRow}>
              <View style={styles.hourStepper}>
                <Pressable style={styles.stepBtn} onPress={() => stepHour('from', -1)}>
                  <Ionicons name="remove" size={16} color={colors.ink} />
                </Pressable>
                <Text variant="bodyStrong" tone="ink" style={styles.hourVal}>
                  {hh(demandNotif.from)}
                </Text>
                <Pressable style={styles.stepBtn} onPress={() => stepHour('from', 1)}>
                  <Ionicons name="add" size={16} color={colors.ink} />
                </Pressable>
              </View>
              <Ionicons name="arrow-forward" size={16} color={colors.muted} />
              <View style={styles.hourStepper}>
                <Pressable style={styles.stepBtn} onPress={() => stepHour('to', -1)}>
                  <Ionicons name="remove" size={16} color={colors.ink} />
                </Pressable>
                <Text variant="bodyStrong" tone="ink" style={styles.hourVal}>
                  {hh(demandNotif.to)}
                </Text>
                <Pressable style={styles.stepBtn} onPress={() => stepHour('to', 1)}>
                  <Ionicons name="add" size={16} color={colors.ink} />
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

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
    demandBox: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(2), gap: space(1) },
    demandHint: { lineHeight: 17 },
    demandLabel: { marginTop: space(1), fontWeight: '700' },
    catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    catChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: space(1.25),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
      borderWidth: 1.25,
      borderColor: colors.line,
      backgroundColor: colors.surface,
    },
    catChipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    hourRow: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
    hourStepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.pill,
      paddingHorizontal: space(0.75),
      paddingVertical: space(0.5),
    },
    stepBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
    hourVal: { minWidth: 48, textAlign: 'center' },
  });
