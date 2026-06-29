import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, TextInput, View } from 'react-native';
import { useLocale } from '../../src/locale';
import { colors, radius, space } from '../../src/theme';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

export default function AuthProfileScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const valid = name.trim().length > 1 && city.trim().length > 1;

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('auth.profile.title')} />
      <View style={styles.content}>
        <Text variant="caption" tone="muted" style={styles.sub}>
          {t('auth.profile.subtitle')}
        </Text>

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('auth.profile.name')}
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('auth.profile.name_ph')}
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoFocus
        />

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('auth.profile.city')}
        </Text>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="Almatı"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </View>

      <View style={styles.footer}>
        <Button
          label={t('auth.profile.finish')}
          variant={valid ? 'primary' : 'secondary'}
          disabled={!valid}
          onPress={() => router.replace('/discover')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: space(3), paddingTop: space(1) },
  sub: { marginBottom: space(2) },
  label: { marginTop: space(2), marginBottom: space(1) },
  input: {
    height: 56,
    paddingHorizontal: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    color: colors.ink,
  },
  footer: {
    paddingHorizontal: space(3),
    paddingTop: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
