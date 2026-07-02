import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CITIES } from '../src/data';
import { useLocale } from '../src/locale';
import { useStore } from '../src/store';
import { radius, space, type ColorTokens } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../src/ui';

export default function CityScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const city = useStore((s) => s.currentUser?.city) ?? 'Almatı';
  const setCity = useStore((s) => s.setCity);

  function pick(c: string) {
    setCity(c);
    router.back();
  }

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('city.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" tone="muted" style={styles.hint}>
          {t('city.hint')}
        </Text>
        {CITIES.map((c) => {
          const active = c === city;
          return (
            <Pressable
              key={c}
              style={[styles.row, active && styles.rowActive]}
              onPress={() => pick(c)}
            >
              <Ionicons
                name="location-outline"
                size={20}
                color={active ? colors.onAccent : colors.inkSoft}
              />
              <Text variant="bodyStrong" tone={active ? 'onAccent' : 'ink'} style={styles.rowLabel}>
                {c}
              </Text>
              {active ? <Ionicons name="checkmark" size={20} color={colors.onAccent} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: TAB_BAR_CLEARANCE, gap: space(1) },
    hint: { marginBottom: space(1) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      height: 56,
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
    },
    rowActive: { backgroundColor: colors.accent },
    rowLabel: { flex: 1 },
  });
