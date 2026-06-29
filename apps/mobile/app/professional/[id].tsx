import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatPrice, getProfessionalDetail } from '../../src/data';
import { useLocale } from '../../src/locale';
import { colors, gradients, radius, shadow, space } from '../../src/theme';
import { Button, Text } from '../../src/ui';

export default function ProfessionalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const pro = getProfessionalDetail(id ?? '1');
  const [selected, setSelected] = useState<string>(pro.services[0]?.id ?? '');

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={{ uri: pro.image }} style={styles.heroImage} />
          <LinearGradient colors={['rgba(42,34,48,0.35)', 'transparent']} style={styles.heroTop} />
          <Pressable
            style={[styles.circleBtn, { top: insets.top + 8, left: space(2) }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
          <Pressable style={[styles.circleBtn, { top: insets.top + 8, right: space(2) }]}>
            <Ionicons name="heart-outline" size={20} color={colors.rose} />
          </Pressable>
        </View>

        {/* İçerik kağıdı */}
        <View style={styles.sheet}>
          <View style={styles.titleRow}>
            <View style={styles.titleText}>
              <View style={styles.nameRow}>
                <Text variant="title" tone="ink">
                  {pro.name}
                </Text>
                <Ionicons name="checkmark-circle" size={20} color={colors.gold} />
              </View>
              <Text variant="caption" tone="muted" style={styles.meta}>
                {pro.specialty} · {pro.district}
              </Text>
            </View>
            <View style={styles.ratingBox}>
              <Ionicons name="star" size={14} color={colors.gold} />
              <Text variant="bodyStrong" tone="ink">
                {pro.rating.toFixed(1)}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <Stat value={`${pro.reviewCount}`} label={t('pro.reviews_based')} />
            <View style={styles.statDivider} />
            <Stat value={`${pro.experienceYears}`} label={t('pro.experience')} />
            {pro.friends ? (
              <>
                <View style={styles.statDivider} />
                <Stat value={`${pro.friends}`} label={t('pro.friends_here')} tone="rose" />
              </>
            ) : null}
          </View>

          <Text variant="body" tone="inkSoft" style={styles.about}>
            {pro.about}
          </Text>

          {/* Hizmet bazlı puan */}
          <Section title={t('pro.service_ratings')} />
          <View style={styles.ratingChips}>
            {pro.serviceRatings.map((sr) => (
              <View key={sr.name} style={styles.ratingChip}>
                <Text variant="caption" tone="inkSoft">
                  {sr.name}
                </Text>
                {sr.score !== null ? (
                  <View style={styles.ratingChipScore}>
                    <Ionicons name="star" size={11} color={colors.gold} />
                    <Text variant="caption" tone="ink" style={styles.scoreText}>
                      {sr.score.toFixed(1)}
                    </Text>
                  </View>
                ) : (
                  <Text variant="caption" tone="muted">
                    {t('pro.no_data')}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Hizmetler */}
          <Section title={t('pro.services')} />
          <View style={styles.services}>
            {pro.services.map((s) => {
              const active = s.id === selected;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSelected(s.id)}
                  style={[styles.service, active && styles.serviceActive]}
                >
                  <View style={styles.radio}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                  <View style={styles.serviceText}>
                    <Text variant="bodyStrong" tone="ink">
                      {s.name}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {s.durationMin} {t('pro.min')}
                    </Text>
                  </View>
                  <Text variant="bodyStrong" tone="ink">
                    {formatPrice(s.price)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Portföy */}
          <Section title={t('pro.portfolio')} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.portfolio}
          >
            {pro.portfolio.map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.portfolioImg} />
            ))}
          </ScrollView>

          {/* Değerlendirmeler */}
          <Section title={t('pro.reviews')} />
          <View style={styles.reviews}>
            {pro.reviews.map((r) => (
              <View key={r.id} style={[styles.review, shadow.soft]}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewAuthor}>
                    <View style={styles.reviewAvatar}>
                      <Ionicons name="shield-checkmark" size={14} color={colors.rose} />
                    </View>
                    <View>
                      <Text variant="caption" tone="ink">
                        {t('pro.verified_member')}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {r.service} · {r.period}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.reviewStars}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons
                        key={i}
                        name="star"
                        size={12}
                        color={i < r.rating ? colors.gold : colors.line}
                      />
                    ))}
                  </View>
                </View>
                <Text variant="body" tone="inkSoft" style={styles.reviewText}>
                  {r.text}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sabit CTA */}
      <View style={[styles.cta, { paddingBottom: insets.bottom + space(1.5) }]}>
        <Button label={t('pro.book')} variant="primary" />
      </View>
    </View>
  );
}

function Stat({
  value,
  label,
  tone = 'ink',
}: {
  value: string;
  label: string;
  tone?: 'ink' | 'rose';
}) {
  return (
    <View style={styles.stat}>
      <Text variant="bodyStrong" tone={tone}>
        {value}
      </Text>
      <Text variant="caption" tone="muted" style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

function Section({ title }: { title: string }) {
  return (
    <Text variant="h2" tone="ink" style={styles.section}>
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: { height: 300, backgroundColor: colors.bgSunken },
  heroImage: { width: '100%', height: '100%' },
  heroTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  circleBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    marginTop: -28,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space(3),
    paddingTop: space(3),
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleText: { flex: 1, paddingRight: space(1.5) },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
  meta: { marginTop: space(0.5) },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.goldSoft,
    paddingHorizontal: space(1.25),
    paddingVertical: space(0.75),
    borderRadius: radius.pill,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: space(1.5),
    marginTop: space(2.5),
  },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { marginTop: 2, textAlign: 'center', paddingHorizontal: space(0.5) },
  statDivider: { width: 1, height: 28, backgroundColor: colors.line },
  about: { marginTop: space(2.5) },
  section: { marginTop: space(3.5), marginBottom: space(1.5) },
  ratingChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space(1.5),
    paddingVertical: space(1),
    borderRadius: radius.pill,
  },
  ratingChipScore: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  scoreText: {},
  services: { gap: space(1.25) },
  service: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space(2),
  },
  serviceActive: { borderColor: colors.rose, backgroundColor: colors.surfaceMuted },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.rose,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.rose },
  serviceText: { flex: 1 },
  portfolio: { gap: space(1.5), paddingRight: space(3) },
  portfolioImg: {
    width: 130,
    height: 160,
    borderRadius: radius.lg,
    backgroundColor: colors.bgSunken,
  },
  reviews: { gap: space(1.5) },
  review: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space(2),
  },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewAuthor: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.roseSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewText: { marginTop: space(1.25) },
  cta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: space(3),
    paddingTop: space(1.5),
  },
});
