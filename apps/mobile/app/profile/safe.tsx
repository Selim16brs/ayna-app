import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useLocale } from '../../src/locale';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, SectionHeader, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

const CONTACTS = [
  { name: 'Dana', relation: 'Kız kardeş' },
  { name: 'Aizhan', relation: 'Arkadaş' },
];

export default function SafeScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [location, setLocation] = useState(false);
  const [shareTrip, setShareTrip] = useState(false);

  const onSos = () => Alert.alert(t('safe.sos'), t('safe.sos_sub'));
  const onAddContact = () => Alert.alert(t('common.soon'));

  return (
    <Screen edges={['bottom']}>
      <StackHeader title={t('safe.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="body" tone="inkSoft" style={styles.subtitle}>
          {t('safe.subtitle')}
        </Text>

        {/* SOS — acil eylem (kırmızı, anlamsal) */}
        <Pressable onPress={onSos} style={[styles.sos, shadow.card]}>
          <View style={styles.sosIcon}>
            <Ionicons name="alert-circle" size={26} color={colors.onColor} />
          </View>
          <View style={styles.sosText}>
            <Text variant="h2" tone="onColor">
              {t('safe.sos')}
            </Text>
            <Text variant="caption" tone="onColor" style={styles.dim}>
              {t('safe.sos_sub')}
            </Text>
          </View>
        </Pressable>

        {/* Ayarlar */}
        <View style={[styles.group, styles.groupGap, shadow.soft]}>
          <ToggleRow
            icon="location-outline"
            label={t('safe.location')}
            sub={t('safe.location_sub')}
            value={location}
            onValueChange={setLocation}
            border
          />
          <ToggleRow
            icon="navigate-outline"
            label={t('safe.share_trip')}
            sub={t('safe.share_trip_sub')}
            value={shareTrip}
            onValueChange={setShareTrip}
          />
        </View>

        {/* Güvendiğim kişiler */}
        <SectionHeader title={t('safe.contacts')} />
        <Text variant="caption" tone="muted" style={styles.sectionSub}>
          {t('safe.contacts_sub')}
        </Text>
        <View style={[styles.group, shadow.soft]}>
          {CONTACTS.map((c, i) => (
            <View key={c.name} style={[styles.row, i < CONTACTS.length - 1 && styles.rowBorder]}>
              <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="person-outline" size={18} color={colors.ink} />
              </View>
              <Text variant="bodyStrong" tone="ink" style={styles.rowLabel}>
                {c.name} · {c.relation}
              </Text>
            </View>
          ))}
          <Pressable onPress={onAddContact} style={[styles.row, styles.rowBorder]}>
            <View style={[styles.icon, { backgroundColor: colors.surfaceMuted }]}>
              <Ionicons name="add" size={20} color={colors.inkSoft} />
            </View>
            <Text variant="bodyStrong" tone="inkSoft" style={styles.rowLabel}>
              {t('safe.add_contact')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function ToggleRow({
  icon,
  label,
  sub,
  value,
  onValueChange,
  border,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  border?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.row, border && styles.rowBorder]}>
      <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name={icon} size={18} color={colors.ink} />
      </View>
      <View style={styles.rowLabel}>
        <Text variant="bodyStrong" tone="ink">
          {label}
        </Text>
        <Text variant="caption" tone="muted">
          {sub}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.accent, false: colors.surfaceMuted }}
      />
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingTop: space(1), paddingBottom: TAB_BAR_CLEARANCE },
    subtitle: { marginBottom: space(2.5) },
    sos: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.75),
      backgroundColor: colors.danger,
      borderRadius: radius.xl,
      padding: space(2.5),
    },
    sosIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sosText: { flex: 1, gap: 2 },
    dim: { opacity: 0.92 },
    sectionSub: { marginTop: -space(1), marginBottom: space(1.75), paddingHorizontal: space(3) },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    groupGap: { marginTop: space(2) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(2),
      paddingVertical: space(1.75),
    },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surfaceMuted },
    icon: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: { flex: 1, gap: 2 },
  });
