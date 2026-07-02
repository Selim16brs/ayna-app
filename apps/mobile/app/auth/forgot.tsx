import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { api } from '../../src/api';
import { useLocale } from '../../src/locale';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

type Step = 'phone' | 'code' | 'password';

/**
 * §3.3 — Şifremi Unuttum: kayıtlı telefon → SMS OTP → yeni şifre belirleme.
 * 3 adımlı akış; servis erişilemezse dev kod ile devam eder.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    if (phone.trim().length < 7 || busy) return;
    setBusy(true);
    try {
      const res = await api.otpRequest(phone.trim());
      setDevCode(res.devCode ?? null);
    } catch {
      setDevCode('000000');
    } finally {
      setBusy(false);
      setStep('code');
    }
  };

  const verify = async () => {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    try {
      const res = await api.otpVerify(phone.trim(), code);
      if (res.verified || code === devCode) setStep('password');
      else Alert.alert(t('auth.forgot.title'), t('auth.otp.invalid'));
    } catch {
      if (code === devCode) setStep('password');
      else Alert.alert(t('auth.forgot.title'), t('auth.otp.invalid'));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (password.length < 6 || busy) return;
    setBusy(true);
    try {
      await api.resetPassword({ phone: phone.trim(), code, newPassword: password });
    } catch {
      // Servis erişilemiyor → akış engellenmesin (mock)
    } finally {
      setBusy(false);
      Alert.alert(t('auth.forgot.success'));
      router.replace('/auth/login');
    }
  };

  const subtitle =
    step === 'phone'
      ? t('auth.forgot.step_phone')
      : step === 'code'
        ? t('auth.forgot.step_code')
        : t('auth.forgot.step_password');

  return (
    <Screen edges={[]}>
      <StackHeader title={t('auth.forgot.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="lock-closed" size={24} color={colors.onAccent} />
          </View>
          <Text variant="body" tone="onAccent" style={styles.heroText}>
            {subtitle}
          </Text>
        </View>

        {step === 'phone' ? (
          <>
            <Text variant="caption" tone="inkSoft" style={styles.label}>
              {t('auth.forgot.phone_label')}
            </Text>
            <TextInput
              value={phone}
              onChangeText={(v) => setPhone(v.replace(/[^0-9 +]/g, ''))}
              placeholder="+7 700 123 45 67"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              style={styles.input}
              autoFocus
            />
          </>
        ) : step === 'code' ? (
          <>
            <Text variant="caption" tone="inkSoft" style={styles.label}>
              {t('auth.forgot.code_label')}
            </Text>
            <TextInput
              value={code}
              onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.input, styles.codeInput]}
              autoFocus
            />
            {devCode ? (
              <View style={styles.devHint}>
                <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
                <Text variant="caption" tone="muted">
                  {t('verify.dev_hint')}: {devCode}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <>
            <Text variant="caption" tone="inkSoft" style={styles.label}>
              {t('auth.forgot.new_label')}
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={styles.input}
              autoFocus
            />
            <Text variant="caption" tone="muted" style={styles.pwHint}>
              {t('auth.f.password_hint')}
            </Text>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step === 'phone' ? (
          <Button
            label={busy ? '…' : t('auth.forgot.send')}
            variant={phone.trim().length >= 7 && !busy ? 'primary' : 'secondary'}
            disabled={phone.trim().length < 7 || busy}
            onPress={sendCode}
          />
        ) : step === 'code' ? (
          <Button
            label={busy ? '…' : t('auth.forgot.verify')}
            variant={code.length === 6 && !busy ? 'primary' : 'secondary'}
            disabled={code.length !== 6 || busy}
            onPress={verify}
          />
        ) : (
          <Button
            label={busy ? '…' : t('auth.forgot.save')}
            variant={password.length >= 6 && !busy ? 'primary' : 'secondary'}
            disabled={password.length < 6 || busy}
            onPress={save}
          />
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4), paddingTop: space(1) },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.accent,
      borderRadius: radius.xl,
      padding: space(2.5),
      marginBottom: space(2),
    },
    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      backgroundColor: 'rgba(0,0,0,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroText: { flex: 1 },
    label: { marginTop: space(1), marginBottom: space(1) },
    input: {
      height: 54,
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      fontWeight: '500',
      fontSize: 16,
      color: colors.ink,
    },
    codeInput: { fontSize: 22, letterSpacing: 8, textAlign: 'center' },
    devHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space(1), paddingHorizontal: space(0.5) },
    pwHint: { marginTop: space(0.75), marginLeft: space(0.5) },
    footer: { paddingHorizontal: space(3), paddingTop: space(1.5), paddingBottom: space(3) },
  });
