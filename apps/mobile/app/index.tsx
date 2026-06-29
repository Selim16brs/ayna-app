import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type { Locale } from '@ayna/i18n';
import { useLocale } from '../src/locale';
import { Button, Screen, Text } from '../src/ui';
import { colors, space } from '../src/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const { setLocale, t } = useLocale();

  function choose(locale: Locale) {
    setLocale(locale);
    router.replace('/discover');
  }

  return (
    <Screen hero>
      <View style={styles.container}>
        <View style={styles.hero}>
          {/* Logo işareti (iki profil + A) buraya gelecek — dosya eklenince:
              <Image source={require('../assets/logo-mark.png')} style={styles.mark} /> */}
          <View style={styles.markRule} />
          <Text variant="display" tone="gold" style={styles.wordmark}>
            AYNA
          </Text>
          <Text variant="caption" tone="inkSoft" style={styles.tagline}>
            {t('app.tagline')}
          </Text>
        </View>

        <View style={styles.choice}>
          <Text variant="label" tone="gold" style={styles.choiceLabel}>
            {t('language.choose')}
          </Text>
          <Button label="Türkçe" variant="primary" onPress={() => choose('tr')} />
          <Button label="Қазақша" variant="secondary" onPress={() => choose('kk')} />
          <Button label="Русский" variant="secondary" onPress={() => choose('ru')} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: space(3),
    justifyContent: 'space-between',
  },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  markRule: {
    width: 40,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.gold,
    marginBottom: space(3),
  },
  wordmark: { fontSize: 64, letterSpacing: 14 },
  tagline: { marginTop: space(1.5), letterSpacing: 0.3 },
  choice: { paddingBottom: space(4), gap: space(1.5) },
  choiceLabel: { textAlign: 'center', marginBottom: space(1) },
});
