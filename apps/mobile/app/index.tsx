import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Locale } from '@ayna/i18n';
import { useLocale } from '../src/locale';
import { theme } from '../src/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const { setLocale, t } = useLocale();

  function choose(locale: Locale) {
    setLocale(locale);
    router.push('/home');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.wordmark}>AYNA</Text>
        <Text style={styles.tagline}>{t('app.tagline')}</Text>
      </View>

      <View style={styles.choice}>
        <Text style={styles.choiceLabel}>{t('language.choose')}</Text>
        <Pressable style={styles.langButton} onPress={() => choose('tr')}>
          <Text style={styles.langText}>Türkçe</Text>
        </Pressable>
        <Pressable style={[styles.langButton, styles.langButtonAlt]} onPress={() => choose('kk')}>
          <Text style={[styles.langText, styles.langTextAlt]}>Қазақша</Text>
        </Pressable>
        <Pressable style={[styles.langButton, styles.langButtonAlt]} onPress={() => choose('ru')}>
          <Text style={[styles.langText, styles.langTextAlt]}>Русский</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingHorizontal: theme.spacing(3),
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    color: theme.colors.primary,
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: 8,
  },
  tagline: {
    color: theme.colors.muted,
    fontSize: 16,
    marginTop: theme.spacing(2),
    textAlign: 'center',
  },
  choice: {
    paddingBottom: theme.spacing(4),
    gap: theme.spacing(1.5),
  },
  choiceLabel: {
    color: theme.colors.text,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: theme.spacing(1),
  },
  langButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing(2),
    borderRadius: theme.radius.pill,
    alignItems: 'center',
  },
  langButtonAlt: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  langText: {
    color: theme.colors.bg,
    fontSize: 17,
    fontWeight: '700',
  },
  langTextAlt: {
    color: theme.colors.text,
  },
});
