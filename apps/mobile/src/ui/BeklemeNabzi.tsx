import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { radius, space, type ColorTokens } from '../theme';
import { useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * BEKLEME NABZI — karşılıklı onay beklenen durumlarda "top karşı tarafta"
 * hissini veren animasyon.
 *
 * Neden gerekli: durum rozeti ("Uzman onayı bekleniyor") DURAĞAN bir etiket.
 * Kullanıcı ekranı açıp kapatıyor ve bir şeyin işlediğinden emin olamıyor —
 * özellikle uzmanın 3 saati ya da müşterinin ödeme beyanı gibi karşı tarafın
 * elindeki adımlarda. Nabız, "sistem çalışıyor, sıra sende değil" der.
 *
 * ERİŞİLEBİLİRLİK: cihazda "hareketi azalt" açıksa animasyon HİÇ çalışmaz,
 * sabit nokta çizilir. Vestibüler rahatsızlığı olan kullanıcı için sürekli
 * yanıp sönen bir öğe rahatsız edici olabilir; kararı kullanıcının sistem
 * ayarı veriyor.
 *
 * Ölçü: 1.6 saniyelik yumuşak nefes. Daha hızlısı "hata var" gibi okunuyor,
 * daha yavaşı fark edilmiyor.
 */
export function BeklemeNabzi({ metin, renk }: { metin: string; renk: string }) {
  const styles = useThemedStyles(makeStyles);
  const nabiz = useRef(new Animated.Value(0)).current;
  const azalt = useRef(false);

  useEffect(() => {
    let dongu: Animated.CompositeAnimation | null = null;
    let iptal = false;

    void AccessibilityInfo.isReduceMotionEnabled().then((acik) => {
      if (iptal) return;
      azalt.current = acik;
      if (acik) return; // hareket azaltılmış: sabit kal
      dongu = Animated.loop(
        Animated.sequence([
          Animated.timing(nabiz, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(nabiz, {
            toValue: 0,
            duration: 800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      dongu.start();
    });

    return () => {
      iptal = true;
      // Ekran kapanınca döngü DURDURULMALI: aksi hâlde arka planda dönmeye
      // devam eder ve her açılan kart bir animasyon daha bırakır.
      dongu?.stop();
    };
  }, [nabiz]);

  const olcek = nabiz.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const saydam = nabiz.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] });

  return (
    <View style={styles.kap}>
      <View style={styles.nabizKap}>
        {/* Dışta genişleyen halka — "sinyal gidiyor" hissi. */}
        <Animated.View
          style={[
            styles.halka,
            { backgroundColor: renk, opacity: saydam, transform: [{ scale: olcek }] },
          ]}
        />
        {/* İçte sabit nokta: animasyon kapalıyken de bir şey görünmeli. */}
        <View style={[styles.nokta, { backgroundColor: renk }]} />
      </View>
      <Text variant="caption" tone="muted" style={styles.metin}>
        {metin}
      </Text>
    </View>
  );
}

const makeStyles = (_colors: ColorTokens) =>
  StyleSheet.create({
    kap: { flexDirection: 'row', alignItems: 'center', gap: space(1.25) },
    nabizKap: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
    halka: { position: 'absolute', width: 16, height: 16, borderRadius: radius.pill },
    nokta: { width: 8, height: 8, borderRadius: radius.pill },
    metin: { flex: 1, lineHeight: 18 },
  });
