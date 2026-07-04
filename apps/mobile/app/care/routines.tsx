import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useStore } from '../../src/store';
import { useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';
import { RoutineRow } from '../(tabs)/care';

// §5.4.5 — Bakım Takvimi ayrı sayfa: "Rutinlerini gör" buraya açar (önceden Benim İçin
// sayfasında satır içiydi; tekrarı önlemek için taşındı).
export default function RoutinesScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const routines = useStore((s) => s.careRoutines);

  return (
    <Screen edges={['bottom']}>
      <StackHeader title={t('benim.section.care')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          style={[styles.addBtn, shadow.soft]}
          onPress={() => router.push('/care/add?mode=routine')}
        >
          <Ionicons name="add" size={18} color={colors.accentFg} />
          <Text variant="bodyStrong" tone="accentFg">
            {t('care.add.routine_title')}
          </Text>
        </Pressable>

        {routines.length === 0 ? (
          <View style={[styles.empty, shadow.soft]}>
            <Text variant="caption" tone="muted">
              {t('benim.empty.care')}
            </Text>
          </View>
        ) : (
          <View style={[styles.group, shadow.soft]}>
            {routines.map((r, i) => (
              <RoutineRow key={r.id} routine={r} border={i < routines.length - 1} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), paddingBottom: TAB_BAR_CLEARANCE + space(2), gap: space(2) },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingVertical: space(1.75),
    },
    group: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
    empty: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(3),
      alignItems: 'center',
    },
  });
