import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { api } from '../../src/api';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

export default function VerifyScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors, gradients, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const phone = useStore((s) => s.currentUser?.phone);
  const markVerified = useStore((s) => s.markPhoneVerified);

  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const requestCode = async () => {
    if (!phone || busy) return;
    setBusy(true);
    try {
      const res = await api.otpRequest(phone);
      setSent(true);
      setDevCode(res.devCode ?? null);
    } catch {
      Alert.alert(t('verify.title'), t('auth.otp.invalid'));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!phone || code.length !== 6 || busy) return;
    setBusy(true);
    try {
      const res = await api.otpVerify(phone, code);
      if (res.verified) {
        markVerified();
        Alert.alert(t('verify.success'));
        router.back();
      }
    } catch {
      Alert.alert(t('verify.title'), t('auth.otp.invalid'));
    } finally {
      setBusy(false);
    }
  };

  if (!phone) {
    return (
      <Screen edges={['top']}>
        <StackHeader title={t('verify.title')} />
        <View style={styles.empty}>
          <Text variant="body" tone="muted">
            {t('verify.no_phone')}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('verify.title')} />
      <View style={styles.content}>
        <LinearGradient colors={gradients.teal} style={[styles.hero, shadow.card]}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={26} color={colors.onColor} />
          </View>
          <Text variant="h2" tone="onColor">
            {t('verify.subtitle')}
          </Text>
          <Text variant="body" tone="onColor" style={styles.phone}>
            {phone}
          </Text>
        </LinearGradient>

        {!sent ? (
          <Button label={busy ? '…' : t('verify.send')} onPress={requestCode} />
        ) : (
          <>
            <Text variant="label" tone="rose" style={styles.label}>
              {t('verify.code_label')}
            </Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder={t('verify.placeholder')}
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={6}
            />
            {devCode ? (
              <View style={styles.devHint}>
                <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
                <Text variant="caption" tone="muted">
                  {t('verify.dev_hint')}: {devCode}
                </Text>
              </View>
            ) : null}
            <View style={styles.actions}>
              <Button label={busy ? '…' : t('verify.confirm')} onPress={confirm} />
            </View>
            <Text variant="caption" tone="rose" style={styles.resend} onPress={requestCode}>
              {t('verify.resend')}
            </Text>
          </>
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), gap: space(2) },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(4) },
    hero: { borderRadius: radius.xl, padding: space(2.5), gap: space(1) },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(0.5),
    },
    phone: { opacity: 0.95, marginTop: 2 },
    label: { marginTop: space(1) },
    input: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.lg,
      paddingHorizontal: space(2),
      paddingVertical: space(1.75),
      color: colors.ink,
      fontSize: 22,
      letterSpacing: 8,
      textAlign: 'center',
    },
    devHint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space(0.5) },
    actions: { marginTop: space(0.5) },
    resend: { textAlign: 'center', textDecorationLine: 'underline', marginTop: space(0.5) },
  });
