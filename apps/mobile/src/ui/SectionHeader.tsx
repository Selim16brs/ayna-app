import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { space, type ColorTokens, font } from '../theme';
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
      {/*
        Başlık HARF KAYBETMEZ. Satır `space-between` ve iki çocuk da
        esnemiyorsa, uzun bir başlık sessizce kırpılıyor — Keşfet'te
        "Hizmetler" → "Hizmetle" diye görülmüştü. Başlık daralabilir ve
        sığmazsa puntosu iner; "Tümü >" daralmaz.
      */}
      <Text
        variant="h2"
        tone="ink"
        style={styles.title}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
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
    title: { fontSize: 20, fontFamily: font.semibold, letterSpacing: -0.4, flexShrink: 1 },
    seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
  });
