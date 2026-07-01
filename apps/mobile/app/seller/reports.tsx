import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api, type BookingStats } from '../../src/api';
import { formatPrice, SELLER_DATA, type SellerMetric } from '../../src/data';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import type { MessageKey } from '@ayna/i18n';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { PressableScale, Screen, Segmented, StackHeader, Text } from '../../src/ui';

type Period = 'week' | 'month' | 'all';
type IoniconName = keyof typeof Ionicons.glyphMap;

// İşletme paneli hızlı aksiyonları
const ACTIONS: {
  id: string;
  icon: IoniconName;
  labelKey: MessageKey;
  route?: string;
  tone: 'rose' | 'sage' | 'lavender' | 'gold';
}[] = [
  { id: 'agenda', icon: 'calendar', labelKey: 'reports.action.agenda', route: '/seller/agenda', tone: 'rose' },
  { id: 'offline', icon: 'add-circle', labelKey: 'reports.action.offline', route: '/seller/offline', tone: 'sage' },
  { id: 'gallery', icon: 'images', labelKey: 'reports.action.gallery', route: '/seller/gallery', tone: 'lavender' },
  { id: 'services', icon: 'pricetags', labelKey: 'reports.action.services', tone: 'gold' },
];

export default function ReportsScreen() {
  const { t } = useLocale();
  const { colors, gradients, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('week');
  const data = SELLER_DATA[period];
  const salonName = useStore((s) => s.currentUser?.name) ?? 'AYNA İşletme';

  const actionTone = (tone: 'rose' | 'sage' | 'lavender' | 'gold') => ({
    bg: colors[`${tone}Soft` as const],
    fg: colors[tone],
  });

  // §5 — gerçek randevulardan canlı özet (çevrimdışıysa gizlenir)
  const [stats, setStats] = useState<BookingStats | null>(null);
  useEffect(() => {
    let alive = true;
    api
      .bookingStats()
      .then((s) => alive && setStats(s))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('reports.panel_title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* İşletme kimliği + müşteri görünümü geçişi */}
        <View style={[styles.identity, shadow.soft]}>
          <View style={styles.identityAvatar}>
            <Ionicons name="storefront" size={20} color={colors.onColor} />
          </View>
          <View style={styles.flex}>
            <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
              {salonName}
            </Text>
            <Text variant="caption" tone="muted">
              {t('reports.identity_sub')}
            </Text>
          </View>
          <PressableScale style={styles.custView} onPress={() => router.push('/discover')}>
            <Ionicons name="eye-outline" size={14} color={colors.rose} />
            <Text variant="caption" tone="rose" style={styles.custViewText}>
              {t('reports.customer_view')}
            </Text>
          </PressableScale>
        </View>

        {/* Canlı özet (gerçek veriler) */}
        {stats ? (
          <LinearGradient colors={gradients.plum} style={[styles.live, shadow.card]}>
            <View style={styles.liveHead}>
              <Ionicons name="pulse" size={15} color={colors.onColor} />
              <Text variant="label" tone="onColor">
                {t('reports.live.title')}
              </Text>
            </View>
            <View style={styles.liveRow}>
              <LiveTile value={String(stats.upcoming)} label={t('reports.live.upcoming')} />
              <LiveTile value={String(stats.completed)} label={t('reports.live.completed')} />
              <LiveTile value={`%${stats.noShowRate}`} label={t('reports.live.noshow')} />
            </View>
            <View style={styles.liveDivider} />
            <View style={styles.liveRevenue}>
              <Text variant="caption" tone="onColor" style={styles.dim}>
                {t('reports.live.revenue')}
              </Text>
              <Text variant="h2" tone="onColor">
                {formatPrice(stats.revenue)}
              </Text>
            </View>
          </LinearGradient>
        ) : null}

        {/* Panel hızlı aksiyonları */}
        <View style={styles.actionGrid}>
          {ACTIONS.map((a) => {
            const c = actionTone(a.tone);
            return (
              <PressableScale
                key={a.id}
                style={[styles.action, shadow.soft]}
                onPress={() => (a.route ? router.push(a.route) : undefined)}
              >
                <View style={[styles.actionIcon, { backgroundColor: c.bg }]}>
                  <Ionicons name={a.icon} size={22} color={c.fg} />
                </View>
                <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                  {t(a.labelKey)}
                </Text>
                {!a.route ? (
                  <Text variant="caption" tone="muted">
                    {t('common.soon')}
                  </Text>
                ) : null}
              </PressableScale>
            );
          })}
        </View>

        <Text variant="bodyStrong" tone="ink" style={styles.perfTitle}>
          {t('reports.performance')}
        </Text>
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
            <PressableScale
              key={u.name}
              style={[styles.staffRow, i < data.staff.length - 1 && styles.border]}
              onPress={() =>
                router.push({
                  pathname: '/seller/staff',
                  params: {
                    name: u.name,
                    image: u.image,
                    bookings: String(u.bookings),
                    rating: String(u.rating),
                  },
                })
              }
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
                <Ionicons name="chevron-forward" size={14} color={colors.muted} />
              </View>
            </PressableScale>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function LiveTile({ value, label }: { value: string; label: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.liveTile}>
      <Text variant="h2" tone="onColor">
        {value}
      </Text>
      <Text variant="caption" tone="onColor" style={styles.dim} numberOfLines={1}>
        {label}
      </Text>
    </View>
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
    flex: { flex: 1 },
    // İşletme kimliği
    identity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
      marginBottom: space(2),
    },
    identityAvatar: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: colors.rose,
      alignItems: 'center',
      justifyContent: 'center',
    },
    custView: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.roseSoft,
      paddingHorizontal: space(1.25),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
    },
    custViewText: { fontWeight: '600' },
    // Aksiyon ızgarası
    actionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space(1.5),
      marginBottom: space(1),
    },
    action: {
      width: '47%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
      gap: space(0.75),
    },
    actionIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(0.5),
    },
    perfTitle: { marginTop: space(3), marginBottom: space(1.5) },
    // §5 canlı özet
    live: { borderRadius: radius.lg, padding: space(2), marginBottom: space(2), gap: space(1.5) },
    liveHead: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
    liveRow: { flexDirection: 'row', justifyContent: 'space-between' },
    liveTile: { flex: 1, alignItems: 'center', gap: 2 },
    liveDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
    liveRevenue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dim: { opacity: 0.9 },
    agendaLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(1.75),
      marginBottom: space(2),
    },
    agendaIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.rose,
      alignItems: 'center',
      justifyContent: 'center',
    },
    agendaText: { flex: 1, gap: 2 },
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
