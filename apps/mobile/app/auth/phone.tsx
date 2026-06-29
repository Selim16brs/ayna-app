import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, TextInput, View } from 'react-native';
import { useLocale } from '../../src/locale';
import { colors, radius, space } from '../../src/theme';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

export default function PhoneScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const [phone, setPhone] = useState('');
  const valid = phone.replace(/\D/g, '').length >= 9;

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('auth.phone.title')} />
      <View style={styles.content}>
        <Text variant="caption" tone="muted" style={styles.sub}>
          {t('auth.phone.subtitle')}
        </Text>

        <View style={styles.inputRow}>
          <View style={styles.prefix}>
            <Text variant="bodyStrong" tone="ink">
              +7
            </Text>
          </View>
          <TextInput
            value={phone}
            onChangeText={(v) => setPhone(v.replace(/[^0-9 ]/g, ''))}
            placeholder={t('auth.phone.placeholder')}
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
            style={styles.input}
            autoFocus
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label={t('auth.phone.send')}
          variant={valid ? 'primary' : 'secondary'}
          disabled={!valid}
          onPress={() =>
            router.push(
              `/auth/otp?phone=${encodeURIComponent('+7 ' + phone)}&role=${role ?? 'customer'}`,
            )
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: space(3), paddingTop: space(1) },
  sub: { marginBottom: space(3) },
  inputRow: { flexDirection: 'row', gap: space(1.25) },
  prefix: {
    height: 60,
    paddingHorizontal: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    height: 60,
    paddingHorizontal: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 20,
    color: colors.ink,
  },
  footer: {
    paddingHorizontal: space(3),
    paddingTop: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
