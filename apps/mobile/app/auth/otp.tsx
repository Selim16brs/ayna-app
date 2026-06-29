import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocale } from '../../src/locale';
import { colors, radius, space } from '../../src/theme';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

export default function OtpScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { phone, role } = useLocalSearchParams<{ phone?: string; role?: string }>();
  const [code, setCode] = useState('');
  const valid = code.length === 6;

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('auth.otp.title')} />
      <View style={styles.content}>
        <Text variant="caption" tone="muted" style={styles.sub}>
          {phone} {t('auth.otp.subtitle')}
        </Text>

        <TextInput
          value={code}
          onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
          placeholder="••••••"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          style={styles.input}
          autoFocus
          maxLength={6}
        />

        <Pressable style={styles.resend}>
          <Text variant="caption" tone="gold">
            {t('auth.otp.resend')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Button
          label={t('auth.otp.verify')}
          variant={valid ? 'primary' : 'secondary'}
          disabled={!valid}
          onPress={() => router.push(`/auth/profile?role=${role ?? 'customer'}`)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: space(3), paddingTop: space(1) },
  sub: { marginBottom: space(3) },
  input: {
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    textAlign: 'center',
    fontFamily: 'Manrope_700Bold',
    fontSize: 32,
    letterSpacing: 12,
    color: colors.ink,
  },
  resend: { alignSelf: 'center', marginTop: space(2.5), padding: space(1) },
  footer: {
    paddingHorizontal: space(3),
    paddingTop: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
