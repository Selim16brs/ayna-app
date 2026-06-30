import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../../src/locale';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, Text } from '../../src/ui';

type ToggleKey = 'location' | 'anon' | 'personalized' | 'analytics' | 'marketing';

const TOGGLES: {
  key: ToggleKey;
  label: MessageKey;
  sub?: MessageKey;
  icon: keyof typeof Ionicons.glyphMap;
  default: boolean;
}[] = [
  {
    key: 'location',
    label: 'privacy.location',
    sub: 'privacy.location_sub',
    icon: 'location-outline',
    default: false,
  },
  {
    key: 'anon',
    label: 'privacy.anon_reviews',
    sub: 'privacy.anon_reviews_sub',
    icon: 'eye-off-outline',
    default: true,
  },
  { key: 'personalized', label: 'privacy.personalized', icon: 'sparkles-outline', default: true },
  { key: 'analytics', label: 'privacy.analytics', icon: 'analytics-outline', default: true },
  { key: 'marketing', label: 'privacy.marketing', icon: 'megaphone-outline', default: false },
];

export default function PrivacyScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [state, setState] = useState<Record<ToggleKey, boolean>>({
    location: false,
    anon: true,
    personalized: true,
    analytics: true,
    marketing: false,
  });

  const set = (k: ToggleKey) => (v: boolean) => setState((s) => ({ ...s, [k]: v }));

  const onDownload = () => Alert.alert(t('common.soon'));
  const onDelete = () =>
    Alert.alert(t('privacy.delete'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive' },
    ]);

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('privacy.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" tone="muted" style={styles.subtitle}>
          {t('privacy.subtitle')}
        </Text>

        <View style={styles.group}>
          {TOGGLES.map((tg, i) => (
            <View key={tg.key} style={[styles.row, i < TOGGLES.length - 1 && styles.rowBorder]}>
              <View style={[styles.icon, { backgroundColor: colors.lavenderSoft }]}>
                <Ionicons name={tg.icon} size={18} color={colors.lavender} />
              </View>
              <View style={styles.rowLabel}>
                <Text variant="bodyStrong" tone="ink">
                  {t(tg.label)}
                </Text>
                {tg.sub && (
                  <Text variant="caption" tone="muted">
                    {t(tg.sub)}
                  </Text>
                )}
              </View>
              <Switch
                value={state[tg.key]}
                onValueChange={set(tg.key)}
                trackColor={{ true: colors.lavender, false: colors.line }}
              />
            </View>
          ))}
        </View>

        {/* Verilerim */}
        <Text variant="label" tone="rose" style={styles.section}>
          {t('privacy.section.data')}
        </Text>
        <View style={styles.group}>
          <Pressable onPress={onDownload} style={[styles.row, styles.rowBorder]}>
            <View style={[styles.icon, { backgroundColor: colors.surfaceMuted }]}>
              <Ionicons name="download-outline" size={18} color={colors.inkSoft} />
            </View>
            <Text variant="bodyStrong" tone="ink" style={styles.actionLabel}>
              {t('privacy.download')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
          <Pressable onPress={onDelete} style={styles.row}>
            <View style={[styles.icon, { backgroundColor: colors.dangerSoft }]}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </View>
            <Text variant="bodyStrong" tone="rose" style={styles.actionLabel}>
              {t('privacy.delete')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4) },
    subtitle: { marginBottom: space(2) },
    section: { marginTop: space(3), marginBottom: space(1.5) },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.5),
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
    icon: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: { flex: 1, gap: 2 },
    actionLabel: { flex: 1 },
  });
