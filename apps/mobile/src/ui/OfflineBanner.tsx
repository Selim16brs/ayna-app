import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cevrimdisiDurumu } from '../api';
import { useLocale } from '../locale';
import { space, type ColorTokens } from '../theme';
import { useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * ÇEVRİMDIŞI BANDI.
 *
 * Denetim #10: _"Ekranın üstünde kalıcı, kapatılamayan ince 'Çevrimdışısın'
 * bandı; bağlantı gelince otomatik kaybolur."_ Uygulamada hiçbir ağ durumu
 * göstergesi yoktu: bağlantı kesilince ekranlar sessizce boş kalıyordu ve
 * kullanıcı uygulamanın bozulduğunu sanıyordu.
 *
 * Kapatma düğmesi YOK — bilerek. Denetim "kapatılamayan" diyor: bant bir
 * bildirim değil, durum göstergesi; kapatılabilirse kullanıcı onu kapatıp
 * neden veri gelmediğini yine bilemez.
 */
export function OfflineBanner() {
  const { t } = useLocale();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [cevrimdisi, setCevrimdisi] = useState(cevrimdisiDurumu.get());

  useEffect(() => {
    // Dinleyici bir `boolean` döndürüyor (Set.delete); useEffect temizleyicisi
    // void beklediği için sarmalanıyor.
    const birak = cevrimdisiDurumu.dinle(setCevrimdisi);
    return () => {
      birak();
    };
  }, []);

  if (!cevrimdisi) return null;
  return (
    <View
      style={[styles.band, { paddingTop: insets.top + space(0.5) }]}
      accessibilityRole="alert"
      pointerEvents="none"
    >
      <Text variant="caption" style={styles.metin}>
        {t('common.offline')}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    band: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      // Her şeyin ÜSTÜNDE: modal ve sayfa başlıkları da bunu örtmemeli.
      zIndex: 999,
      backgroundColor: colors.inverse,
      paddingBottom: space(0.75),
      paddingHorizontal: space(2),
      alignItems: 'center',
    },
    metin: { color: colors.onInverse },
  });
