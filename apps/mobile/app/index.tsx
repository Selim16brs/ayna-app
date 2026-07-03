import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { Locale } from '@ayna/i18n';
import { useLocale } from '../src/locale';
import { Button, Screen, Text } from '../src/ui';
import { radius, space, type ColorTokens } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';

const LANGS: { code: Locale; label: string }[] = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'kk', label: 'Қазақша' },
  { code: 'ru', label: 'Русский' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { locale, setLocale, t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Screen hero>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Image
            source={require('../assets/logo-mark.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          {/* §1/§3.1 slogan — iki satır; "kadınların" ve "aynası" canlı pembe el yazısı */}
          <Text style={styles.slogan}>
            {t('slogan.l1a')}
            <Text style={styles.sloganWord}>{t('slogan.w1')}</Text>
            {'\n'}
            {t('slogan.l2a')}
            <Text style={styles.sloganWord}>{t('slogan.w2')}</Text>
            {t('slogan.l2b')}
          </Text>
          <Text variant="caption" tone="inkSoft" style={styles.value}>
            {t('welcome.value')}
          </Text>
        </View>

        <View style={styles.bottom}>
          {/* Dil seçimi — kalıcı; her açılışta sorulmaz (Profil > Dil'den değişir) */}
          <View style={styles.langRow}>
            {LANGS.map((l) => {
              const on = l.code === locale;
              return (
                <Pressable
                  key={l.code}
                  onPress={() => setLocale(l.code)}
                  style={[styles.langPill, on && { backgroundColor: colors.accent }]}
                >
                  <Text variant="caption" tone={on ? 'onAccent' : 'inkSoft'} style={styles.langText}>
                    {l.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Button label={t('auth.tab.login')} variant="primary" onPress={() => router.push('/auth/login')} />
          <Button label={t('auth.tab.register')} variant="secondary" onPress={() => router.push('/auth')} />
        </View>
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: space(3), justifyContent: 'space-between' },
    hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    logo: { width: 220, height: 190, tintColor: colors.ink },
    slogan: {
      fontSize: 27,
      lineHeight: 46,
      fontWeight: '700',
      letterSpacing: -0.3,
      color: colors.ink,
      textAlign: 'center',
      marginTop: space(1),
    },
    // "kadınların" ve "aynası" — canlı pembe, el yazısı (DancingScript)
    sloganWord: {
      fontFamily: 'DancingScript_700Bold',
      fontSize: 40,
      color: '#FF2D78',
    },
    value: { textAlign: 'center', marginTop: space(1.5), maxWidth: 300, lineHeight: 19 },
    bottom: { paddingBottom: space(4), gap: space(1.5) },
    langRow: { flexDirection: 'row', gap: space(1), justifyContent: 'center', marginBottom: space(1) },
    langPill: {
      paddingHorizontal: space(2),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
    },
    langText: { fontWeight: '700' },
  });
