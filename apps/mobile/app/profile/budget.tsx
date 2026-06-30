import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { formatPrice } from '../../src/data';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, Text } from '../../src/ui';

const LIMIT = 80000;

export default function BudgetScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const bookings = useStore((s) => s.bookings);
  const completed = useMemo(() => bookings.filter((b) => b.status === 'completed'), [bookings]);
  const spent = completed.reduce((n, b) => n + b.price, 0);
  const remaining = Math.max(LIMIT - spent, 0);
  const progress = Math.min(spent / LIMIT, 1);

  // Kategori = işletme bazlı kırılım
  const byCategory = completed.reduce<Record<string, number>>((acc, b) => {
    acc[b.proName] = (acc[b.proName] ?? 0) + b.price;
    return acc;
  }, {});
  const categories = Object.entries(byCategory);

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('budget.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" tone="muted" style={styles.subtitle}>
          {t('budget.subtitle')}
        </Text>

        {/* Özet kartı */}
        <View style={[styles.card, shadow.soft]}>
          <Text variant="caption" tone="muted">
            {t('budget.spent')}
          </Text>
          <Text variant="display" tone="ink">
            {formatPrice(spent)}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.cardFoot}>
            <Text variant="caption" tone="muted">
              {t('budget.limit')}: {formatPrice(LIMIT)}
            </Text>
            <Text variant="caption" style={{ color: colors.sage }}>
              {t('budget.remaining')}: {formatPrice(remaining)}
            </Text>
          </View>
        </View>

        {/* Kategoriye göre */}
        <Text variant="label" tone="rose" style={styles.section}>
          {t('budget.by_category')}
        </Text>
        {categories.length === 0 ? (
          <View style={[styles.group, styles.empty]}>
            <Text variant="body" tone="muted">
              {t('budget.no_spend')}
            </Text>
          </View>
        ) : (
          <View style={styles.group}>
            {categories.map(([name, amount], i) => (
              <View key={name} style={[styles.row, i < categories.length - 1 && styles.rowBorder]}>
                <View style={[styles.icon, { backgroundColor: colors.roseSoft }]}>
                  <Ionicons name="storefront-outline" size={17} color={colors.rose} />
                </View>
                <Text variant="bodyStrong" tone="ink" style={styles.rowLabel} numberOfLines={1}>
                  {name}
                </Text>
                <Text variant="bodyStrong" tone="ink">
                  {formatPrice(amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Harcama geçmişi */}
        <Text variant="label" tone="rose" style={styles.section}>
          {t('budget.history')}
        </Text>
        {completed.length === 0 ? (
          <View style={[styles.group, styles.empty]}>
            <Text variant="body" tone="muted">
              {t('budget.no_spend')}
            </Text>
          </View>
        ) : (
          <View style={styles.group}>
            {completed.map((b, i) => (
              <View
                key={b.id}
                style={[styles.historyRow, i < completed.length - 1 && styles.rowBorder]}
              >
                <View style={styles.historyText}>
                  <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                    {b.proName}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {b.service} · {b.dateLabel}
                  </Text>
                </View>
                <Text variant="bodyStrong" tone="ink">
                  {formatPrice(b.price)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4) },
    subtitle: { marginBottom: space(2) },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(2.5),
      gap: space(0.5),
    },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surfaceMuted,
      marginTop: space(1.5),
      marginBottom: space(1.25),
      overflow: 'hidden',
    },
    fill: { height: 8, borderRadius: 4, backgroundColor: colors.rose },
    cardFoot: { flexDirection: 'row', justifyContent: 'space-between' },
    section: { marginTop: space(3), marginBottom: space(1.5) },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
    },
    empty: { padding: space(2.5), alignItems: 'center' },
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
    rowLabel: { flex: 1 },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(2),
      paddingVertical: space(1.5),
    },
    historyText: { flex: 1, gap: 2 },
  });
