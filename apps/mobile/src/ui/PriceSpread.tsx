import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useLocale } from '../locale';
import { radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * FİYAT ARALIĞI ŞERİDİ — "bu fiyat ucuz mu?" sorusunu tahmine bırakmaz.
 *
 * Tasarım kanvasındaki asıl katkı: gelen tekliflerin en düşük–en yüksek aralığı,
 * her teklifin bu aralıkta nerede durduğu ve ortalamanın çentiği tek bakışta.
 *
 * DÜRÜSTLÜK SINIRI: "bölge ortalaması" DEĞİL, "gelen tekliflerin ortalaması"
 * gösterilir — elimizde yalnız bu veri var, fazlasını iddia etmiyoruz.
 * Üç tekliften azında şerit anlamsızdır; hiç render edilmez.
 */
export function PriceSpread({
  prices,
  format,
}: {
  prices: number[];
  format: (n: number) => string;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  if (prices.length < 3) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const span = max - min;
  // Tüm teklifler aynı fiyattaysa şeridin anlatacağı bir şey yok.
  if (span <= 0) return null;
  const pos = (v: number) => ((v - min) / span) * 100;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text variant="label" tone="muted" style={styles.headLabel}>
          {t('quotes.spread.title')} · {prices.length}
        </Text>
        <Text numeric variant="meta" tone="ink">
          {format(min)} – {format(max)}
        </Text>
      </View>

      <View style={styles.track} accessibilityRole="image">
        <View style={styles.rail} />
        {/* Ortalama çentiği — rakamla birlikte, tahmin bırakmaz */}
        <View style={[styles.tick, { left: `${pos(avg)}%` }]} />
        {prices.map((p, i) => (
          <View
            key={`${p}-${i}`}
            style={[
              styles.dot,
              { left: `${pos(p)}%` },
              p === min && styles.dotMin,
              p === max && styles.dotMax,
            ]}
          />
        ))}
      </View>

      <View style={styles.avgRow}>
        <Text numeric variant="micro" tone="muted">
          {t('quotes.spread.avg')} {format(avg)}
        </Text>
      </View>

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
        <Text variant="caption" tone="muted" style={styles.noteText}>
          {t('quotes.spread.note')}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    card: {
      marginHorizontal: space(2.5),
      marginBottom: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1),
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    headLabel: { flex: 1 },
    track: { height: 26, justifyContent: 'center', marginHorizontal: 9 },
    rail: { height: 4, borderRadius: 2, backgroundColor: colors.bgSunken },
    tick: {
      position: 'absolute',
      top: 0,
      width: 2,
      height: 8,
      borderRadius: 1,
      marginLeft: -1,
      backgroundColor: colors.muted,
    },
    dot: {
      position: 'absolute',
      top: 6,
      width: 14,
      height: 14,
      borderRadius: 7,
      marginLeft: -7,
      backgroundColor: colors.line,
      borderWidth: 2,
      borderColor: colors.surface,
    },
    dotMin: { backgroundColor: colors.success },
    dotMax: { backgroundColor: colors.rose },
    avgRow: { alignItems: 'center', marginTop: -2 },
    note: { flexDirection: 'row', alignItems: 'flex-start', gap: space(0.875) },
    noteText: { flex: 1 },
  });
