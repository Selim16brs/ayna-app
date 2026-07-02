import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type { Locale, MessageKey } from '@ayna/i18n';
import { useLocale } from '../src/locale';
import { type ColorTokens, radius, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { PressableScale, Screen, StackHeader, Text } from '../src/ui';

const OPTIONS: { value: Locale; labelKey: MessageKey; native: string }[] = [
  { value: 'tr', labelKey: 'language.tr', native: 'Türkçe' },
  { value: 'kk', labelKey: 'language.kk', native: 'Қазақша' },
  { value: 'ru', labelKey: 'language.ru', native: 'Русский' },
];

export default function LanguageScreen() {
  const { t, locale, setLocale } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  return (
    <Screen edges={[]}>
      <StackHeader title={t('profile.menu.language')} />
      <View style={styles.group}>
        {OPTIONS.map((o, i) => {
          const active = o.value === locale;
          return (
            <PressableScale
              key={o.value}
              style={[styles.row, i < OPTIONS.length - 1 && styles.rowBorder]}
              onPress={() => {
                setLocale(o.value);
                router.back();
              }}
            >
              <View style={styles.rowText}>
                <Text variant="bodyStrong" tone="ink">
                  {o.native}
                </Text>
                <Text variant="caption" tone="muted">
                  {t(o.labelKey)}
                </Text>
              </View>
              {active ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
              ) : (
                <View style={styles.dot} />
              )}
            </PressableScale>
          );
        })}
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    group: {
      marginHorizontal: space(2),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space(2),
      paddingVertical: space(2),
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
    rowText: { flex: 1, gap: 2 },
    dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.line },
  });
