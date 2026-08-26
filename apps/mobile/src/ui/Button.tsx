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
              <Text variant="bodyStrong" style={[styles.label, styles.goldLabel]}>
                {label}
              </Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.base, variant === 'secondary' ? styles.secondary : styles.ghost]}>
            <View style={styles.inner}>
              {loading ? <ActivityIndicator size="small" color={colors.inkSoft} /> : null}
              <Text variant="bodyStrong" tone={variant === 'ghost' ? 'inkSoft' : 'ink'}>
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
    label: { fontSize: 16 },
    inner: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    goldLabel: { color: colors.onAccent, fontFamily: font.semibold },
    secondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    ghost: { backgroundColor: 'transparent' },
  });
