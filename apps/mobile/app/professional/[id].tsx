import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, ImageBackground, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MessageKey } from '@ayna/i18n';
import { formatPrice } from '../../src/data';
import { useProfessionalDetail } from '../../src/catalog';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { TAB_BAR_CLEARANCE, Text } from '../../src/ui';

type Tab = 'booking' | 'portfolio' | 'reviews';
const TIME_SLOTS = ['10:00', '10:30', '11:00', '11:30', '13:00', '14:00', '15:30', '16:30', '18:00'];

function nextDays(count: number) {
  const base = Date.now();
  const out: { key: string; wd: number; day: number }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base + i * 86400000);
    out.push({ key: `${d.getMonth()}-${d.getDate()}`, wd: d.getDay(), day: d.getDate() });
  }
  return out;
}

export default function ProfessionalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const proId = id ?? '1';
  const pro = useProfessionalDetail(proId);

  const [tab, setTab] = useState<Tab>('booking');
  const [selected, setSelected] = useState<string>(pro.services[0]?.id ?? '');
  const [uzmanId, setUzmanId] = useState<string>(pro.staff[0]?.id ?? '');
  const [dayIdx, setDayIdx] = useState(0);
  const [time, setTime] = useState(TIME_SLOTS[0]!);
  const days = useMemo(() => nextDays(10), []);
  const isSalon = pro.kind === 'salon' && pro.staff.length > 0;

  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const isFav = useStore((s) => s.favorites.includes(proId));
  const joinWaitlist = useStore((s) => s.joinWaitlist);
  const userReviewsMap = useStore((s) => s.userReviews);
  const reviews = [...(userReviewsMap[proId] ?? []), ...pro.reviews];

  const onWaitlist = () => {
    const svc = pro.services.find((s) => s.id === selected)?.name ?? pro.services[0]?.name ?? '';
    joinWaitlist({ id: pro.id, name: pro.name, image: pro.image, service: svc });
    Alert.alert(t('pro.waitlist_joined'));
  };

  const book = () => {
    const d = days[dayIdx]!;
    router.push({
      pathname: '/booking/schedule',
      params: {
        proId: pro.id,
        source: 'direct',
        uzmanId,
        uzmanName: pro.staff.find((u) => u.id === uzmanId)?.name ?? '',
        serviceId: selected,
        dateLabel: `${t(`wd.${d.wd}` as 'wd.0')} ${d.day} · ${time}`,
      },
    });
  };

  const TABS: { id: Tab; key: MessageKey }[] = [
    { id: 'booking', key: 'pro.tab.booking' },
    { id: 'portfolio', key: 'pro.tab.portfolio' },
    { id: 'reviews', key: 'pro.tab.reviews' },
  ];

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 + TAB_BAR_CLEARANCE }}>
        {/* HERO — tam kadraj foto, altta gradient, isim/puan/rozet foto üstünde */}
        <ImageBackground source={{ uri: pro.image }} style={styles.hero} imageStyle={styles.heroImg}>
          <LinearGradient
            colors={['rgba(30,24,28,0.35)', 'rgba(30,24,28,0)', 'rgba(30,24,28,0.9)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroTop, { top: insets.top + 6 }]}>
            <Pressable style={styles.circleBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={colors.onColor} />
            </Pressable>
            <Pressable style={styles.circleBtn} onPress={() => toggleFavorite(proId)}>
              <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={colors.onColor} />
            </Pressable>
          </View>

          <View style={styles.heroInfo}>
            <View style={styles.badgePill}>
              <Ionicons name="checkmark-circle" size={12} color={colors.onColor} />
              <Text variant="caption" tone="onColor" style={styles.badgePillText}>
                {t(isSalon ? 'pro.kind.salon' : 'pro.kind.independent')}
              </Text>
            </View>
            <Text variant="display" tone="onColor" style={styles.heroName} numberOfLines={1}>
              {pro.name}
            </Text>
            <Text variant="caption" tone="onColor" style={styles.heroMeta} numberOfLines={1}>
              {pro.specialty} · {pro.district}
            </Text>
            <View style={styles.heroStats}>
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={13} color={colors.gold} />
                <Text variant="bodyStrong" tone="onColor" style={styles.ratingPillText}>
                  {pro.rating.toFixed(1)}
                </Text>
                <Text variant="caption" style={styles.ratingPillSub}>
                  ({pro.reviewCount})
                </Text>
              </View>
              {pro.friends ? (
                <View style={styles.friendsPill}>
                  <Ionicons name="people" size={12} color={colors.onColor} />
                  <Text variant="caption" tone="onColor" style={styles.friendsText}>
                    {pro.friends} {t('pro.friends_here')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </ImageBackground>

        {/* SHEET */}
        <View style={styles.sheet}>
          {/* Sekmeler */}
          <View style={styles.tabs}>
            {TABS.map((tb) => {
              const on = tab === tb.id;
              return (
                <Pressable
                  key={tb.id}
                  onPress={() => setTab(tb.id)}
                  style={[styles.tab, on && styles.tabOn]}
                >
                  <Text variant="bodyStrong" tone={on ? 'onAccent' : 'inkSoft'}>
                    {t(tb.key)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tab === 'booking' ? (
            <>
              <Text variant="body" tone="inkSoft" style={styles.about}>
                {pro.about}
              </Text>

              {isSalon ? (
                <>
                  <Text variant="bodyStrong" tone="ink" style={styles.section}>
                    {t('pro.staff')}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.staffRow}>
                    {pro.staff.map((u) => {
                      const on = u.id === uzmanId;
                      return (
                        <Pressable key={u.id} onPress={() => setUzmanId(u.id)} style={styles.staffCard}>
                          <View style={[styles.staffAvatarWrap, on && styles.staffAvatarOn]}>
                            <Image source={{ uri: u.image }} style={styles.staffAvatar} />
                          </View>
                          <Text variant="caption" tone={on ? 'ink' : 'inkSoft'} style={styles.staffName} numberOfLines={1}>
                            {u.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}

              {/* Hizmetler */}
              <Text variant="bodyStrong" tone="ink" style={styles.section}>
                {t('pro.services')}
              </Text>
              <View style={styles.services}>
                {pro.services.map((s) => {
                  const active = s.id === selected;
                  const finalPrice = s.discountPct
                    ? Math.round((s.price * (100 - s.discountPct)) / 100)
                    : s.price;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => setSelected(s.id)}
                      style={[styles.service, active && styles.serviceActive]}
                    >
                      <View style={styles.serviceText}>
                        <View style={styles.serviceNameRow}>
                          <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                            {s.name}
                          </Text>
                          {s.popular ? (
                            <View style={styles.topTag}>
                              <Ionicons name="flame" size={9} color={colors.gold} />
                              <Text variant="caption" style={styles.topText}>
                                {t('pro.service.top')}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text variant="caption" tone="muted">
                          {s.durationMin} {t('pro.min')}
                          {s.discountPct ? `  ·  −%${s.discountPct}` : ''}
                        </Text>
                      </View>
                      <View style={styles.priceCol}>
                        {s.discountPct ? (
                          <Text variant="caption" tone="muted" style={styles.strike}>
                            {formatPrice(s.price)}
                          </Text>
                        ) : null}
                        <Text variant="bodyStrong" tone={active ? 'rose' : 'ink'}>
                          {formatPrice(finalPrice)}
                        </Text>
                      </View>
                      <View style={[styles.check, active && styles.checkOn]}>
                        {active ? <Ionicons name="checkmark" size={14} color={colors.onAccent} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* TARİH — gün çipleri (Arlene stili) */}
              <Text variant="bodyStrong" tone="ink" style={styles.section}>
                {t('pro.select_date')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {days.map((d, i) => {
                  const on = i === dayIdx;
                  return (
                    <Pressable key={d.key} onPress={() => setDayIdx(i)} style={[styles.dayChip, on && styles.dayChipOn]}>
                      <Text variant="caption" tone={on ? 'onAccent' : 'muted'}>
                        {t(`wd.${d.wd}` as 'wd.0')}
                      </Text>
                      <Text variant="h2" tone={on ? 'onAccent' : 'ink'} style={styles.dayNum}>
                        {d.day}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* SAAT — saat çipleri */}
              <Text variant="bodyStrong" tone="ink" style={styles.section}>
                {t('pro.select_time')}
              </Text>
              <View style={styles.timeWrap}>
                {TIME_SLOTS.map((tm) => {
                  const on = tm === time;
                  return (
                    <Pressable key={tm} onPress={() => setTime(tm)} style={[styles.timeChip, on && styles.timeChipOn]}>
                      <Text variant="caption" tone={on ? 'onAccent' : 'inkSoft'} style={styles.timeText}>
                        {tm}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {tab === 'portfolio' ? (
            <View style={styles.grid}>
              {pro.portfolio.map((uri, i) => (
                <Pressable
                  key={uri}
                  onPress={() =>
                    router.push({
                      pathname: '/gallery',
                      params: { images: JSON.stringify(pro.portfolio), index: String(i) },
                    })
                  }
                  style={styles.gridCell}
                >
                  <Image source={{ uri }} style={styles.gridImg} />
                </Pressable>
              ))}
            </View>
          ) : null}

          {tab === 'reviews' ? (
            <View style={styles.reviews}>
              {reviews.map((r) => (
                <View key={r.id} style={[styles.review, shadow.soft]}>
                  <View style={styles.reviewTop}>
                    <View style={styles.reviewAuthor}>
                      <View style={styles.reviewAvatar}>
                        <Ionicons name="shield-checkmark" size={14} color={colors.rose} />
                      </View>
                      <View style={styles.flex}>
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
                        <Ionicons key={i} name="star" size={12} color={i < r.rating ? colors.gold : colors.line} />
                      ))}
                    </View>
                  </View>
                  <Text variant="body" tone="inkSoft" style={styles.reviewText}>
                    {r.text}
                  </Text>
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
          ) : null}
        </View>
      </ScrollView>

      {/* CTA — coral Randevu Al */}
      <View style={[styles.cta, { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }]}>
        <Pressable style={styles.waitlistBtn} onPress={onWaitlist}>
          <Ionicons name="time-outline" size={20} color={colors.inkSoft} />
        </Pressable>
        <Pressable style={styles.bookBtn} onPress={book}>
          <Text variant="bodyStrong" tone="onAccent">
            {t('pro.book')}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={colors.onAccent} />
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    hero: { height: 380, justifyContent: 'flex-end', backgroundColor: colors.bgSunken },
    heroImg: {},
    heroTop: {
      position: 'absolute',
      left: space(2),
      right: space(2),
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    circleBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.32)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroInfo: { padding: space(3), paddingBottom: space(4) },
    badgePill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      backgroundColor: 'rgba(0,0,0,0.32)',
      paddingHorizontal: space(1.25),
      paddingVertical: 5,
      borderRadius: radius.pill,
      marginBottom: space(1),
    },
    badgePillText: { fontWeight: '600' },
    heroName: { fontSize: 32, fontWeight: '800', letterSpacing: -0.6 },
    heroMeta: { color: 'rgba(255,255,255,0.85)', marginTop: 2 },
    heroStats: { flexDirection: 'row', alignItems: 'center', gap: space(1), marginTop: space(1.5) },
    ratingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: space(1.25),
      paddingVertical: 6,
      borderRadius: radius.pill,
    },
    ratingPillText: { fontSize: 14 },
    ratingPillSub: { color: 'rgba(255,255,255,0.75)' },
    friendsPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: space(1.25),
      paddingVertical: 6,
      borderRadius: radius.pill,
    },
    friendsText: {},
    sheet: {
      marginTop: -24,
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: space(3),
      paddingTop: space(2.5),
    },
    tabs: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.pill,
      padding: 4,
    },
    tab: { flex: 1, alignItems: 'center', paddingVertical: space(1.25), borderRadius: radius.pill },
    tabOn: { backgroundColor: colors.accent },
    about: { marginTop: space(2.5), lineHeight: 22 },
    section: { marginTop: space(3), marginBottom: space(1.5) },
    staffRow: { gap: space(2), paddingRight: space(3) },
    staffCard: { alignItems: 'center', width: 68 },
    staffAvatarWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      padding: 3,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    staffAvatarOn: { borderColor: colors.accent },
    staffAvatar: { width: '100%', height: '100%', borderRadius: 30, backgroundColor: colors.bgSunken },
    staffName: { marginTop: space(0.75) },
    services: { gap: space(1.25) },
    service: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
    },
    serviceActive: { backgroundColor: colors.accentSoft },
    serviceText: { flex: 1, gap: 3 },
    serviceNameRow: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
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
    priceCol: { alignItems: 'flex-end' },
    strike: { textDecorationLine: 'line-through' },
    check: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipRow: { gap: space(1.25), paddingRight: space(3) },
    dayChip: {
      width: 58,
      alignItems: 'center',
      gap: 2,
      paddingVertical: space(1.25),
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
    },
    dayChipOn: { backgroundColor: colors.accent },
    dayNum: { fontSize: 18, fontWeight: '800' },
    timeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    timeChip: {
      paddingHorizontal: space(2),
      paddingVertical: space(1.25),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
    },
    timeChipOn: { backgroundColor: colors.accent },
    timeText: { fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5), marginTop: space(1) },
    gridCell: { width: '47.5%', aspectRatio: 0.82 },
    gridImg: { width: '100%', height: '100%', borderRadius: radius.lg, backgroundColor: colors.bgSunken },
    reviews: { gap: space(1.5), marginTop: space(1) },
    review: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(2) },
    reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reviewAuthor: { flexDirection: 'row', alignItems: 'center', gap: space(1), flex: 1 },
    flex: { flex: 1 },
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.bg,
      borderTopWidth: 1,
      borderTopColor: colors.line,
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
    },
    waitlistBtn: {
      width: 52,
      height: 52,
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bookBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 52,
      borderRadius: radius.lg,
      backgroundColor: colors.accent,
    },
  });
