import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { INCOMING_QUOTES, formatPrice } from '../../src/data';
import { useLocale } from '../../src/locale';
import { colors, gradients, radius, shadow, space } from '../../src/theme';
import { Screen, StackHeader, Text } from '../../src/ui';
import { LinearGradient } from 'expo-linear-gradient';

export default function DemandResultsScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const { budget } = useLocalSearchParams<{ budget: string }>();
  const budgetNum = Number(budget) || 0;

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('demand.results.title')} />

      <LinearGradient colors={gradients.plum} style={styles.budgetBanner}>
        <Text variant="caption" tone="onColor" style={styles.budgetLabel}>
          {t('demand.results.budget')}
        </Text>
        <Text variant="title" tone="onColor">
          {formatPrice(budgetNum)}
        </Text>
      </LinearGradient>

      <Text variant="caption" tone="muted" style={styles.count}>
        {INCOMING_QUOTES.length} {t('demand.results.count')}
      </Text>

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
            <Pressable style={styles.pick} onPress={() => router.push(`/professional/${q.proId}`)}>
              <Text variant="caption" tone="onColor">
                {t('quotes.pick')}
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  budgetBanner: {
    marginHorizontal: space(3),
    borderRadius: radius.lg,
    padding: space(2),
    marginBottom: space(2),
  },
  budgetLabel: { opacity: 0.85, marginBottom: 2 },
  count: { paddingHorizontal: space(3), marginBottom: space(1.5) },
  list: { paddingHorizontal: space(3), paddingBottom: space(4), gap: space(1.5) },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space(1.5),
    gap: space(1.5),
    alignItems: 'center',
  },
  thumb: { width: 60, height: 60, borderRadius: radius.md, backgroundColor: colors.bgSunken },
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
    backgroundColor: '#E4F2EA',
    paddingHorizontal: space(1),
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  pick: {
    backgroundColor: colors.rose,
    paddingHorizontal: space(1.75),
    paddingVertical: space(1),
    borderRadius: radius.pill,
  },
});
