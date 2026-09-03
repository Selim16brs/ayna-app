import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { type SplashSonucu } from '@ayna/domain';
import { font, space } from '../theme';
import { mesajPuntosu, okumaSuresi } from '../acilis-olcu';
import { useTheme } from '../theme-context';

/**
 * AÇILIŞ MESAJI EKRANI — `AYNA_ACILIS_MESAJLARI_BRIEF.md` §5 ve §6.
 *
 * ── SÜRE YÜKLEMEYE EK BEKLEME YARATMIYOR ────────────────────────────────
 *
 * Brief §6.1: "Splash hiçbir koşulda yüklemeye EK bekleme yaratmaz,
 * yalnızca paralel akar." Ekran kendi süresini sayıyor; uygulama hazır
 * olduğunda `hazir` true oluyor. Geçiş İKİSİ de tamamlanınca başlıyor.
 *
 * ── DOKUNMA GEÇER ───────────────────────────────────────────────────────
 *
 * Süre dolmasa da ekrana dokunmak mesajı atlıyor. Kullanıcıyı okuduğu bir
 * metnin başında bekletmek, hızlı açılış beklentisine ters.
 *
 * ── HAREKETİ AZALT ──────────────────────────────────────────────────────
 *
 * Brief §5.3: sistemde "hareketi azalt" açıksa animasyonlar basit fade'e
 * düşüyor — süzülme ve ölçek kapanıyor.
 */

export function AcilisMesaji({
  sonuc,
  hazir,
  bitti,
}: {
  sonuc: SplashSonucu;
  /** Uygulama açılışı tamamlandı mı? */
  hazir: boolean;
  bitti: () => void;
}) {
  const { colors, mode } = useTheme();
  const [azHareket, setAzHareket] = useState(false);
  const metinOpaklik = useRef(new Animated.Value(0)).current;
  const metinKayma = useRef(new Animated.Value(14)).current;
  const logoOpaklik = useRef(new Animated.Value(0)).current;
  const kapanis = useRef(new Animated.Value(1)).current;
  const sureDoldu = useRef(false);
  const kapandi = useRef(false);

  useEffect(() => {
    let canli = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => canli && setAzHareket(v));
    return () => {
      canli = false;
    };
  }, []);

  // Giriş: mesaj fade + hafif süzülme, logo ~200 ms sonra (brief §6.2).
  useEffect(() => {
    const sure = azHareket ? 220 : 520;
    Animated.parallel([
      Animated.timing(metinOpaklik, { toValue: 1, duration: sure, useNativeDriver: true }),
      Animated.timing(metinKayma, {
        toValue: 0,
        duration: azHareket ? 0 : sure,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoOpaklik, {
        toValue: 0.65,
        duration: sure,
        delay: azHareket ? 0 : 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [azHareket, logoOpaklik, metinKayma, metinOpaklik]);

  /**
   * Kapanış — cross-fade + hafif ölçek (brief §6.2).
   *
   * `useRef` içinde tutuluyor ve her render'da tazeleniyor: zamanlayıcı
   * kurulduğu andaki `azHareket`/`hazir` değerlerine çakılı kalmasın.
   * `kapandi` bayrağı ikinci çağrıyı yutuyor — dokunuş ve zamanlayıcı
   * aynı anda tetiklenirse geçiş iki kez başlardı.
   */
  const kapat = useRef<() => void>(() => undefined);
  kapat.current = () => {
    if (kapandi.current) return;
    kapandi.current = true;
    Animated.timing(kapanis, {
      toValue: 0,
      duration: azHareket ? 200 : 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => bitti());
  };

  // Süre + yükleme: İKİSİ de tamamlanınca kapanıyor.
  useEffect(() => {
    const t = setTimeout(() => {
      sureDoldu.current = true;
      if (hazir) kapat.current();
    }, okumaSuresi(sonuc.metin));
    return () => clearTimeout(t);
  }, [sonuc.metin, hazir]);

  useEffect(() => {
    if (hazir && sureDoldu.current) kapat.current();
  }, [hazir]);

  const punto = mesajPuntosu(sonuc.metin);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.kap,
        {
          backgroundColor: colors.bg,
          opacity: kapanis,
          transform: [
            {
              scale: azHareket
                ? 1
                : kapanis.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1] }),
            },
          ],
        },
      ]}
    >
      {/* Dokunmak geçiyor — brief §6.1. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => kapat.current()} />
      <View style={styles.orta} pointerEvents="none">
        <Animated.Text
          style={[
            styles.mesaj,
            {
              color: colors.ink,
              fontSize: punto,
              lineHeight: Math.round(punto * 1.42),
              opacity: metinOpaklik,
              transform: [{ translateY: metinKayma }],
            },
          ]}
        >
          {sonuc.metin}
        </Animated.Text>
        {/* Logo imza gibi: mesajın altında, düşük ağırlıkta (brief §5.1). */}
        <Animated.View style={{ opacity: logoOpaklik }}>
          <Image
            /*
             * Tema kipi RENK KARŞILAŞTIRMASIYLA anlaşılmıyor.
             *
             * İlk sürümüm koyu temayı zemin renginin değerine bakarak
             * anlıyordu. Palet değerini bir yere daha kopyalamak demekti;
             * koyu tema zemini ayarlandığı gün logo sessizce yanlış
             * varyanta düşerdi. (Renk kodunu buraya yazmıyorum bile —
             * uygulamadaki bekçi test yorumları da tarıyor ve haklı.)
             * Uygulamada bunu yasaklayan bir test zaten vardı ve beni
             * yakaladı.
             */
            source={
              mode === 'dark'
                ? require('../../assets/logo-ayna-white.png')
                : require('../../assets/logo-ayna.png')
            }
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  kap: { alignItems: 'center', justifyContent: 'center' },
  orta: { alignItems: 'center', paddingHorizontal: space(4), gap: space(4) },
  mesaj: { fontFamily: font.script, textAlign: 'center' },
  logo: { width: 84, height: 32 },
});
