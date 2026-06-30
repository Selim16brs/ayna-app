import { useRef } from 'react';
import { Animated, Pressable, type PressableProps, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { type ColorTokens, radius, space } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
}

export function Button({
  label,
  variant = 'primary',
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const { gradients, shadow } = useTheme();
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
            <Text variant="bodyStrong" style={[styles.label, styles.goldLabel]}>
              {label}
            </Text>
          </LinearGradient>
        ) : (
          <View style={[styles.base, variant === 'secondary' ? styles.secondary : styles.ghost]}>
            <Text variant="bodyStrong" tone={variant === 'ghost' ? 'inkSoft' : 'ink'}>
              {label}
            </Text>
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
    goldLabel: { color: colors.onColor, fontWeight: '700' },
    secondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    ghost: { backgroundColor: 'transparent' },
  });
