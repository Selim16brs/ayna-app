import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api } from '../../src/api';
import { useLocale } from '../../src/locale';
import { radius, space, type ColorTokens, font } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  Button,
  Screen,
  StackHeader,
  TelefonGirdisi,
  Text,
  TextInput,
  VARSAYILAN_ULKE,
  tamNumara,
} from '../../src/ui';

type Step = 'phone' | 'code' | 'password';

/**
 * §3.3 — Şifremi Unuttum: kayıtlı telefon → SMS OTP → yeni şifre belirleme.
 *
 * ÜÇ ADIMIN DA HAKEMİ SUNUCU. Ekran eskiden servise erişemediğinde kendi
 * "000000" kodunu uydurup akışı yürütüyor, sonunda sıfırlama reddedilse
 * bile "şifren değiştirildi" diyordu. Kullanıcı yeni şifresiyle giremeyip
 * sebebini bilemezdi.
 *
 * Kurucu: "sistem hiçbir şeyi kendiliğinden uydurmamalı, her şey %100
 * doğru çalışmalı." Artık her adım gerçek yanıtı bekliyor.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [step, setStep] = useState<Step>('phone');
  const [ulke, setUlke] = useState(VARSAYILAN_ULKE);
  const [yerel, setYerel] = useState('');
  const phone = tamNumara(ulke.kod, yerel);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    if (phone.trim().length < 7 || busy) return;
    setBusy(true);
    try {
      const res = await api.otpRequest(phone.trim());
      setDevCode(res.devCode ?? null);
      // Kod adımına YALNIZ gerçekten gönderildiyse geçiliyor.
      setStep('code');
    } catch {
      Alert.alert(t('auth.forgot.title'), t('auth.otp.send_failed'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    try {
      const res = await api.otpVerify(phone.trim(), code);
      // `code === devCode` KALDIRILDI. İstemcinin elindeki kodla kendini
      // doğrulaması doğrulama değil; kararı sunucu veriyor.
      if (res.verified) setStep('password');
      else Alert.alert(t('auth.forgot.title'), t('auth.otp.invalid'));
    } catch {
      Alert.alert(t('auth.forgot.title'), t('auth.otp.invalid'));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (password.length < 6 || busy) return;
    setBusy(true);
    try {
      await api.resetPassword({ phone: phone.trim(), code, newPassword: password });
      // Başarı YALNIZ sunucu kabul ettiğinde söyleniyor. Eskiden hata
      // yutuluyor ve her koşulda "şifren değiştirildi" yazıyordu — sonra
      // kullanıcı yeni şifresiyle giremiyordu.
      Alert.alert(t('auth.forgot.success'));
      router.replace('/auth/login');
    } catch {
      Alert.alert(t('auth.forgot.title'), t('auth.forgot.save_failed'));
    } finally {
      setBusy(false);
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
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="lock-closed" size={24} color={colors.accent} />
          </View>
          <Text variant="body" tone="onAccent" style={styles.heroText}>
            {subtitle}
          </Text>
        </View>

        {step === 'phone' ? (
          <>
            <TelefonGirdisi
              etiket={t('auth.forgot.phone_label')}
              ulke={ulke}
              ulkeDegisti={setUlke}
              yerel={yerel}
              yerelDegisti={setYerel}
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
                autoFocus
              />
              <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} style={styles.eyeBtn}>
                <Ionicons
                  name={hidden ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={colors.inkSoft}
                />
              </Pressable>
            </View>
            <Text variant="caption" tone="muted" style={styles.pwHint}>
              {t('auth.f.password_hint')}
            </Text>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step === 'phone' ? (
          <Button
            label={t('auth.forgot.send')}
            loading={busy}
            variant={phone.trim().length >= 7 && !busy ? 'primary' : 'secondary'}
            disabled={phone.trim().length < 7 || busy}
            onPress={sendCode}
          />
        ) : step === 'code' ? (
          <Button
            label={t('auth.forgot.verify')}
            loading={busy}
            variant={code.length === 6 && !busy ? 'primary' : 'secondary'}
            disabled={code.length !== 6 || busy}
            onPress={verify}
          />
        ) : (
          <Button
            label={t('auth.forgot.save')}
            loading={busy}
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
      // Ekranın ASIL eylemi düğme; bu bilgi kartıydı ve dolu koyu
      // durmasının bir sebebi yoktu (Denge).
      backgroundColor: colors.heroSoft,
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
      fontFamily: font.medium,
      fontSize: 16,
      color: colors.ink,
    },
    codeInput: { fontSize: 22, letterSpacing: 8, textAlign: 'center' },
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
      fontFamily: font.medium,
      fontSize: 16,
      color: colors.ink,
    },
    eyeBtn: { padding: space(0.75) },
    devHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: space(1),
      paddingHorizontal: space(0.5),
    },
    pwHint: { marginTop: space(0.75), marginLeft: space(0.5) },
    footer: { paddingHorizontal: space(3), paddingTop: space(1.5), paddingBottom: space(3) },
  });
