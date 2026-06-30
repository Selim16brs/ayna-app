import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatPrice } from '../../src/data';
import { useProfessionalDetail } from '../../src/catalog';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Badge, Button, Text } from '../../src/ui';

export default function ProfessionalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const proId = id ?? '1';
  const pro = useProfessionalDetail(proId);
  const [selected, setSelected] = useState<string>(pro.services[0]?.id ?? '');
  const [uzmanId, setUzmanId] = useState<string>(pro.staff[0]?.id ?? '');
  const isSalon = pro.kind === 'salon' && pro.staff.length > 0;
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const isFav = useStore((s) => s.favorites.includes(proId));
  const joinWaitlist = useStore((s) => s.joinWaitlist);

  const onWaitlist = () => {
    const svc = pro.services.find((s) => s.id === selected)?.name ?? pro.services[0]?.name ?? '';
    joinWaitlist({ id: pro.id, name: pro.name, image: pro.image, service: svc });
    Alert.alert(t('pro.waitlist_joined'));
  };
  // Seçici sabit referans (map) döndürür; boş dizi fallback render içinde — sonsuz render önlenir
  const userReviewsMap = useStore((s) => s.userReviews);
  const reviews = [...(userReviewsMap[proId] ?? []), ...pro.reviews];

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
          <Pressable
            style={[styles.circleBtn, { top: insets.top + 8, right: space(2) }]}
            onPress={() => toggleFavorite(proId)}
          >
            <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={colors.rose} />
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
              <View style={styles.kindRow}>
                <Badge
                  label={t(isSalon ? 'pro.kind.salon' : 'pro.kind.independent')}
                  tone={isSalon ? 'gold' : 'rose'}
                />
              </View>
            </View>
            <View style={styles.ratingBox}>
              <Ionicons name="star" size={14} color={colors.gold} />
              <Text variant="bodyStrong" tone="ink">
                {pro.rating.toFixed(1)}
              </Text>
            </View>
          </View>

          <View style={[styles.statsRow, shadow.soft]}>
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

          {/* Uzmanlar (yalnızca salonlarda) */}
          {isSalon ? (
            <>
              <Section title={t('pro.staff')} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.staffRow}
              >
                {pro.staff.map((u) => {
                  const on = u.id === uzmanId;
                  return (
                    <Pressable
                      key={u.id}
                      onPress={() => setUzmanId(u.id)}
                      style={[styles.staffCard, shadow.soft, on && styles.staffActive]}
                    >
                      <Image source={{ uri: u.image }} style={styles.staffAvatar} />
                      <Text variant="bodyStrong" tone="ink">
                        {u.name}
                      </Text>
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {u.role}
                      </Text>
                      <View style={styles.staffRating}>
                        <Ionicons name="star" size={10} color={colors.gold} />
                        <Text variant="caption" tone="inkSoft">
                          {u.rating.toFixed(1)}
                        </Text>
                      </View>
                      {on ? (
                        <View style={styles.staffCheck}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.rose} />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

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
                    <View style={styles.serviceNameRow}>
                      <Text variant="bodyStrong" tone="ink">
                        {s.name}
                      </Text>
                      {/* §6.E — öne çıkan (TOP) işareti */}
                      {s.popular ? (
                        <View style={styles.topTag}>
                          <Ionicons name="flame" size={10} color={colors.gold} />
                          <Text variant="caption" style={styles.topText}>
                            {t('pro.service.top')}
                          </Text>
                        </View>
                      ) : null}
                      {/* §6.E — indirim etiketi */}
                      {s.discountPct ? (
                        <View style={styles.discTag}>
                          <Text variant="caption" style={styles.discText}>
                            −%{s.discountPct}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text variant="caption" tone="muted">
                      {s.durationMin} {t('pro.min')}
                    </Text>
                  </View>
                  {s.discountPct ? (
                    <View style={styles.priceCol}>
                      <Text variant="caption" tone="muted" style={styles.strike}>
                        {formatPrice(s.price)}
                      </Text>
                      <Text variant="bodyStrong" tone="rose">
                        {formatPrice(Math.round((s.price * (100 - s.discountPct)) / 100))}
                      </Text>
                    </View>
                  ) : (
                    <Text variant="bodyStrong" tone="ink">
                      {formatPrice(s.price)}
                    </Text>
                  )}
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
            {pro.portfolio.map((uri, i) => (
              <Pressable
                key={uri}
                onPress={() =>
                  router.push({
                    pathname: '/gallery',
                    params: { images: JSON.stringify(pro.portfolio), index: String(i) },
                  })
                }
              >
                <Image source={{ uri }} style={styles.portfolioImg} />
              </Pressable>
            ))}
          </ScrollView>

          {/* Değerlendirmeler */}
          <Section title={t('pro.reviews')} />
          <View style={styles.reviews}>
            {reviews.map((r) => (
              <View key={r.id} style={[styles.review, shadow.soft]}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewAuthor}>
                    <View style={styles.reviewAvatar}>
                      <Ionicons name="shield-checkmark" size={14} color={colors.rose} />
                    </View>
                    <View>
                      <Text variant="bodyStrong" tone="ink">
                        {r.author}
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
                {/* §6.D — uzman/işletme yanıtı (kalıcı yoruma) */}
                {r.reply ? (
                  <View style={styles.replyBox}>
                    <View style={styles.replyHead}>
                      <Ionicons name="storefront" size={12} color={colors.rose} />
                      <Text variant="caption" tone="rose" style={styles.replyLabel}>
                        {t('pro.review.reply')}
                      </Text>
                    </View>
                    <Text variant="body" tone="inkSoft">
                      {r.reply}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sabit CTA */}
      <View style={[styles.cta, { paddingBottom: insets.bottom + space(1.5) }]}>
        <Button
          label={t('pro.book')}
          variant="primary"
          onPress={() =>
            router.push({
              pathname: '/booking/schedule',
              params: {
                proId: pro.id,
                source: 'direct',
                uzmanId,
                uzmanName: pro.staff.find((u) => u.id === uzmanId)?.name ?? '',
              },
            })
          }
        />
        <Button label={t('pro.waitlist')} variant="ghost" onPress={onWaitlist} />
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
  const styles = useThemedStyles(makeStyles);
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
  const styles = useThemedStyles(makeStyles);
  return (
    <Text variant="h2" tone="ink" style={styles.section}>
      {title}
    </Text>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
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
    kindRow: { flexDirection: 'row', marginTop: space(1) },
    staffRow: { gap: space(1.5), paddingRight: space(3) },
    staffCard: {
      width: 120,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: 'transparent',
      padding: space(1.5),
      alignItems: 'center',
    },
    staffActive: { borderColor: colors.rose, borderWidth: 2 },
    staffAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.bgSunken,
      marginBottom: space(1),
    },
    staffRating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: space(0.5) },
    staffCheck: { position: 'absolute', top: space(1), right: space(1) },
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
    serviceText: { flex: 1, gap: 2 },
    serviceNameRow: { flexDirection: 'row', alignItems: 'center', gap: space(0.75), flexWrap: 'wrap' },
    topTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: colors.goldSoft,
      paddingHorizontal: space(0.75),
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    topText: { color: colors.gold, fontWeight: '700', fontSize: 10 },
    discTag: {
      backgroundColor: colors.rose,
      paddingHorizontal: space(0.75),
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    discText: { color: colors.onColor, fontWeight: '700', fontSize: 10 },
    priceCol: { alignItems: 'flex-end' },
    strike: { textDecorationLine: 'line-through' },
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
    replyBox: {
      marginTop: space(1.25),
      padding: space(1.5),
      backgroundColor: colors.roseSoft,
      borderRadius: radius.md,
      gap: space(0.75),
    },
    replyHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    replyLabel: { fontWeight: '600' },
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
