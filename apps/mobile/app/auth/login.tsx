import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { api } from '../../src/api';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text, TextInput } from '../../src/ui';

/**
 * §3.3 — TEK giriş ekranı: telefon/e-posta + şifre. Sistem rolü tanır ve ilgili arayüze
 * yönlendirir (Kullanıcı/Uzman/Salon). "Şifremi Unuttum" → SMS OTP ile sıfırlama.
 */
export default function LoginScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const setAuth = useStore((s) => s.setAuth);

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const valid = id.trim().length > 3 && password.length >= 6;

  async function submit() {
    setBusy(true);
    try {
      const session = await api.login({ identifier: id.trim(), password });
      setAuth(session);
      // §3.3/§9/§10 rol bazlı yönlendirme: SALON → salon paneli, UZMAN → uzman paneli, kullanıcı → keşfet
      const role = session.user.role;
      router.replace(
        role === 'salon'
          ? '/salon/home'
          : role === 'professional'
            ? '/seller/reports'
            : '/discover',
      );
    } catch {
      Alert.alert(t('auth.error.bad'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={[]}>
      <StackHeader title={t('auth.tab.login')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="body" tone="inkSoft" style={styles.subtitle}>
          {t('auth.login.subtitle')}
        </Text>

        <Text variant="bodyStrong" tone="ink" style={styles.label}>
          {t('auth.f.identifier')}
        </Text>
        <TextInput
          value={id}
          onChangeText={setId}
          placeholder="+7 700 123 45 67"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <Text variant="bodyStrong" tone="ink" style={styles.label}>
          {t('auth.f.password')}
        </Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••"
          placeholderTextColor={colors.muted}
          secureTextEntry
          style={styles.input}
        />

        <View style={styles.forgotRow}>
          <Text
            variant="caption"
            tone="accentFg"
            style={styles.forgot}
            onPress={() => router.push('/auth/forgot')}
          >
            {t('auth.login.forgot')}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('auth.tab.login')}
          variant={valid && !busy ? 'primary' : 'secondary'}
          disabled={!valid || busy}
          onPress={submit}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4), paddingTop: space(1) },
    subtitle: { marginBottom: space(3) },
    label: { marginTop: space(2), marginBottom: space(1) },
    input: {
      height: 54,
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      fontWeight: '500',
      fontSize: 16,
      color: colors.ink,
    },
    forgotRow: { alignItems: 'flex-end', marginTop: space(1.5) },
    forgot: { fontWeight: '700' },
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: space(3),
    },
  });
