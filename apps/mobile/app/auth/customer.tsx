import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocale } from '../../src/locale';
import type { MessageKey } from '@ayna/i18n';
import { colors, radius, space } from '../../src/theme';
import { Button, Screen, Segmented, StackHeader, Text } from '../../src/ui';

type Mode = 'register' | 'login';

export default function CustomerAuthScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const [mode, setMode] = useState<Mode>('register');
  const [fields, setFields] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setFields((p) => ({ ...p, [k]: v }));

  const valid =
    mode === 'register'
      ? (fields.name?.trim().length ?? 0) > 1 &&
        (fields.email?.trim().length ?? 0) > 3 &&
        (fields.password?.length ?? 0) >= 6
      : (fields.id?.trim().length ?? 0) > 3 && (fields.password?.length ?? 0) >= 6;

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('auth.customer.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Segmented
          options={[
            { value: 'register', label: t('auth.tab.register') },
            { value: 'login', label: t('auth.tab.login') },
          ]}
          value={mode}
          onChange={setMode}
        />

        <View style={styles.form}>
          {mode === 'register' ? (
            <>
              <Field
                labelKey="auth.f.name"
                value={fields.name ?? ''}
                onChange={(v) => set('name', v)}
              />
              <Field
                labelKey="auth.f.email"
                value={fields.email ?? ''}
                onChange={(v) => set('email', v)}
                keyboardType="email-address"
              />
              <Field
                labelKey="auth.f.phone"
                value={fields.phone ?? ''}
                onChange={(v) => set('phone', v)}
                keyboardType="phone-pad"
              />
              <Field
                labelKey="auth.f.password"
                value={fields.password ?? ''}
                onChange={(v) => set('password', v)}
                secure
              />
            </>
          ) : (
            <>
              <Field
                labelKey="auth.f.identifier"
                value={fields.id ?? ''}
                onChange={(v) => set('id', v)}
              />
              <Field
                labelKey="auth.f.password"
                value={fields.password ?? ''}
                onChange={(v) => set('password', v)}
                secure
              />
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={mode === 'register' ? t('auth.tab.register') : t('auth.tab.login')}
          variant={valid ? 'primary' : 'secondary'}
          disabled={!valid}
          onPress={() => router.replace('/discover')}
        />
      </View>
    </Screen>
  );
}

function Field({
  labelKey,
  value,
  onChange,
  secure,
  keyboardType,
}: {
  labelKey: MessageKey;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  const { t } = useLocale();
  return (
    <View>
      <Text variant="bodyStrong" tone="ink" style={styles.label}>
        {t(labelKey)}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space(3), paddingBottom: space(4) },
  form: { marginTop: space(2.5), gap: space(2) },
  label: { marginBottom: space(1) },
  input: {
    height: 54,
    paddingHorizontal: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
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
