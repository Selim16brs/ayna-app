import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type BookingStats } from '../../src/api';
import { formatPrice, SELLER_DATA } from '../../src/data';
import { greetingKey } from '../../src/greeting';
import { fillParams, useLocale } from '../../src/locale';
import { selectUnreadCount, useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { PressableScale, Screen, TAB_BAR_CLEARANCE, Text, WaveLayered } from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

// §10.1 — SALON dashboard: kadro-merkezli. Uzman listesi + performansları önde; yönetim tek yerde.
export default function SalonHomeScreen() {
  const { t } = useLocale();
  const { colors, gradients, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const salonName = useStore((s) => s.currentUser?.name) ?? 'Salon';
  const firstRaw = salonName.split(' ')[0] || salonName;
  const firstName = firstRaw.charAt(0).toLocaleUpperCase('tr-TR') + firstRaw.slice(1);
  const unread = useStore(selectUnreadCount);
  const premium = useStore((s) => s.premium);
  const staff = SELLER_DATA.month.staff;

  const [stats, setStats] = useState<BookingStats | null>(null);
  useEffect(() => {
    let alive = true;
    api
      .bookingStats()
      .then((s) => alive && setStats(s))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // §10.1 — uzman performansı: puan (gerçek) + doluluk/yanıt (kadro satırından deterministik türetim)
  const perf = (name: string, rating: number) => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    const occupancy = 60 + (Math.abs(h) % 38); // %60–97
    const response = 8 + (Math.abs(h >> 3) % 34); // 8–41 dk
    return { occupancy, response, rating };
  };

  const QUICK: { icon: IoniconName; label: string; route: string; badge?: number }[] = [
    { icon: 'business', label: t('salon.quick.profile'), route: '/salon/profile' },
    { icon: 'people', label: t('salon.quick.staff'), route: '/salon/staff' },
    { icon: 'calendar', label: t('salon.quick.agenda'), route: '/salon/agenda' },
    { icon: 'cash', label: t('salon.quick.commissions'), route: '/seller/commissions' },
    { icon: 'star', label: t('salon.quick.reviews'), route: '/seller/reviews' },
    { icon: 'pricetags', label: t('salon.quick.promotions'), route: '/seller/promotions' },
  ];

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Lime hero — salon kimliği + karşılama */}
        <View style={[styles.hero, { paddingTop: insets.top + space(1) }]}>
          <View style={styles.heroTop}>
            <View style={styles.bindingPill}>
              <Ionicons name="business" size={12} color={colors.ink} />
              <Text variant="caption" tone="ink" style={styles.bindingText} numberOfLines={1}>
                {t('reports.identity.salon')}
              </Text>
            </View>
            <PressableScale style={styles.bell} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={20} color={colors.ink} />
              {unread > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : String(unread)}</Text>
                </View>
              ) : null}
            </PressableScale>
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.greetLabel}>{t(greetingKey())}</Text>
            <Text style={styles.greetName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {firstName}
            </Text>
          </View>
          <View style={styles.waveAbs}>
            <WaveLayered sliver={colors.bg} bottom={colors.bg} height={44} />
          </View>
        </View>

        {/* Canlı özet */}
        {stats ? (
          <LinearGradient colors={gradients.plum} style={styles.liveBand}>
            <View style={styles.liveHead}>
              <Ionicons name="pulse" size={15} color={colors.onColor} />
              <Text variant="label" tone="onColor">
                {t('reports.live.title')}
              </Text>
            </View>
            <View style={styles.liveRow}>
              <LiveTile value={String(stats.upcoming)} label={t('reports.live.upcoming')} />
              <LiveTile value={String(stats.completed)} label={t('reports.live.completed')} />
              <LiveTile value={`%${stats.noShowRate}`} label={t('reports.live.noshow')} />
            </View>
            <View style={styles.liveDivider} />
            <View style={styles.liveRevenue}>
              <Text variant="caption" tone="onColor" style={styles.dim}>
                {t('reports.live.revenue')}
              </Text>
              <Text variant="h2" tone="onColor">
                {formatPrice(stats.revenue)}
              </Text>
            </View>
            <View style={styles.liveRevenue}>
              <Text variant="caption" tone="onColor" style={styles.dim}>
                {t('reports.live.commission')} (%{stats.commissionRate})
              </Text>
              <Text variant="bodyStrong" tone="onColor">
                {formatPrice(stats.commission)}
              </Text>
            </View>
          </LinearGradient>
        ) : null}

        <View style={styles.body}>
          {/* §11.2 — salon görünürlük upsell (davetkâr ton; premium değilse) */}
          {!premium ? (
            <PressableScale
              style={[styles.upsell, shadow.soft]}
              onPress={() => router.push('/seller/premium')}
            >
              <LinearGradient colors={gradients.gold} style={styles.upsellIcon}>
                <Ionicons name="sparkles" size={18} color={colors.onAccent} />
              </LinearGradient>
              <View style={styles.flex}>
                <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                  {t('salon.upsell.title')}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={2}>
                  {fillParams(t('salon.upsell.body'), { n: 7 })}
                </Text>
                <Text variant="caption" tone="accentFg" style={styles.upsellCta}>
                  {t('salon.upsell.cta')} →
                </Text>
              </View>
            </PressableScale>
          ) : null}

          {/* §10.1 — UZMAN PERFORMANSLARI (salon panelinin çekirdeği) */}
          <View style={styles.sectionHead}>
            <Text variant="bodyStrong" tone="ink">
              {t('salon.home.staff_title')}
            </Text>
            <PressableScale onPress={() => router.push('/salon/staff')}>
              <Text variant="caption" tone="accentFg" style={styles.seeAll}>
                {t('salon.quick.staff')}
              </Text>
            </PressableScale>
          </View>
          <Text variant="caption" tone="muted" style={styles.sectionSub}>
            {t('salon.home.staff_sub')}
          </Text>

          {staff.length === 0 ? (
            <View style={[styles.emptyCard, shadow.soft]}>
              <Text variant="caption" tone="muted">
                {t('salon.home.empty_staff')}
              </Text>
            </View>
          ) : (
            <View style={styles.staffList}>
              {staff.map((u) => {
                const p = perf(u.name, u.rating);
                return (
                  <PressableScale
                    key={u.name}
                    style={[styles.staffCard, shadow.soft]}
                    onPress={() =>
                      router.push({
                        pathname: '/seller/staff',
                        params: {
                          name: u.name,
                          image: u.image,
                          bookings: String(u.bookings),
                          rating: String(u.rating),
                        },
                      })
                    }
                  >
                    <Image source={{ uri: u.image }} style={styles.staffImg} />
                    <View style={styles.staffInfo}>
                      <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                        {u.name}
                      </Text>
                      <View style={styles.perfRow}>
                        <PerfChip icon="star" tint={colors.gold} value={p.rating.toFixed(1)} label={t('salon.metric.rating')} />
                        <PerfChip icon="pie-chart" tint={colors.accentFg} value={`%${p.occupancy}`} label={t('salon.metric.occupancy')} />
                        <PerfChip icon="time" tint={colors.inkSoft} value={`${p.response}dk`} label={t('salon.metric.response')} />
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </PressableScale>
                );
              })}
            </View>
          )}

          {/* §10.1 — YÖNETİM: salonun ihtiyacı olan her şey tek yerde */}
          <Text variant="bodyStrong" tone="ink" style={styles.manageTitle}>
            {t('salon.home.manage')}
          </Text>
          <View style={styles.grid}>
            {QUICK.map((q) => (
              <PressableScale
                key={q.route}
                style={[styles.tile, shadow.soft]}
                onPress={() => router.push(q.route as never)}
              >
                <View style={styles.tileIcon}>
                  <Ionicons name={q.icon} size={20} color={colors.accentFg} />
                </View>
                <Text variant="caption" tone="ink" style={styles.tileLabel} numberOfLines={2}>
                  {q.label}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function PerfChip({
  icon,
  tint,
  value,
  label,
}: {
  icon: IoniconName;
  tint: string;
  value: string;
  label: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.perfChip}>
      <Ionicons name={icon} size={11} color={tint} />
      <Text variant="caption" tone="ink" style={styles.perfVal}>
        {value}
      </Text>
      <Text variant="caption" tone="muted" style={styles.perfLbl}>
        {label}
      </Text>
    </View>
  );
}

function LiveTile({ value, label }: { value: string; label: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.liveTile}>
      <Text variant="h2" tone="onColor">
        {value}
      </Text>
      <Text variant="caption" tone="onColor" style={styles.dim} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingBottom: TAB_BAR_CLEARANCE + space(2) },
    flex: { flex: 1 },
    hero: {
      backgroundColor: colors.accent,
      paddingHorizontal: space(3),
      paddingBottom: space(5),
      position: 'relative',
      overflow: 'hidden',
    },
    waveAbs: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1 },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroBody: { marginTop: space(2), minHeight: 90, justifyContent: 'center', zIndex: 2 },
    greetLabel: { fontSize: 24, lineHeight: 28, fontWeight: '500', letterSpacing: -0.4, color: '#1A1A1A' },
    greetName: {
      fontFamily: 'Caveat_700Bold',
      fontSize: 60,
      lineHeight: 60,
      color: '#FFFFFF',
      alignSelf: 'flex-start',
      marginTop: -4,
      transform: [{ rotate: '-7deg' }],
      textShadowColor: 'rgba(0,0,0,0.15)',
      textShadowOffset: { width: 0, height: 3 },
      textShadowRadius: 8,
    },
    bindingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(255,255,255,0.7)',
      paddingHorizontal: space(1.25),
      paddingVertical: space(0.5),
      borderRadius: radius.pill,
    },
    bindingText: { fontWeight: '700' },
    bell: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bellBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 19,
      height: 19,
      borderRadius: 9.5,
      paddingHorizontal: 4,
      backgroundColor: '#FF2E93',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
    },
    bellBadgeText: { color: '#FFFFFF', fontSize: 10, lineHeight: 12, fontWeight: '800', includeFontPadding: false },
    liveBand: {
      marginHorizontal: space(3),
      marginTop: -space(5),
      paddingHorizontal: space(2.25),
      paddingTop: space(1.25),
      paddingBottom: space(1.5),
      gap: space(0.75),
      borderRadius: radius.xl,
      zIndex: 3,
    },
    liveHead: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
    liveRow: { flexDirection: 'row', justifyContent: 'space-between' },
    liveTile: { flex: 1, alignItems: 'center', gap: 2 },
    liveDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
    liveRevenue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dim: { opacity: 0.9 },
    body: { paddingHorizontal: space(3), paddingTop: space(2.5) },
    upsell: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
      marginBottom: space(2.5),
    },
    upsellIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    upsellCta: { fontWeight: '800', marginTop: 3 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    seeAll: { fontWeight: '700' },
    sectionSub: { marginTop: 2, marginBottom: space(1.5) },
    emptyCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(2) },
    staffList: { gap: space(1.25) },
    staffCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.5),
    },
    staffImg: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surfaceMuted },
    staffInfo: { flex: 1, gap: space(0.75) },
    perfRow: { flexDirection: 'row', gap: space(0.75), flexWrap: 'wrap' },
    perfChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: space(0.75),
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    perfVal: { fontWeight: '800', fontSize: 11 },
    perfLbl: { fontSize: 10 },
    manageTitle: { marginTop: space(3), marginBottom: space(1.5) },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5) },
    tile: {
      width: '47%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1),
      alignItems: 'flex-start',
    },
    tileIcon: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileLabel: { fontWeight: '700', lineHeight: 16 },
  });
