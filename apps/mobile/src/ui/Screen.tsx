import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../theme-context';

interface ScreenProps {
  children: ReactNode;
  /** Üst kısımda yumuşak gradyan bandı (hero ekranları için). */
  hero?: boolean;
  edges?: readonly Edge[];
}

export function Screen({ children, hero = false, edges = ['top', 'bottom'] }: ScreenProps) {
  const { colors, gradients } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {hero ? (
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <SafeAreaView style={styles.safe} edges={edges}>
        <Animated.View style={styles.safe} entering={FadeIn.duration(280)}>
          {children}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
});
