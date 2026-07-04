import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type BookingStats } from '../../src/api';
import {
  formatPrice,
  RESPONSE_WINDOW_MS,
  SEED_SUPPLIER_ADS,
  SELLER_DATA,
  type SellerMetric,
  type SupplierAd,
} from '../../src/data';
import { greetingKey } from '../../src/greeting';
import { fillParams, useLocale } from '../../src/locale';
import { selectUnreadCount, useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { PressableScale, Screen, Segmented, TAB_BAR_CLEARANCE, Text, WaveLayered } from '../../src/ui';

type Period = 'week' | 'month' | 'all';
type IoniconName = keyof typeof Ionicons.glyphMap;

export default function ReportsScreen() {
  const { t } = useLocale();
  const { colors, gradients, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('week');
  const data = SELLER_DATA[period];
  const salonName = useStore((s) => s.currentUser?.name) ?? 'AYNA İşletme';
  const insets = useSafeAreaInsets();
  // Karşılama için ad (Keşfet dili) — ilk isim, ilk harf büyük (el yazısı katman)
  const firstRaw = salonName.split(' ')[0] || salonName;
  const firstName = firstRaw.charAt(0).toLocaleUpperCase('tr-TR') + firstRaw.slice(1);
  const unread = useStore(selectUnreadCount);
  // §3/§6.1 — hesabın bağı: salon rolü = salon; uzman = bağlı salon adı veya "Bireysel Uzman"
  const role = useStore((s) => s.currentUser?.role);
  const isSalon = role === 'salon'; // §9 uzman ↔ §10 salon ayrımı
  const businessName = useStore((s) => s.currentUser?.businessName);
  // §4.4/§9.2 — ceza/kısıt durumu: hesap kısıtlıysa dashboard'da 7 gün sayaçlı uyarı
  const restricted = useStore((s) => s.currentUser?.restricted ?? false);
  const restrictedDays = useStore((s) => s.currentUser?.restrictedDaysLeft ?? 7);
  const binding =
    role === 'salon'
      ? { icon: 'business' as const, text: t('reports.identity.salon') }
      : businessName
        ? { icon: 'link' as const, text: businessName }
        : { icon: 'person' as const, text: t('reports.identity.independent') };
  // Talepler rozeti = şehirdeki açık talepler; reklamlar şehre göre hedeflenir (sektör admin ucunda)
  const city = useStore((s) => s.currentUser?.city) ?? 'Almatı';
  const openDemands = useStore(
    (s) => s.demands.filter((d) => d.status === 'collecting' && d.city === city).length,
  );
  const ads = SEED_SUPPLIER_ADS.filter((a) => !a.city || a.city === city);

  // §9.2 — yanıt & kalite metrikleri (yerel randevulardan türer)
  const bookings = useStore((s) => s.bookings);
  const quality = useMemo(() => {
    const depositPending = bookings.filter((b) => b.status === 'deposit_submitted').length;
    const done = bookings.filter((b) => b.status === 'completed').length;
    const noShow = bookings.filter((b) => b.status === 'no_show').length;
    const finished = done + noShow;
    const completion = finished > 0 ? Math.round((done / finished) * 100) : null;
    const responded = bookings.filter(
      (b) => b.respondedAt != null && b.responseDeadline != null,
    );
    const avgMin =
      responded.length > 0
        ? Math.round(
            responded.reduce(
              (sum, b) => sum + (b.respondedAt! - (b.responseDeadline! - RESPONSE_WINDOW_MS)),
              0,
            ) /
              responded.length /
              60_000,
          )
        : null;
    return { depositPending, completion, avgMin };
  }, [bookings]);

  // §5 — gerçek randevulardan canlı özet (çevrimdışıysa gizlenir)
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

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Kreatif hero (Keşfet üst kısmı dili: lime bant + el yazısı ad + cut-out portre + dalga) ── */}
        <View style={[styles.hero, { paddingTop: insets.top + space(1) }]}>
          <View style={styles.heroTop}>
            {/* Bağ: Bireysel Uzman / bağlı salon / Salon (panel başlığı yerine — mükerrer değil) */}
            <View style={styles.bindingPill}>
              <Ionicons name={binding.icon} size={12} color={colors.ink} />
              <Text variant="caption" tone="ink" style={styles.bindingPillText} numberOfLines={1}>
                {binding.text}
              </Text>
            </View>
            {/* §5.7 — panelde de bildirim zili */}
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
            <View style={styles.heroText}>
              <Text style={styles.greetLabel}>{t(greetingKey())}</Text>
              <Text
                style={styles.greetName}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {firstName}
              </Text>
            </View>
          </View>
          <Image
            source={require('../../assets/hero-expert.png')}
            style={styles.heroPhoto}
            resizeMode="contain"
          />
          {/* Yeşilin dalgalı bitişi (dalgalanma) */}
          <View style={styles.waveAbs}>
            <WaveLayered sliver={colors.bg} bottom={colors.bg} height={44} />
          </View>
        </View>

        {/* Canlı Özet — yeşile bağlı, iki yanda eşit beyaz kalan dar mor kart */}
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
            {/* §12.8 — ödenecek komisyon (online ciro × oran); yalnız online randevulardan */}
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
        {/* §4.4/§9.2 — ceza/kısıt uyarısı: 7 gün sayacı + ödeme talimatı */}
        {restricted ? (
          <View style={[styles.restrictBox, shadow.soft]}>
            <View style={styles.restrictHead}>
              <Ionicons name="alert-circle" size={20} color={colors.danger} />
              <Text variant="bodyStrong" tone="ink" style={styles.restrictTitle}>
                {t('restricted.title')}
              </Text>
              <View style={styles.restrictDays}>
                <Ionicons name="time-outline" size={12} color={colors.danger} />
                <Text variant="caption" style={styles.restrictDaysText}>
                  {fillParams(t('restricted.days_left'), { n: restrictedDays })}
                </Text>
              </View>
            </View>
            <Text variant="caption" tone="inkSoft" style={styles.restrictBody}>
              {t('restricted.pay')}
            </Text>
            <PressableScale
              style={styles.restrictCta}
              onPress={() => router.push('/seller/commissions')}
            >
              <Ionicons name="receipt-outline" size={15} color={colors.onAccent} />
              <Text variant="bodyStrong" tone="onAccent" style={styles.restrictCtaText}>
                {t('restricted.cta')}
              </Text>
            </PressableScale>
          </View>
        ) : null}

        {/* İki ana operasyonel kart: Talepler + Takvim */}
        <View style={styles.primaryRow}>
          <PrimaryCard
            icon="pricetags"
            title={t('reports.action.requests')}
            sub={t('seller.card.requests_sub')}
            badge={openDemands}
            onPress={() => router.push('/seller/requests')}
          />
          <PrimaryCard
            icon="calendar"
            title={t('reports.action.agenda_own')}
            sub={t('seller.card.agenda_sub')}
            badge={stats?.upcoming ?? 0}
            onPress={() => router.push('/seller/agenda')}
          />
        </View>

        {/* §9.2 — yanıt & kalite: ort. yanıt süresi + bekleyen dekont + tamamlanma oranı */}
        <View style={[styles.qualityCard, shadow.soft]}>
          <View style={styles.qualityHead}>
            <Ionicons name="speedometer-outline" size={15} color={colors.accentFg} />
            <Text variant="label" tone="accentFg">
              {t('reports.quality.title')}
            </Text>
          </View>
          <View style={styles.qualityRow}>
            <QualityTile
              value={quality.avgMin != null ? `${quality.avgMin} ${t('pro.min')}` : t('reports.quality.none')}
              label={t('reports.quality.avg_response')}
            />
            <View style={styles.qualitySep} />
            <QualityTile
              value={String(quality.depositPending)}
              label={t('reports.quality.deposit_pending')}
              alert={quality.depositPending > 0}
            />
            <View style={styles.qualitySep} />
            <QualityTile
              value={quality.completion != null ? `%${quality.completion}` : t('reports.quality.none')}
              label={t('reports.quality.completion')}
            />
          </View>
          <View style={styles.qualityTip}>
            <Ionicons name="flash-outline" size={12} color={colors.accentFg} />
            <Text variant="caption" tone="muted" style={styles.qualityTipText}>
              {t('reports.quality.tip')}
            </Text>
          </View>
        </View>

        {/* Tedarikçi reklamları — sektör malzemeleri (admin panelinden hedeflenir) */}
        {ads.length > 0 ? (
          <>
            <View style={styles.adsHead}>
              <Text variant="label" tone="accentFg">
                {t('seller.ads.title')}
              </Text>
              <View style={styles.sponsoredTag}>
                <Ionicons name="pricetag" size={9} color={colors.muted} />
                <Text variant="caption" tone="muted" style={styles.sponsoredText}>
                  {t('seller.ads.sponsored')}
                </Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.adsRow}
            >
              {ads.map((ad) => (
                <AdCard key={ad.id} ad={ad} />
              ))}
            </ScrollView>
          </>
        ) : null}

        <Text variant="bodyStrong" tone="ink" style={styles.perfTitle}>
          {t('reports.performance')}
        </Text>
        <Segmented
          options={[
            { value: 'week', label: t('reports.period.week') },
            { value: 'month', label: t('reports.period.month') },
            { value: 'all', label: t('reports.period.all') },
          ]}
          value={period}
          onChange={setPeriod}
        />

        <View style={styles.grid}>
          {data.metrics.map((m) => (
            <Metric key={m.id} metric={m} />
          ))}
        </View>

        {/* Uzman performansı — §10.1 SALON'a özel (uzmanın kadrosu yoktur) */}
        {isSalon ? (
          <>
        <Text variant="label" tone="accentFg" style={styles.section}>
          {t('reports.section.staff')}
        </Text>
        <View style={styles.group}>
          {data.staff.map((u, i) => (
            <PressableScale
              key={u.name}
              style={[styles.staffRow, i < data.staff.length - 1 && styles.border]}
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
              <Image source={{ uri: u.image }} style={styles.staffImage} />
              <Text variant="bodyStrong" tone="ink" style={styles.staffName} numberOfLines={1}>
                {u.name}
              </Text>
              <Text variant="caption" tone="muted">
                {u.bookings} {t('reports.bookings')}
              </Text>
              <View style={styles.staffMeta}>
                <Ionicons name="star" size={12} color={colors.gold} />
                <Text variant="caption" tone="inkSoft">
                  {u.rating.toFixed(1)}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.muted} />
              </View>
            </PressableScale>
          ))}
        </View>
          </>
        ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

// Ana operasyonel kart (Talepler / Takvim)
function PrimaryCard({
  icon,
  title,
  sub,
  badge,
  onPress,
}: {
  icon: IoniconName;
  title: string;
  sub: string;
  badge: number;
  onPress: () => void;
}) {
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale style={[styles.primaryCard, shadow.soft]} onPress={onPress}>
      <View style={styles.primaryTop}>
        <View style={styles.primaryIcon}>
          <Ionicons name={icon} size={22} color={colors.accentFg} />
        </View>
        {badge > 0 ? (
          <View style={styles.primaryBadge}>
            <Text style={styles.primaryBadgeText}>{badge > 99 ? '99+' : String(badge)}</Text>
          </View>
        ) : null}
      </View>
      <Text variant="bodyStrong" tone="ink" style={styles.primaryTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={2}>
        {sub}
      </Text>
    </PressableScale>
  );
}

// Tedarikçi reklam banner'ı (gerçek fotoğraflı; alt karartma scrim + "Sponsorlu")
function AdCard({ ad }: { ad: SupplierAd }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale style={styles.adCard}>
      <Image source={{ uri: ad.imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(20,18,22,0)', 'rgba(20,18,22,0.35)', 'rgba(20,18,22,0.88)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.adSponsor}>
        <Text variant="caption" style={styles.adSponsorText}>
          {t('seller.ads.sponsored')}
        </Text>
      </View>
      <View style={styles.adInfo}>
        <Text variant="caption" style={styles.adBrand} numberOfLines={1}>
          {ad.brand}
        </Text>
        <Text variant="bodyStrong" style={styles.adTitle} numberOfLines={2}>
          {ad.title}
        </Text>
        <Text variant="caption" style={styles.adSub} numberOfLines={1}>
          {ad.subtitle}
        </Text>
        <View style={styles.adCta}>
          <Text variant="caption" style={styles.adCtaText}>
            {ad.ctaLabel}
          </Text>
          <Ionicons name="arrow-forward" size={12} color={colors.ink} />
        </View>
      </View>
    </PressableScale>
  );
}

function QualityTile({
  value,
  label,
  alert,
}: {
  value: string;
  label: string;
  alert?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.qualityTile}>
      <Text variant="title" style={[styles.qualityValue, alert ? { color: colors.danger } : null]}>
        {value}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>
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

function Metric({ metric }: { metric: SellerMetric }) {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.metric, shadow.soft]}>
      <View style={styles.metricIcon}>
        <Ionicons name={metric.icon as IoniconName} size={16} color={colors.accentFg} />
      </View>
      <Text variant="title" tone="ink" style={styles.metricValue}>
        {metric.value}
      </Text>
      <View style={styles.metricFoot}>
        <Text variant="caption" tone="muted" style={styles.metricLabel}>
          {t(metric.labelKey)}
        </Text>
        <Text variant="caption" style={{ color: metric.positive ? colors.success : colors.danger }}>
          {metric.delta}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingBottom: TAB_BAR_CLEARANCE + space(2) },
    flex: { flex: 1 },
    body: { paddingHorizontal: space(3), paddingTop: space(2.5) },
    // Canlı Özet — iki yanda beyaz kalan DAR bant; üstü yeşilin dibine tuck (bağlı), yazılar yukarı+sıkı
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

    // ── Kreatif hero (Keşfet dili) ──
    hero: {
      backgroundColor: colors.accent,
      paddingHorizontal: space(3),
      paddingBottom: space(5),
      position: 'relative',
      overflow: 'hidden',
    },
    waveAbs: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1 },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroBody: { flexDirection: 'row', alignItems: 'center', marginTop: space(2.5), minHeight: 175, zIndex: 2 },
    heroText: { flex: 1, justifyContent: 'center', paddingRight: space(1) },
    greetLabel: {
      fontSize: 25,
      lineHeight: 29,
      fontWeight: '500',
      letterSpacing: -0.4,
      color: '#1A1A1A',
      zIndex: 1,
    },
    greetName: {
      fontFamily: 'Caveat_700Bold',
      fontSize: 70,
      lineHeight: 68,
      color: '#FFFFFF',
      alignSelf: 'flex-start',
      marginTop: -6,
      marginLeft: -2,
      transform: [{ rotate: '-9deg' }],
      zIndex: 2,
      textShadowColor: 'rgba(0,0,0,0.15)',
      textShadowOffset: { width: 0, height: 3 },
      textShadowRadius: 8,
    },
    bindingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: 5,
      backgroundColor: 'rgba(255,255,255,0.7)',
      paddingHorizontal: space(1.25),
      paddingVertical: space(0.5),
      borderRadius: radius.pill,
      maxWidth: '86%',
    },
    bindingPillText: { fontWeight: '700' },
    // §6.1 — profil fotoğrafı GÜVENLİ ALANI (safe zone): sabit çerçeve + resizeMode="contain".
    // Kayıt olan her uzmanın cut-out'u bu çerçeveye sığdırılır → zilden uzak, taşmaz, standart.
    heroPhoto: {
      position: 'absolute',
      right: space(1.5),
      bottom: 0,
      width: 168,
      height: 210,
      zIndex: 1,
    },
    // Bildirim zili (hero sağ)
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
    bellBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '800',
      textAlign: 'center',
      includeFontPadding: false,
    },
    // §4.4/§9.2 — kısıtlı mod uyarı kutusu
    restrictBox: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.danger,
      padding: space(1.75),
      gap: space(1),
      marginBottom: space(2.5),
    },
    restrictHead: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
    restrictTitle: { flex: 1 },
    restrictDays: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.dangerSoft,
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    restrictDaysText: { color: colors.danger, fontWeight: '800' },
    restrictBody: { lineHeight: 18 },
    restrictCta: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      backgroundColor: colors.accentFg,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
    },
    restrictCtaText: { fontSize: 14 },

    // §9.2 — yanıt & kalite kartı
    qualityCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(1.75),
      gap: space(1.25),
      marginBottom: space(3),
    },
    qualityHead: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
    qualityRow: { flexDirection: 'row', alignItems: 'center' },
    qualityTile: { flex: 1, alignItems: 'center', gap: 2 },
    qualityValue: { fontSize: 22, lineHeight: 26, color: colors.ink },
    qualitySep: { width: 1, alignSelf: 'stretch', backgroundColor: colors.line },
    qualityTip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.accentSoft,
      borderRadius: radius.md,
      paddingHorizontal: space(1.25),
      paddingVertical: space(1),
    },
    qualityTipText: { flex: 1, lineHeight: 16 },

    // Aksiyon ızgarası
    // İki ana operasyonel kart (Talepler + Takvim)
    primaryRow: { flexDirection: 'row', gap: space(1.5), marginBottom: space(3) },
    primaryCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
      gap: space(0.5),
      minHeight: 108,
    },
    primaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space(0.75) },
    primaryIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBadge: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      paddingHorizontal: 7,
      backgroundColor: '#FF2E93',
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
    primaryTitle: { fontSize: 16 },

    // Tedarikçi reklamları
    adsHead: { flexDirection: 'row', alignItems: 'center', gap: space(1), marginBottom: space(1.25) },
    sponsoredTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: space(0.75),
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    sponsoredText: { fontSize: 10, letterSpacing: 0.2 },
    adsRow: { gap: space(1.5), paddingRight: space(3), paddingBottom: space(1) },
    adCard: {
      width: 290,
      height: 168,
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: colors.surfaceMuted,
      justifyContent: 'flex-end',
    },
    adSponsor: {
      position: 'absolute',
      top: space(1),
      right: space(1),
      backgroundColor: 'rgba(0,0,0,0.45)',
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    adSponsorText: { color: 'rgba(255,255,255,0.9)', fontSize: 9, letterSpacing: 0.3 },
    adInfo: { padding: space(2), gap: 2 },
    adBrand: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', letterSpacing: 0.2 },
    adTitle: { color: '#FFFFFF', fontSize: 16, lineHeight: 20 },
    adSub: { color: 'rgba(255,255,255,0.85)', lineHeight: 16 },
    adCta: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      marginTop: space(1),
      backgroundColor: '#FFFFFF',
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
    },
    adCtaText: { color: colors.ink, fontWeight: '800' },
    perfTitle: { marginTop: space(3), marginBottom: space(1.5) },
    // §5 canlı özet
    liveHead: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
    liveRow: { flexDirection: 'row', justifyContent: 'space-between' },
    liveTile: { flex: 1, alignItems: 'center', gap: 2 },
    liveDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
    liveRevenue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dim: { opacity: 0.9 },
    agendaLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(1.75),
      marginBottom: space(2),
    },
    agendaIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.accentFg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    agendaText: { flex: 1, gap: 2 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5), marginTop: space(2.5) },
    metric: {
      width: '47%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(2),
    },
    metricIcon: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(1),
    },
    metricValue: { fontSize: 24, lineHeight: 30 },
    metricFoot: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    metricLabel: { flex: 1 },
    section: { marginTop: space(3.5), marginBottom: space(1.5) },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
    },
    border: { borderBottomWidth: 1, borderBottomColor: colors.line },
    staffRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      paddingHorizontal: space(2),
      paddingVertical: space(1.5),
    },
    staffImage: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceMuted },
    staffName: { flex: 1 },
    staffMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  });
