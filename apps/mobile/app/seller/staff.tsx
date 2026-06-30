import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { formatPrice } from '../../src/data';
import { useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Progress, Screen, Segmented, StackHeader, Text } from '../../src/ui';

// Uzman bazlı hizmet dağılımı (mock; gerçek panelde API'den gelir)
const SERVICES = [
  { name: 'Saç boyama', share: 0.42 },
  { name: 'Kesim & fön', share: 0.31 },
  { name: 'Bakım', share: 0.27 },
];

// §5.1 — salon hizmet havuzu (uzmana atanabilir)
const SALON_POOL = [
  'Saç kesimi & fön',
  'Saç boyama',
  'Balayage',
  'Keratin bakımı',
  'Topuz / saç tasarımı',
  'Gelin saçı',
];

type Schedule = 'standard' | 'flexible';

export default function StaffDetailScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const p = useLocalSearchParams<{
    name?: string;
    image?: string;
    bookings?: string;
    rating?: string;
  }>();
  const bookings = Number(p.bookings ?? 0) || 0;
  const rating = Number(p.rating ?? 0) || 0;
  const revenue = bookings * 14000; // mock ortalama bilet

  // §5.1 — uzmana atanan hizmetler + çalışma grafiği tipi
  const [assigned, setAssigned] = useState<Set<string>>(new Set(SALON_POOL.slice(0, 3)));
  const [schedule, setSchedule] = useState<Schedule>('standard');
  const toggle = (s: string) =>
    setAssigned((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('seller.staff.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          {p.image ? <Image source={{ uri: p.image }} style={styles.avatar} /> : null}
          <View>
            <Text variant="h2" tone="ink">
              {p.name}
            </Text>
            <Text variant="caption" tone="muted">
              {t('seller.staff.period')}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat
            icon="calendar-outline"
            value={String(bookings)}
            label={t('seller.staff.bookings')}
          />
          <View style={styles.divider} />
          <Stat icon="star-outline" value={rating.toFixed(1)} label={t('seller.staff.rating')} />
          <View style={styles.divider} />
          <Stat
            icon="cash-outline"
            value={formatPrice(revenue)}
            label={t('seller.staff.revenue')}
          />
        </View>

        {/* §5.1 — çalışma grafiği tipi */}
        <Text variant="label" tone="rose" style={styles.section}>
          {t('seller.staff.schedule')}
        </Text>
        <Segmented
          options={[
            { value: 'standard', label: t('seller.staff.schedule.standard') },
            { value: 'flexible', label: t('seller.staff.schedule.flexible') },
          ]}
          value={schedule}
          onChange={setSchedule}
        />
        <View style={styles.scheduleNote}>
          <Ionicons name="time-outline" size={14} color={colors.muted} />
          <Text variant="caption" tone="muted" style={styles.flex}>
            {t(schedule === 'standard' ? 'seller.staff.schedule.standard_desc' : 'seller.staff.schedule.flexible_desc')}
          </Text>
        </View>

        {/* §5.1 — salon havuzundan uzmana hizmet atama */}
        <Text variant="label" tone="rose" style={styles.section}>
          {t('seller.staff.assign')}
        </Text>
        <Text variant="caption" tone="muted" style={styles.assignHint}>
          {t('seller.staff.assign_hint')}
        </Text>
        <View style={styles.poolWrap}>
          {SALON_POOL.map((s) => {
            const on = assigned.has(s);
            return (
              <Pressable key={s} onPress={() => toggle(s)} style={[styles.poolChip, on && styles.poolChipOn]}>
                {on ? <Ionicons name="checkmark" size={13} color={colors.onColor} /> : null}
                <Text variant="caption" tone={on ? 'onColor' : 'inkSoft'}>
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text variant="label" tone="rose" style={styles.section}>
          {t('seller.staff.services')}
        </Text>
        <View style={styles.group}>
          {SERVICES.map((s, i) => (
            <View key={s.name} style={[styles.svc, i < SERVICES.length - 1 && styles.svcBorder]}>
              <View style={styles.svcHead}>
                <Text variant="bodyStrong" tone="ink">
                  {s.name}
                </Text>
                <Text variant="caption" tone="inkSoft">
                  %{Math.round(s.share * 100)}
                </Text>
              </View>
              <Progress value={s.share} color={colors.rose} />
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={colors.rose} />
      <Text variant="bodyStrong" tone="ink" style={styles.statValue}>
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
    content: { padding: space(2), paddingBottom: space(4) },
    head: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), marginBottom: space(2.5) },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceMuted },
    stats: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      paddingVertical: space(2),
    },
    stat: { flex: 1, alignItems: 'center', gap: 4 },
    statValue: { marginTop: 2 },
    divider: { width: 1, backgroundColor: colors.line, marginVertical: space(1) },
    section: { paddingHorizontal: space(1), marginTop: space(3), marginBottom: space(1.5) },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
    },
    svc: { padding: space(2), gap: space(1) },
    svcBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
    svcHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    flex: { flex: 1 },
    scheduleNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      marginTop: space(1),
      paddingHorizontal: space(1),
    },
    assignHint: { paddingHorizontal: space(1), marginBottom: space(1.25) },
    poolWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    poolChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.9),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    poolChipOn: { backgroundColor: colors.rose, borderColor: colors.rose },
  });
