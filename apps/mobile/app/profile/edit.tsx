import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useLocale } from '../../src/locale';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

export default function ProfileEditScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  const [name, setName] = useState('Aigerim');
  const [email, setEmail] = useState('aigerim@mail.kz');
  const [phone, setPhone] = useState('+7 700 123 45 67');
  const [city, setCity] = useState('Almatı');

  const onSave = () => {
    Alert.alert(t('profile.edit.saved'), undefined, [
      { text: t('common.save'), onPress: () => router.back() },
    ]);
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('profile.edit.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Field label={t('profile.edit.name')} value={name} onChangeText={setName} />
        <Field
          label={t('profile.edit.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <Field
          label={t('profile.edit.phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Field label={t('profile.edit.city')} value={city} onChangeText={setCity} />

        <View style={styles.save}>
          <Button label={t('common.save')} onPress={onSave} />
        </View>
      </ScrollView>
    </Screen>
  );

  function Field({
    label,
    value,
    onChangeText,
    keyboardType,
  }: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    keyboardType?: 'default' | 'email-address' | 'phone-pad';
  }) {
    return (
      <View style={styles.field}>
        <Text variant="label" tone="inkSoft" style={styles.fieldLabel}>
          {label}
        </Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholderTextColor={colors.muted}
        />
      </View>
    );
  }
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4), gap: space(2) },
    field: { gap: space(0.75) },
    fieldLabel: { marginLeft: space(0.5) },
    input: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: space(2),
      paddingVertical: space(1.75),
      fontSize: 16,
      color: colors.ink,
    },
    save: { marginTop: space(2) },
  });
