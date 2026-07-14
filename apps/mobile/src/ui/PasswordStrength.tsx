import { StyleSheet, View } from 'react-native';
import { passwordScore, PWD_LEVEL_KEY } from '../formValidation';
import { useLocale } from '../locale';
import { type ColorTokens, radius, space } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

// Şifre gücü göstergesi — 3 segmentli çubuk + etiket (zayıf/orta/güçlü). Yalnız yazınca görünür.
export function PasswordStrength({ password }: { password: string }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  if (!password) return null;
  const score = passwordScore(password); // 1..3
  const tone = score >= 3 ? colors.success : score === 2 ? colors.gold : colors.danger;
  return (
    <View style={styles.wrap}>
      <View style={styles.bars}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.bar, { backgroundColor: i <= score ? tone : colors.line }]}
          />
        ))}
      </View>
      <Text variant="caption" style={{ color: tone }}>
        {t(PWD_LEVEL_KEY[(score < 1 ? 1 : score) as 1 | 2 | 3])}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      marginTop: space(0.75),
    },
    bars: { flexDirection: 'row', gap: space(0.5), flex: 1 },
    bar: { flex: 1, height: 5, borderRadius: radius.pill, backgroundColor: colors.line },
  });
