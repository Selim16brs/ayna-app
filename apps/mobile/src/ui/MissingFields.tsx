import { Ionicons } from '@expo/vector-icons';
import type { MessageKey } from '@ayna/i18n';
import { StyleSheet, View } from 'react-native';
import { useLocale } from '../locale';
import { type ColorTokens, radius, space } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * Neyin eksik olduğunu gösteren şerit.
 *
 * `hata` verilirse ŞERİT KIRMIZI ve metin doğrudan yazılıyor: "eksik
 * alan" ile "bu numara zaten kayıtlı" aynı tonda görünmemeli — ikincisi
 * kullanıcının düzeltmesi gereken bir ÇAKIŞMA, eksik alan ise henüz
 * doldurulmamış bir yer.
 */
export function MissingFields({ keys, hata }: { keys: MessageKey[]; hata?: string | null }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  if (hata) {
    return (
      <View style={[styles.wrap, styles.wrapHata]}>
        <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
        <Text variant="caption" style={[styles.text, { color: colors.danger }]}>
          {hata}
        </Text>
      </View>
    );
  }
  if (!keys.length) return null;
  return (
    <View style={styles.wrap}>
      <Ionicons name="information-circle-outline" size={15} color={colors.inkSoft} />
      <Text variant="caption" tone="inkSoft" style={styles.text}>
        {t('auth.f.missing')}: {keys.map((k) => t(k)).join(' · ')}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space(0.75),
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1.25),
      marginTop: space(1),
    },
    wrapHata: { backgroundColor: colors.dangerSoft },
    text: { flex: 1, lineHeight: 18 },
  });
