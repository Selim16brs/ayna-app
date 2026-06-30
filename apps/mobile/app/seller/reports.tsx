import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SELLER_DATA, type SellerMetric } from '../../src/data';
import { useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, Segmented, StackHeader, Text } from '../../src/ui';

type Period = 'week' | 'month' | 'all';
type IoniconName = keyof typeof Ionicons.glyphMap;

export default function ReportsScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [period, setPeriod] = useState<Period>('week');
  const data = SELLER_DATA[period];

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
          {data.metrics.map((m) => (
            <Metric key={m.id} metric={m} />
          ))}
        </View>

        {/* Uzman performansı */}
        <Text variant="label" tone="rose" style={styles.section}>
          {t('reports.section.staff')}
        </Text>
        <View style={styles.group}>
          {data.staff.map((u, i) => (
            <View
              key={u.name}
              style={[styles.staffRow, i < data.staff.length - 1 && styles.border]}
            >
              <Image source={{ uri: u.image }} style={styles.staffImage} />
              <Text variant="bodyStrong" tone="ink" style={styles.staffName} numberOfLines={1}>
                {u.name}
              </Text>
              <Text variant="caption" tone="muted">
                {u.bookings} {t('reports.bookings')}
              </Text>
              <View style={styles.staffMeta}>
                <Ionicons name="star" size={12} color={colors.gold} />
                <Text variant="caption" tone="inkSoft">
                  {u.rating.toFixed(1)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Metric({ metric }: { metric: SellerMetric }) {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.metric, shadow.soft]}>
      <View style={styles.metricIcon}>
        <Ionicons name={metric.icon as IoniconName} size={16} color={colors.rose} />
      </View>
      <Text variant="title" tone="ink" style={styles.metricValue}>
        {metric.value}
      </Text>
      <View style={styles.metricFoot}>
        <Text variant="caption" tone="muted" style={styles.metricLabel}>
          {t(metric.labelKey)}
        </Text>
        <Text variant="caption" style={{ color: metric.positive ? colors.success : colors.danger }}>
          {metric.delta}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
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
    metricFoot: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    metricLabel: { flex: 1 },
    section: { marginTop: space(3.5), marginBottom: space(1.5) },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
    },
    border: { borderBottomWidth: 1, borderBottomColor: colors.line },
    staffRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      paddingHorizontal: space(2),
      paddingVertical: space(1.5),
    },
    staffImage: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceMuted },
    staffName: { flex: 1 },
    staffMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  });
