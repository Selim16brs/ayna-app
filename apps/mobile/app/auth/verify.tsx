import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { api } from '../../src/api';
import { useStore } from '../../src/store';
import { useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text, TextInput } from '../../src/ui';

export default function VerifyScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ next?: string; phone?: string }>();

  const storePhone = useStore((s) => s.currentUser?.phone);
  const markVerified = useStore((s) => s.markPhoneVerified);
  const phone = params.phone ?? storePhone ?? null;
  const next = typeof params.next === 'string' ? params.next : null;

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
      // Ağ/servis hatası → demo akışı engellenmesin, kodu göster
      setSent(true);
      setDevCode('000000');
    } finally {
      setBusy(false);
    }
  };

  const proceed = () => {
    markVerified();
    if (next) router.replace(next as never);
    else router.back();
  };

  const confirm = async () => {
    if (!phone || code.length !== 6 || busy) return;
    setBusy(true);
    try {
      const res = await api.otpVerify(phone, code);
      if (res.verified) proceed();
      else Alert.alert(t('verify.title'), t('auth.otp.invalid'));
    } catch {
      // Servis erişilemiyor → dev kod ile devam
      if (code === devCode) proceed();
      else Alert.alert(t('verify.title'), t('auth.otp.invalid'));
    } finally {
      setBusy(false);
    }
  };

  if (!phone) {
    return (
      <Screen edges={[]}>
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
    <Screen edges={[]}>
      <StackHeader title={t('verify.title')} />
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={26} color={colors.onAccent} />
          </View>
          <Text variant="h2" tone="onAccent">
            {t('verify.subtitle')}
          </Text>
          <Text variant="body" tone="onAccent" style={styles.phone}>
            {phone}
          </Text>
        </View>

        {!sent ? (
          <Button label={busy ? '…' : t('verify.send')} onPress={requestCode} />
        ) : (
          <>
            <Text variant="caption" tone="inkSoft" style={styles.label}>
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
            <View style={styles.actions}>
              <Button
                label={busy ? '…' : t('verify.confirm')}
                variant={code.length === 6 && !busy ? 'primary' : 'secondary'}
                disabled={code.length !== 6 || busy}
                onPress={confirm}
              />
            </View>
            <Text variant="caption" tone="accentFg" style={styles.resend} onPress={requestCode}>
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
    hero: {
      backgroundColor: colors.accent,
      borderRadius: radius.xl,
      padding: space(2.5),
      gap: space(1),
    },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      backgroundColor: 'rgba(0,0,0,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(0.5),
    },
    phone: { opacity: 0.9, marginTop: 2 },
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
