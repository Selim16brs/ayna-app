import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../theme-context';

interface ScreenProps {
  children: ReactNode;
  /** Üst kısımda yumuşak gradyan bandı (hero ekranları için). */
  hero?: boolean;
  edges?: readonly Edge[];
  /**
   * Klavye kaçınmasını KAPAT.
   *
   * Neredeyse her ekran için doğru davranış açık olması; kapatmak yalnız
   * kendi klavye yönetimini yapan ekranlar için (ör. sohbet, kendi
   * `KeyboardAvoidingView`ini kuruyor). Varsayılan AÇIK: unutulan ekran
   * bozuk değil, doğru davransın.
   */
  keyboardAvoiding?: boolean;
}

/**
 * §12 — KLAVYE İÇERİĞİ ÖRTMESİN.
 *
 * 29 form ekranında klavye kaçınması YOKTU: küçük telefonda klavye hem
 * odaklanılan alanı hem gönder düğmesini örtüyordu ve kullanıcı formu
 * tamamlayamıyordu. Yalnız 4 ekran `KeyboardAvoidingView` kullanıyordu.
 *
 * Çözüm ORTAK bileşende: 29 ekranı tek tek düzeltmek hem eksik kalırdı hem
 * yeni ekranlar aynı hatayla doğardı.
 *
 * `padding` yalnız iOS'ta: Android'de `windowSoftInputMode=adjustResize`
 * zaten yeniden boyutlandırıyor, üstüne padding vermek çift sayar ve
 * içeriği fazladan yukarı iter.
 */
export function Screen({
  children,
  hero = false,
  edges = ['top', 'bottom'],
  keyboardAvoiding = true,
}: ScreenProps) {
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
        <KeyboardAvoidingView
          style={styles.safe}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={keyboardAvoiding}
        >
          <Animated.View style={styles.safe} entering={FadeIn.duration(280)}>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
});
