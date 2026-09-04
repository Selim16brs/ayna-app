import { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { type ColorTokens, radius, space, font } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * UZUN ETİKET SORUNU.
 *
 * `base` yüksekliği SABİT 56pt ve etikette satır sınırı yoktu. Türkçe etiketler
 * sığıyordu; Rusça karşılıkları 8-10 karakter daha uzun ("Получить предложение
 * на эту услугу" 34 karakter). Sığmayan etiket iki satıra sarıyor, 56pt'lik kap
 * büyümediği için ikinci satır KIRPILIYORDU — hata yalnız ru/kk'da görünür,
 * Türkçe geliştirme sırasında hiç fark edilmez.
 *
 * Çözüm sarmayı değil ÖLÇEĞİ kısıyor: tek satır + %75'e kadar küçülme. Düğmenin
 * yüksekliği ve hap biçimi bozulmuyor, etiket okunur kalıyor.
 */
type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  /** Polish 1.4 — görünür yükleme durumu: spinner + pasifleşme (çift dokunuş imkânsız). */
  loading?: boolean;
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const { colors, gradients, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

  return (
    <Pressable
      onPressIn={(e) => {
        animate(0.97);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animate(1);
        onPressOut?.(e);
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled || loading, busy: loading }}
      disabled={disabled || loading}
      {...rest}
    >
      {/*
        DÜĞME YAZISI PUNTO KÜÇÜLTMÜYOR.

        `adjustsFontSizeToFit` vardı ve React Native ölçü genişliği belirsiz
        olduğunda puntoyu `minimumFontScale`i de aşarak indiriyor: kurucunun
        ekran görüntüsünde "Yeni saat seç" birkaç piksellik bir lekeydi,
        hizmet ekranındaki "Ekle" düğmesinde de aynısı olmuştu. Sığmayan
        yazı artık kırpılıyor — kırpılmış yazı okunur, küçülmüş yazı değil.
      */}
      <Animated.View style={{ transform: [{ scale }] }}>
        {variant === 'primary' ? (
          <LinearGradient
            colors={gradients.gold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.base, shadow.soft]}
          >
            <View style={styles.inner}>
              {loading ? <ActivityIndicator size="small" color={colors.onAccent} /> : null}
              <Text variant="bodyStrong" style={[styles.label, styles.goldLabel]} numberOfLines={1}>
                {label}
              </Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.base, variant === 'secondary' ? styles.secondary : styles.ghost]}>
            <View style={styles.inner}>
              {loading ? <ActivityIndicator size="small" color={colors.inkSoft} /> : null}
              <Text
                variant="bodyStrong"
                tone={variant === 'ghost' ? 'inkSoft' : 'ink'}
                style={styles.label}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    base: {
      height: 56,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space(3),
    },
    label: { fontSize: 16, flexShrink: 1, textAlign: 'center' },
    inner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(1),
      maxWidth: '100%',
    },
    goldLabel: { color: colors.onAccent, fontFamily: font.semibold },
    secondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    ghost: { backgroundColor: 'transparent' },
  });
