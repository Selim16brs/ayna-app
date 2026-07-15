import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { formatPrice } from '../../src/data';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

type Period = 'month' | 'quarter' | 'all';
const PERIODS: { key: Period; labelKey: MessageKey }[] = [
  { key: 'month', labelKey: 'earnings.p.month' },
  { key: 'quarter', labelKey: 'earnings.p.quarter' },
  { key: 'all', labelKey: 'earnings.p.all' },
];

// §B4 (ayna2) — Kazançlarım: tamamlanan işlerden dönem bazlı kazanç özeti.
// Veri sağlayıcı randevularından (buluttan hydrate) türetilir; komisyon oranı
// admin parametresidir. Salonun göremeyeceği uzman-özel para BURADA sahibine gösterilir.
export default function EarningsScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bookings = useStore((s) => s.bookings);
  const rates = useStore((s) => s.config.rates);
  const [period, setPeriod] = useState<Period>('month');

  const { rows, total, count, avg, commission } = useMemo(() => {
    const now = Date.now();
    const from =
      period === 'month'
        ? now - 30 * 24 * 3600 * 1000
        : period === 'quarter'
          ? now - 90 * 24 * 3600 * 1000
          : 0;
    const done = bookings
      .filter((b) => b.status === 'completed' && b.startMs >= from)
      .sort((a, b) => b.startMs - a.startMs);
    const sum = done.reduce((n, b) => n + b.price, 0);
    // Komisyon yalnız AYNA (online) randevularında; offline (bySalon/müşterisiz) hariç
    const onlineSum = done.filter((b) => !b.bySalon).reduce((n, b) => n + b.price, 0);
    return {
      rows: done.slice(0, 30),
      total: sum,
      count: done.length,
      avg: done.length ? Math.round(sum / done.length) : 0,
      commission: Math.round((onlineSum * (rates.commissionPct ?? 10)) / 100),
    };
  }, [bookings, period, rates.commissionPct]);

  return (
    <Screen edges={[]}>
      <StackHeader title={t('earnings.title')} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_CLEARANCE }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Dönem seçimi */}
        <View style={styles.chips}>
          {PERIODS.map((p) => (
            <Pressable
              key={p.key}
              onPress={() => setPeriod(p.key)}
              style={[styles.chip, period === p.key && styles.chipOn]}
            >
              <Text variant="caption" tone={period === p.key ? 'onAccent' : 'inkSoft'}>
                {t(p.labelKey)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Özet kartları */}
        <View style={styles.hero}>
          <Text variant="caption" tone="onAccent" style={styles.heroLabel}>
            {t('earnings.total')}
          </Text>
          <Text variant="display" tone="onAccent" style={styles.heroValue}>
            {formatPrice(total)}
          </Text>
          <Text variant="caption" tone="onAccent" style={styles.heroSub}>
            {count} {t('earnings.jobs')} · {t('earnings.avg')} {formatPrice(avg)}
          </Text>
        </View>
        <View style={styles.row2}>
          <View style={styles.stat}>
            <Text variant="caption" tone="muted">
              {t('earnings.commission')}
            </Text>
            <Text variant="bodyStrong" tone="ink">
              {formatPrice(commission)}
            </Text>
            <Text variant="caption" tone="muted">
              %{rates.commissionPct ?? 10} · {t('earnings.online_only')}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text variant="caption" tone="muted">
              {t('earnings.net')}
            </Text>
            <Text variant="bodyStrong" tone="accentFg">
              {formatPrice(Math.max(0, total - commission))}
            </Text>
            <Text variant="caption" tone="muted">
              {t('earnings.net_hint')}
            </Text>
          </View>
        </View>

        {/* İşlem listesi */}
        <Text variant="bodyStrong" tone="ink" style={styles.section}>
          {t('earnings.history')}
        </Text>
        {rows.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cash-outline" size={30} color={colors.muted} />
            <Text variant="caption" tone="muted" style={styles.emptyText}>
              {t('earnings.empty')}
            </Text>
          </View>
        ) : (
          rows.map((b) => (
            <View key={b.id} style={styles.item}>
              <View style={styles.itemBody}>
                <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                  {b.service}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {new Date(b.startMs).toLocaleDateString('tr-TR')}
                  {b.customerName ? ` · ${b.customerName}` : ''}
                  {b.bySalon ? ` · ${t('earnings.offline_tag')}` : ''}
                </Text>
              </View>
              <Text variant="bodyStrong" tone="ink">
                {formatPrice(b.price)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingTop: space(1), gap: space(1.25) },
    chips: { flexDirection: 'row', gap: space(1) },
    chip: {
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    chipOn: { backgroundColor: colors.accent },
    hero: {
      backgroundColor: colors.accentFg,
      borderRadius: radius.xl,
      padding: space(2.5),
      gap: 4,
      marginTop: space(0.5),
    },
    heroLabel: { opacity: 0.85 },
    heroValue: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
    heroSub: { opacity: 0.85 },
    row2: { flexDirection: 'row', gap: space(1.25) },
    stat: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
      gap: 3,
    },
    section: { fontSize: 16, marginTop: space(1.5) },
    empty: { alignItems: 'center', gap: space(1), paddingVertical: space(5) },
    emptyText: { textAlign: 'center' },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
    },
    itemBody: { flex: 1, gap: 2 },
  });
