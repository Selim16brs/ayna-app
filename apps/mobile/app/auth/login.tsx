import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../../src/api';
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
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);

  // Polish 1.2 — pasifin NEDENİ görünür: alan altı canlı ipuçları
  const idTrim = id.trim();
  const idOk =
    idTrim.length > 3 && (idTrim.includes('@') || idTrim.replace(/\D/g, '').length >= 10);
  const pwOk = password.length >= 6;
  const valid = idOk && pwOk;
  const firstIssueKey = !idOk ? 'auth.login.hint_id' : !pwOk ? 'auth.login.hint_pw' : null;

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
    } catch (e) {
      // 429 = hız limiti: "şifre hatalı" DEĞİL — kullanıcıya beklemesini söyle
      Alert.alert(
        e instanceof ApiError && e.status === 429
          ? t('auth.error.rate_limited')
          : t('auth.error.bad'),
      );
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
        {idTrim.length > 0 && !idOk ? (
          <Text variant="caption" tone="muted" style={styles.fieldHint}>
            {t('auth.login.hint_id')}
          </Text>
        ) : null}

        <Text variant="bodyStrong" tone="ink" style={styles.label}>
          {t('auth.f.password')}
        </Text>
        <View style={styles.secureWrap}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••"
            placeholderTextColor={colors.muted}
            secureTextEntry={hidden}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.secureInput}
          />
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} style={styles.eyeBtn}>
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.inkSoft}
            />
          </Pressable>
        </View>
        {password.length > 0 && !pwOk ? (
          <Text variant="caption" tone="muted" style={styles.fieldHint}>
            {t('auth.login.hint_pw')}
          </Text>
        ) : null}

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
          loading={busy}
          onPress={() => {
            // Polish 1.2 — eksikken sessizce ölü buton yok: ilk eksiği söyle
            if (!valid) {
              if (firstIssueKey) Alert.alert(t(firstIssueKey));
              return;
            }
            void submit();
          }}
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
    secureWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 54,
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      paddingRight: space(1.5),
    },
    secureInput: {
      flex: 1,
      height: '100%',
      paddingHorizontal: space(2),
      fontWeight: '500',
      fontSize: 16,
      color: colors.ink,
    },
    eyeBtn: { padding: space(0.75) },
    fieldHint: { marginTop: space(0.75), marginLeft: space(0.5) },
    forgotRow: { alignItems: 'flex-end', marginTop: space(1.5) },
    forgot: { fontWeight: '700' },
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: space(3),
    },
  });
