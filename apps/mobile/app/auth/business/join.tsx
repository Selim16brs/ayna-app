import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { FEATURED } from '../../../src/data';
import { useLocale } from '../../../src/locale';
import { radius, space, type ColorTokens } from '../../../src/theme';
import { useTheme, useThemedStyles } from '../../../src/theme-context';
import { Button, Screen, StackHeader, Text, TextInput } from '../../../src/ui';

export default function JoinBusinessScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [firmId, setFirmId] = useState<string>('');
  const [code, setCode] = useState('');
  const valid = firmId.length > 0 && code.trim().length >= 4;

  return (
    <Screen edges={[]}>
      <StackHeader title={t('biz.join.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="h2" tone="ink" style={styles.label}>
          {t('biz.join.firm')}
        </Text>
        <View style={styles.firmList}>
          {FEATURED.map((f) => {
            const on = f.id === firmId;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFirmId(f.id)}
                style={[styles.firm, on && styles.firmActive]}
              >
                <View style={styles.radio}>{on ? <View style={styles.radioDot} /> : null}</View>
                <Text variant="bodyStrong" tone="ink" style={styles.firmName}>
                  {f.name}
                </Text>
                <Text variant="caption" tone="muted">
                  {f.specialty}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('biz.join.code')}
        </Text>
        <Text variant="caption" tone="muted" style={styles.codeSub}>
          {t('biz.join.code_sub')}
        </Text>
        <TextInput
          value={code}
          onChangeText={(v) =>
            setCode(
              v
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, 8),
            )
          }
          placeholder="AYNA-XXXX"
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          style={styles.input}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('biz.join.verify')}
          variant={valid ? 'primary' : 'secondary'}
          disabled={!valid}
          onPress={() => router.replace('/auth/business/done')}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4) },
    label: { marginTop: space(2.5), marginBottom: space(1.25) },
    firmList: { gap: space(1) },
    firm: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(1.75),
    },
    firmActive: { borderColor: colors.accentFg },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.accentFg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accentFg },
    firmName: { flexShrink: 0 },
    codeSub: { marginBottom: space(1.25) },
    input: {
      height: 56,
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      fontWeight: '700',
      fontSize: 18,
      letterSpacing: 2,
      color: colors.ink,
    },
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
  });
