import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { api } from '../../src/api';
import { CITIES } from '../../src/data';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, Segmented, StackHeader, Text } from '../../src/ui';

type Mode = 'register' | 'login';
type Gender = 'female' | 'other';

export default function CustomerAuthScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const styles = useThemedStyles(makeStyles);
  const setAuth = useStore((s) => s.setAuth);
  const [mode, setMode] = useState<Mode>('register');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [gender, setGender] = useState<Gender>('female');
  const [city, setCity] = useState<string | null>(null);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k: string, v: string) => setFields((p) => ({ ...p, [k]: v }));

  async function submit() {
    setBusy(true);
    try {
      const session =
        mode === 'register'
          ? await api.register({
              name: (fields.name ?? '').trim(),
              phone: (fields.phone ?? '').trim(),
              password: fields.password ?? '',
              ...(fields.email?.trim() ? { email: fields.email.trim() } : {}),
              ...(city ? { city } : {}),
            })
          : await api.login({
              identifier: (fields.id ?? '').trim(),
              password: fields.password ?? '',
            });
      setAuth(session);
      router.replace('/discover');
    } catch (e) {
      const msg = String((e as Error).message ?? '');
      if (msg.includes('409') || msg.includes('401') || msg.includes('400')) {
        Alert.alert(t(mode === 'register' ? 'auth.error.taken' : 'auth.error.bad'));
      } else {
        // Ağ hatası → çevrimdışı demo akışı engellenmesin
        router.replace('/discover');
      }
    } finally {
      setBusy(false);
    }
  }

  const valid =
    mode === 'register'
      ? (fields.name?.trim().length ?? 0) > 1 &&
        (fields.email?.trim().length ?? 0) > 3 &&
        (fields.phone?.trim().length ?? 0) >= 7 &&
        city !== null &&
        (fields.password?.length ?? 0) >= 6 &&
        terms
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

        {mode === 'register' ? (
          <>
            <SectionLabel text={t('auth.section.personal')} />
            <View style={styles.form}>
              <Field
                labelKey="auth.f.name"
                value={fields.name ?? ''}
                onChange={(v) => set('name', v)}
              />
              <Field
                labelKey="auth.f.birthdate"
                value={fields.birthdate ?? ''}
                onChange={(v) => set('birthdate', v)}
                placeholderKey="auth.f.birthdate_ph"
                keyboardType="numbers-and-punctuation"
              />
              <View>
                <Text variant="bodyStrong" tone="ink" style={styles.label}>
                  {t('auth.f.gender')}
                </Text>
                <Segmented
                  options={[
                    { value: 'female', label: t('auth.gender.female') },
                    { value: 'other', label: t('auth.gender.other') },
                  ]}
                  value={gender}
                  onChange={setGender}
                />
              </View>
            </View>

            <SectionLabel text={t('auth.section.location')} />
            <View style={styles.form}>
              <View>
                <Text variant="bodyStrong" tone="ink" style={styles.label}>
                  {t('auth.f.city')}
                </Text>
                <View style={styles.chips}>
                  {CITIES.map((c) => (
                    <Chip key={c} label={c} active={city === c} onPress={() => setCity(c)} />
                  ))}
                </View>
              </View>
              <Field
                labelKey="auth.f.district"
                value={fields.district ?? ''}
                onChange={(v) => set('district', v)}
              />
            </View>

            <SectionLabel text={t('auth.section.account')} />
            <View style={styles.form}>
              <Field
                labelKey="auth.f.email"
                value={fields.email ?? ''}
                onChange={(v) => set('email', v)}
                keyboardType="email-address"
              />
              <Field
                labelKey="auth.f.phone"
                value={fields.phone ?? ''}
                onChange={(v) => set('phone', v.replace(/[^0-9 +]/g, ''))}
                keyboardType="phone-pad"
                placeholderKey="auth.phone.placeholder"
              />
              <Field
                labelKey="auth.f.password"
                value={fields.password ?? ''}
                onChange={(v) => set('password', v)}
                secure
                hintKey="auth.f.password_hint"
              />
            </View>

            <Checkbox
              checked={terms}
              onToggle={() => setTerms((v) => !v)}
              label={t('auth.terms.accept')}
            />
          </>
        ) : (
          <View style={styles.form}>
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
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={mode === 'register' ? t('auth.tab.register') : t('auth.tab.login')}
          variant={valid && !busy ? 'primary' : 'secondary'}
          disabled={!valid || busy}
          onPress={submit}
        />
      </View>
    </Screen>
  );
}

function SectionLabel({ text }: { text: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Text variant="label" tone="rose" style={styles.section}>
      {text}
    </Text>
  );
}

function Field({
  labelKey,
  value,
  onChange,
  secure,
  keyboardType,
  placeholderKey,
  hintKey,
}: {
  labelKey: MessageKey;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numbers-and-punctuation';
  placeholderKey?: MessageKey;
  hintKey?: MessageKey;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
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
        placeholder={placeholderKey ? t(placeholderKey) : undefined}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      {hintKey ? (
        <Text variant="caption" tone="muted" style={styles.hint}>
          {t(hintKey)}
        </Text>
      ) : null}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text variant="caption" tone={active ? 'onColor' : 'inkSoft'}>
        {label}
      </Text>
    </Pressable>
  );
}

function Checkbox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable style={styles.checkRow} onPress={onToggle}>
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked ? <Ionicons name="checkmark" size={15} color={colors.onColor} /> : null}
      </View>
      <Text variant="caption" tone="inkSoft" style={styles.checkLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4) },
    section: { marginTop: space(3), marginBottom: space(1) },
    form: { gap: space(2) },
    label: { marginBottom: space(1) },
    hint: { marginTop: space(0.75), marginLeft: space(0.5) },
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
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    chip: {
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    chipActive: { backgroundColor: colors.rose, borderColor: colors.rose },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      marginTop: space(3),
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    checkLabel: { flex: 1, lineHeight: 18 },
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
  });
