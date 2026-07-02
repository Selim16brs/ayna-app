import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { INCOMING_QUOTES, formatPrice } from '../../src/data';
import { useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, SectionHeader, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

export default function DemandResultsScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { budget } = useLocalSearchParams<{ budget: string }>();
  const budgetNum = Number(budget) || 0;

  return (
    <Screen edges={[]}>
      <StackHeader title={t('demand.results.title')} />

      {/* Bütçe kartı — kenarlıksız, yumuşak gölge, lime pastel zemin */}
      <View style={[styles.budgetBanner, shadow.soft]}>
        <View style={styles.budgetIcon}>
          <Ionicons name="wallet" size={22} color={colors.onAccent} />
        </View>
        <View style={styles.budgetText}>
          <Text variant="caption" tone="inkSoft" style={styles.budgetLabel}>
            {t('demand.results.budget')}
          </Text>
          <Text variant="title" tone="ink">
            {formatPrice(budgetNum)}
          </Text>
        </View>
      </View>

      <SectionHeader title={`${INCOMING_QUOTES.length} ${t('demand.results.count')}`} />

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {INCOMING_QUOTES.map((q) => (
          <View key={q.id} style={[styles.card, shadow.card]}>
            <Image source={{ uri: q.image }} style={styles.thumb} />
            <View style={styles.info}>
              <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                {q.name}
              </Text>
              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Ionicons name="star" size={11} color={colors.gold} />
                  <Text variant="caption" tone="inkSoft">
                    {q.rating.toFixed(1)} · {q.reviewCount}
                  </Text>
                </View>
                <View style={styles.acceptChip}>
                  <Ionicons name="checkmark-circle" size={11} color={colors.success} />
                  <Text variant="caption" style={{ color: colors.success }}>
                    {t('demand.accepted')}
                  </Text>
                </View>
              </View>
            </View>
            <Pressable
              style={styles.pick}
              onPress={() =>
                router.push({
                  pathname: '/booking/schedule',
                  params: { proId: q.proId, source: 'demand' },
                })
              }
            >
              <Text variant="caption" tone="onAccent" style={styles.pickText}>
                {t('quotes.pick')}
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    budgetBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.75),
      marginHorizontal: space(3),
      marginTop: space(2.5),
      borderRadius: radius.lg,
      padding: space(2.25),
      backgroundColor: colors.accentSoft,
    },
    budgetIcon: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    budgetText: { flex: 1 },
    budgetLabel: { marginBottom: 2 },
    list: { paddingHorizontal: space(3), paddingBottom: TAB_BAR_CLEARANCE, gap: space(2) },
    card: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1.75),
      alignItems: 'center',
    },
    thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.bgSunken },
    info: { flex: 1 },
    metaRow: { flexDirection: 'row', gap: space(0.75), marginTop: space(0.75) },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.goldSoft,
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    acceptChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.successSoft,
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    pick: {
      backgroundColor: colors.accent,
      paddingHorizontal: space(2),
      paddingVertical: space(1),
      borderRadius: radius.pill,
    },
    pickText: { fontWeight: '800' },
  });
