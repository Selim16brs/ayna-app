import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { fillParams, useLocale } from '../locale';
import { localDeposit, useStore } from '../store';
import { type ColorTokens, radius, space, font } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

// §B5 (ayna2) — iptal politikası şeffaflığı: kapora/iptal/no-show kuralları talep ve
// randevu ekranlarında STANDART kartla her zaman görünür (sürpriz yok → itiraz yok).
// `price` verilirse O randevunun gerçek kaporası yazılır; verilmezse kural
// (yüzde + alt/üst sınır) yazılır. Eskiden her iki durumda da sabit "1.000 ₸"
// gösteriliyordu — kapora oranlı hâle gelince bu doğrudan yanlış bilgi olurdu.
export function RulesCard({ price }: { price?: number }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const rates = useStore((s) => s.config.rates);

  const kzt = (n: number) => `${n.toLocaleString('tr-TR')} ₸`;
  const depositLine =
    price && price > 0
      ? kzt(localDeposit(price, rates))
      : fillParams(t('rules.deposit_rule'), {
          pct: String(rates.depositPct ?? 10),
          min: kzt(rates.depositMin ?? 1000),
          max: kzt(rates.depositMax ?? 5000),
        });

  const rows = [
    `${t('rules.deposit')}: ${depositLine}`,
    `${t('rules.cancel_a')} ${rates.cancelWindowH} ${t('rules.cancel_b')}`,
    t('rules.noshow'),
  ];

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.accentFg} />
        <Text variant="caption" tone="accentFg" style={styles.title}>
          {t('rules.title')}
        </Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.dot} />
          <Text variant="caption" tone="inkSoft" style={styles.text}>
            {r}
          </Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.accentSoft,
      borderRadius: radius.lg,
      padding: space(1.75),
      gap: space(0.75),
      marginTop: space(2),
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: { fontFamily: font.semibold },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: space(1) },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.accentFg,
      marginTop: 6,
    },
    text: { flex: 1, lineHeight: 17 },
  });
