import { StyleSheet, View } from 'react-native';
import { useLocale } from '../locale';
import { radius, space, type ColorTokens } from '../theme';
import { useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * "YAKINDA" ROZETİ — brief §7.4.
 *
 * SESSİZ BİR ROZET. Kategoriyi kapatmıyor, uyarı da değil: "burada henüz
 * uzman yok ama talebini bırakabilirsin" diyor. Bu yüzden aksan rengiyle
 * ya da uyarı sarısıyla değil, nötr yüzeyle çiziliyor — göze batan bir
 * rozet kullanıcıyı kategoriden çevirir, oysa amaç talebi TOPLAMAK.
 *
 * İki ölçü: `kutu` ızgaradaki karenin köşesine oturuyor, `satir` liste
 * satırında adın yanında duruyor.
 */
export function YakindaRozeti({ tarz = 'satir' }: { tarz?: 'satir' | 'kutu' }) {
  const { t } = useLocale();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.rozet, tarz === 'kutu' && styles.kutu]}>
      <Text variant="micro" tone="muted" style={styles.yazi}>
        {t('catalog.soon')}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    rozet: {
      paddingHorizontal: space(0.75),
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line,
      alignSelf: 'flex-start',
    },
    // Izgarada kutunun ÜSTÜNE binmiyor: altında duruyor. Üstüne binseydi
    // ikonun bir kısmını kapatırdı ve ikon zaten kategorinin kimliği.
    kutu: { marginTop: 2 },
    yazi: { letterSpacing: 0.2 },
  });
