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
      {/*
       * TEK SATIR. Kurucu: "Kazakçada Yakında yazısında son harf alta
       * düşüyor."
       *
       * Sebep kırpma değil SARMAYDI. Kategori hücresi 68px; rozet metni
       * Kazakçada ("Жақында") 54,7px ve eski yatay dolgusuyla toplam
       * 68,7px ediyordu — bir piksel taşıyor, son harf alt satıra
       * geçiyordu. (Türkçe 60,1px, Rusça 51,6px olduğu için yalnız
       * Kazakçada görünüyordu.)
       *
       * `numberOfLines` sarmayı kapatıyor; küçültme ise ileride daha uzun
       * bir çeviri gelirse kırpılma yerine ölçek veriyor. Dolgu da
       * daraltıldı: ölçü `yakinda-rozeti.test.ts` içinde FONTTAN
       * hesaplanarak sınanıyor.
       */}
      <Text
        variant="micro"
        tone="muted"
        style={styles.yazi}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {t('catalog.soon')}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    rozet: {
      paddingHorizontal: space(0.5),
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
