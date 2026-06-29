import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { formatPrice, getProfessionalDetail } from '../../src/data';
import { useLocale } from '../../src/locale';
import { colors, radius, shadow, space } from '../../src/theme';
import { Screen, Segmented, StackHeader, Text } from '../../src/ui';

type Period = 'week' | 'month' | 'all';

const DATA: Record<Period, Record<string, number | string>> = {
  week: {
    bookings: 24,
    visits: 312,
    conversion: '%18',
    revenue: 285000,
    repeat: '%42',
    noshow: 2,
    quotesIn: 38,
    acceptRate: '%63',
    demandsIn: 12,
  },
  month: {
    bookings: 98,
    visits: 1340,
    conversion: '%21',
    revenue: 1180000,
    repeat: '%48',
    noshow: 7,
    quotesIn: 152,
    acceptRate: '%59',
    demandsIn: 44,
  },
  all: {
    bookings: 612,
    visits: 8900,
    conversion: '%23',
    revenue: 7450000,
    repeat: '%51',
    noshow: 31,
    quotesIn: 980,
    acceptRate: '%61',
    demandsIn: 260,
  },
};

export default function ReportsScreen() {
  const { t } = useLocale();
  const [period, setPeriod] = useState<Period>('week');
  const d = DATA[period];
  const staff = getProfessionalDetail('1').staff;

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('reports.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Segmented
          options={[
            { value: 'week', label: t('reports.period.week') },
            { value: 'month', label: t('reports.period.month') },
            { value: 'all', label: t('reports.period.all') },
          ]}
          value={period}
          onChange={setPeriod}
        />

        <View style={styles.grid}>
          <Metric icon="calendar" label={t('reports.bookings')} value={`${d.bookings}`} />
          <Metric icon="eye" label={t('reports.visits')} value={`${d.visits}`} />
          <Metric icon="trending-up" label={t('reports.conversion')} value={`${d.conversion}`} />
          <Metric icon="cash" label={t('reports.revenue')} value={formatPrice(Number(d.revenue))} />
          <Metric icon="repeat" label={t('reports.repeat')} value={`${d.repeat}`} />
          <Metric icon="close-circle" label={t('reports.noshow')} value={`${d.noshow}`} />
        </View>

        {/* Teklif hunisi */}
        <Text variant="label" tone="gold" style={styles.section}>
          {t('reports.section.funnel')}
        </Text>
        <View style={styles.group}>
          <Row label={t('reports.quotes_in')} value={`${d.quotesIn}`} border />
          <Row label={t('reports.accept_rate')} value={`${d.acceptRate}`} border />
          <Row label={t('reports.demands_in')} value={`${d.demandsIn}`} />
        </View>

        {/* Uzman performansı */}
        <Text variant="label" tone="gold" style={styles.section}>
          {t('reports.section.staff')}
        </Text>
        <View style={styles.group}>
          {staff.map((u, i) => (
            <View key={u.id} style={[styles.staffRow, i < staff.length - 1 && styles.border]}>
              <Text variant="bodyStrong" tone="ink" style={styles.staffName}>
                {u.name}
              </Text>
              <View style={styles.staffMeta}>
                <Ionicons name="star" size={12} color={colors.gold} />
                <Text variant="caption" tone="inkSoft">
                  {u.rating.toFixed(1)}
                </Text>
              </View>
              <Text variant="caption" tone="muted">
                {u.role}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={[styles.metric, shadow.soft]}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={16} color={colors.rose} />
      </View>
      <Text variant="title" tone="ink" style={styles.metricValue}>
        {value}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

function Row({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <View style={[styles.row, border && styles.border]}>
      <Text variant="body" tone="inkSoft" style={styles.rowLabel}>
        {label}
      </Text>
      <Text variant="bodyStrong" tone="ink">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space(3), paddingBottom: space(4) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5), marginTop: space(2.5) },
  metric: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space(2),
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.roseSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space(1),
  },
  metricValue: { fontSize: 24, lineHeight: 30 },
  section: { marginTop: space(3.5), marginBottom: space(1.5) },
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
    justifyContent: 'space-between',
    paddingHorizontal: space(2),
    paddingVertical: space(1.75),
  },
  rowLabel: { flex: 1 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.line },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.25),
    paddingHorizontal: space(2),
    paddingVertical: space(1.75),
  },
  staffName: { flex: 1 },
  staffMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
