import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../theme';

interface ScreenProps {
  children: ReactNode;
  /** Üst kısımda yumuşak gradyan bandı (hero ekranları için). */
  hero?: boolean;
  edges?: readonly Edge[];
}

export function Screen({ children, hero = false, edges = ['top', 'bottom'] }: ScreenProps) {
  return (
    <View style={styles.root}>
      {hero ? (
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <SafeAreaView style={styles.safe} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
});
