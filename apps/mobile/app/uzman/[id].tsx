import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatPrice } from '../../src/data';
import { useProfessionalDetail } from '../../src/catalog';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { TAB_BAR_CLEARANCE, Text } from '../../src/ui';

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

export default function UzmanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const salonId = (id ?? '').split('-u')[0] || '1';
  const salon = useProfessionalDetail(salonId);
  const uzman = salon.staff.find((u) => u.id === id) ?? salon.staff[0];

  const [selected, setSelected] = useState<string>(salon.services[0]?.id ?? '');
  const [dayIdx, setDayIdx] = useState(0);
  const [time, setTime] = useState(TIME_SLOTS[0]!);
  const days = useMemo(() => nextDays(10), []);

  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const isFav = useStore((s) => s.favorites.includes(salonId));

  // Uzman kaydı yoksa (ör. bağımsız) salon detayına düş
  if (!uzman) {
    router.replace('/professional/' + salonId);
    return null;
  }

  const book = () => {
    const d = days[dayIdx]!;
    router.push({
      pathname: '/booking/schedule',
      params: {
        proId: salon.id,
        source: 'direct',
        uzmanId: uzman.id,
        uzmanName: uzman.name,
        serviceId: selected,
        dateLabel: `${t(`wd.${d.wd}` as 'wd.0')} ${d.day} · ${time}`,
      },
    });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 + TAB_BAR_CLEARANCE }}
      >
        {/* HERO — tam kadraj uzman fotoğrafı */}
        <ImageBackground source={{ uri: uzman.image }} style={styles.hero} imageStyle={styles.heroImg}>
          <LinearGradient
            colors={['rgba(30,24,28,0.35)', 'rgba(30,24,28,0)', 'rgba(30,24,28,0.9)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroTop, { top: insets.top + 6 }]}>
            <Pressable style={styles.circleBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={colors.onColor} />
            </Pressable>
            <Pressable style={styles.circleBtn} onPress={() => toggleFavorite(salonId)}>
              <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={colors.onColor} />
            </Pressable>
          </View>

          <View style={styles.heroInfo}>
            <View style={styles.badgePill}>
              <Ionicons name="sparkles" size={12} color={colors.onColor} />
              <Text variant="caption" tone="onColor" style={styles.badgePillText}>
                {uzman.role}
              </Text>
            </View>
            <Text variant="display" tone="onColor" style={styles.heroName} numberOfLines={1}>
              {uzman.name}
            </Text>
            <View style={styles.heroStats}>
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={13} color={colors.gold} />
                <Text variant="bodyStrong" tone="onColor" style={styles.ratingPillText}>
                  {uzman.rating.toFixed(1)}
                </Text>
              </View>
              <Pressable style={styles.salonPill} onPress={() => router.push('/professional/' + salonId)}>
                <Ionicons name="storefront-outline" size={12} color={colors.onColor} />
                <Text variant="caption" tone="onColor" style={styles.salonPillText} numberOfLines={1}>
                  {salon.name}
                </Text>
                <Ionicons name="chevron-forward" size={12} color={colors.onColor} />
              </Pressable>
            </View>
          </View>
        </ImageBackground>

        {/* SHEET */}
        <View style={styles.sheet}>
          <Text variant="body" tone="inkSoft" style={styles.about}>
            {salon.about}
          </Text>

          <Text variant="bodyStrong" tone="ink" style={styles.section}>
            {t('pro.services')}
          </Text>
          <View style={styles.services}>
            {salon.services.map((s) => {
              const active = s.id === selected;
              const finalPrice = s.discountPct
                ? Math.round((s.price * (100 - s.discountPct)) / 100)
                : s.price;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSelected(s.id)}
                  style={[styles.service, shadow.soft, active && styles.serviceActive]}
                >
                  <View style={styles.serviceText}>
                    <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {s.durationMin} {t('pro.min')}
                      {s.discountPct ? `  ·  −%${s.discountPct}` : ''}
                    </Text>
                  </View>
                  <Text variant="bodyStrong" tone="ink">
                    {formatPrice(finalPrice)}
                  </Text>
                  <View style={[styles.check, active && styles.checkOn]}>
                    {active ? <Ionicons name="checkmark" size={14} color={colors.onAccent} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

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
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }]}>
        <Pressable style={styles.ctaBtn} onPress={book}>
          <Text variant="bodyStrong" tone="onAccent" style={styles.ctaText}>
            {t('pro.book')}
          </Text>
          <Ionicons name="arrow-forward" size={19} color={colors.onAccent} />
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    hero: { height: 360, justifyContent: 'flex-end' },
    heroImg: { backgroundColor: colors.bgSunken },
    heroTop: {
      position: 'absolute',
      left: space(2),
      right: space(2),
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    circleBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: 'rgba(0,0,0,0.32)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroInfo: { padding: space(3), paddingBottom: space(4) },
    badgePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(0,0,0,0.32)',
      paddingHorizontal: space(1.25),
      paddingVertical: 5,
      borderRadius: radius.pill,
      marginBottom: space(1),
    },
    badgePillText: { fontWeight: '700' },
    heroName: { fontSize: 30, fontWeight: '800', letterSpacing: -0.4 },
    heroStats: { flexDirection: 'row', alignItems: 'center', gap: space(1), marginTop: space(1) },
    ratingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.18)',
      paddingHorizontal: space(1.25),
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    ratingPillText: { fontWeight: '800' },
    salonPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.18)',
      paddingHorizontal: space(1.25),
      paddingVertical: 6,
      borderRadius: radius.pill,
    },
    salonPillText: { flex: 1, fontWeight: '600' },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      marginTop: -space(3),
      paddingHorizontal: space(3),
      paddingTop: space(3),
    },
    about: { lineHeight: 21 },
    section: { marginTop: space(3), marginBottom: space(1.5), fontSize: 17 },
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
    serviceText: { flex: 1 },
    check: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: { backgroundColor: colors.accent },
    chipRow: { gap: space(1), paddingRight: space(3) },
    dayChip: {
      width: 58,
      alignItems: 'center',
      paddingVertical: space(1.25),
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    dayChipOn: { backgroundColor: colors.accent },
    dayNum: { fontSize: 18, fontWeight: '800', marginTop: 2 },
    timeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    timeChip: {
      paddingHorizontal: space(2),
      paddingVertical: space(1.25),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    timeChipOn: { backgroundColor: colors.accent },
    timeText: { fontWeight: '700' },
    cta: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      backgroundColor: colors.bg,
    },
    ctaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(1),
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
    },
    ctaText: { fontWeight: '800', fontSize: 16 },
  });
