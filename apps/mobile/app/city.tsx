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
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const city = useStore((s) => s.currentUser?.city) ?? 'Almatı';
  const setCity = useStore((s) => s.setCity);

  function pick(c: string) {
    setCity(c);
    router.back();
  }

  return (
    <Screen edges={[]}>
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
              style={[styles.row, shadow.soft, active && styles.rowActive]}
              onPress={() => pick(c)}
            >
              <View style={[styles.pin, active && styles.pinActive]}>
                <Ionicons
                  name="location"
                  size={20}
                  color={active ? colors.onAccent : colors.inkSoft}
                />
              </View>
              <Text variant="bodyStrong" tone={active ? 'onAccent' : 'ink'} style={styles.rowLabel}>
                {c}
              </Text>
              {active ? (
                <View style={styles.check}>
                  <Ionicons name="checkmark" size={18} color={colors.onAccent} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(2),
      paddingBottom: TAB_BAR_CLEARANCE + space(6),
      gap: space(1.5),
    },
    hint: { marginBottom: space(1) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      height: 66,
      paddingHorizontal: space(1.75),
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
    },
    rowActive: { backgroundColor: colors.accent },
    pin: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pinActive: { backgroundColor: 'rgba(255,255,255,0.35)' },
    rowLabel: { flex: 1, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
    check: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(255,255,255,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
