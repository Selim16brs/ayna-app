import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { space, type ColorTokens } from '../theme';
import { useLocale } from '../locale';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * Ortak bölüm başlığı (Keşfet dili): dev kalın başlık + opsiyonel "Tümü >" aksiyonu.
 * Küçük gri uppercase etiket DEĞİL.
 */
export function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Text variant="h2" tone="ink" style={styles.title}>
        {title}
      </Text>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} style={styles.seeAll} hitSlop={8}>
          <Text variant="caption" tone="muted">
            {t('common.see_all')}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (_colors: ColorTokens) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: space(3),
      marginTop: space(3.5),
      marginBottom: space(1.75),
    },
    title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
    seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  });
