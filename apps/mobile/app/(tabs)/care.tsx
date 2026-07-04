import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, ImageBackground, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { greetingKey } from '../../src/greeting';
import {
  type Appointment,
  type CareRoutine,
  type Moment,
  type PersonalLog,
  type PersonalTone,
  QUICK_ADD,
} from '../../src/data';
import { formatSlot } from '../../src/datetime';
import { useStore } from '../../src/store';
import { fillParams, useLocale } from '../../src/locale';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { PressableScale, ProgressRing, Screen, TabHero, Text } from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

const makeTone = (colors: ColorTokens): Record<PersonalTone, { bg: string; fg: string }> => ({
  // 'rose' anahtarı korunur ama pembe yerine sıcak bal (VELOURA — pembe kaldırıldı)
  rose: { bg: colors.goldSoft, fg: colors.gold },
  sage: { bg: colors.sageSoft, fg: colors.sage },
  lavender: { bg: colors.lavenderSoft, fg: colors.lavender },
  blue: { bg: colors.blueSoft, fg: colors.blue },
});

export default function BenimIcinScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const personalLogs = useStore((s) => s.personalLogs);
  const careRoutines = useStore((s) => s.careRoutines);
  const moments = useStore((s) => s.moments);
  const bookings = useStore((s) => s.bookings);
  const points = useStore((s) => s.points);
  const favCount = useStore((s) => s.favorites.length);
  const userName = useStore((s) => s.currentUser?.name);
  const firstName = userName?.trim().split(/\s+/)[0] ?? 'AYNA';

  const completedCount = useMemo(
    () => bookings.filter((b) => b.status === 'completed').length,
    [bookings],
  );
  // Bakım skoru — gerçek veri: zamanında rutinler / toplam (tutarlılık)
  const score = useMemo(() => {
    if (careRoutines.length === 0) return 0;
    const onTrack = careRoutines.filter((r) => r.dueDays >= 0).length;
    return Math.round((onTrack / careRoutines.length) * 100);
  }, [careRoutines]);
  const scoreState = score >= 80 ? 'great' : score >= 50 ? 'good' : 'low';
  const nextBooking = useMemo(() => {
    const active = bookings.filter((b) =>
      ['confirmed', 'pending', 'awaiting_provider', 'alternative_proposed'].includes(b.status),
    );
    return [...active].sort((a, b) => a.startMs - b.startMs)[0];
  }, [bookings]);


  return (
    <Screen edges={[]}>
      <TabHero title={firstName} subtitle={t(greetingKey())} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* §5.4 #2 — yaklaşan randevu (karşılamadan hemen sonra) */}
        <Animated.View entering={FadeInDown.duration(360).delay(40)} style={styles.block}>
          {nextBooking ? (
            <FeatureCard booking={nextBooking} onPress={() => router.push('/booking/' + nextBooking.id)} />
          ) : (
            <Pressable style={styles.emptyFeature} onPress={() => router.push('/discover')}>
              <View style={styles.emptyFeatureIcon}>
                <Ionicons name="calendar-outline" size={22} color={colors.accentFg} />
              </View>
              <View style={styles.flex}>
                <Text variant="bodyStrong" tone="ink">
                  {t('benim.feature.empty')}
                </Text>
                <Text variant="caption" tone="muted" style={styles.emptyFeatureSub}>
                  {t('benim.feature.empty_sub')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          )}
        </Animated.View>

        {/* §5.4 #3 — Boni */}
        <Animated.View entering={FadeInDown.duration(360).delay(60)} style={styles.block}>
          <BoniCard onPress={() => router.push('/boni')} />
        </Animated.View>

        {/* Bakım skoru — halka göstergeli hero (referans dili) */}
        <Animated.View entering={FadeInDown.duration(360).delay(40)} style={styles.block}>
          {careRoutines.length > 0 ? (
            <Pressable style={[styles.scoreCard, shadow.card]} onPress={() => router.push('/care/routines')}>
              <View style={styles.scoreTop}>
                <ProgressRing
                  size={94}
                  stroke={9}
                  progress={score / 100}
                  color={colors.accent}
                  track={colors.accentSoft}
                >
                  <View style={styles.scoreCenter}>
                    <Text variant="h2" tone="ink" style={styles.scoreNum}>
                      {score}%
                    </Text>
                    <Text variant="label" tone="muted" style={styles.scoreRingLabel}>
                      {t('benim.score.ring')}
                    </Text>
                  </View>
                </ProgressRing>
                <View style={styles.scoreText}>
                  <Text variant="label" tone="muted">
                    {t('benim.score.label')}
                  </Text>
                  <Text variant="h2" tone="ink" style={styles.scoreStatus}>
                    {t(`benim.score.${scoreState}` as 'benim.score.great')}
                  </Text>
                  <Text variant="caption" tone="muted" style={styles.scoreSub}>
                    {t(`benim.score.sub_${scoreState}` as 'benim.score.sub_great')}
                  </Text>
                </View>
              </View>
              <View style={styles.scoreCta}>
                <Text variant="bodyStrong" tone="onAccent">
                  {t('benim.score.cta')}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={colors.onAccent} />
              </View>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.scoreCard, shadow.card]}
              onPress={() => router.push('/care/add?mode=routine')}
            >
              <View style={styles.scoreTop}>
                <View style={[styles.scoreEmptyIcon, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="sparkles" size={26} color={colors.onAccent} />
                </View>
                <View style={styles.scoreText}>
                  <Text variant="label" tone="muted">
                    {t('benim.score.empty_label')}
                  </Text>
                  <Text variant="h2" tone="ink" style={styles.scoreStatus}>
                    {t('benim.score.empty_title')}
                  </Text>
                  <Text variant="caption" tone="muted" style={styles.scoreSub}>
                    {t('benim.score.empty_sub')}
                  </Text>
                </View>
              </View>
              <View style={styles.scoreCta}>
                <Text variant="bodyStrong" tone="onAccent">
                  {t('benim.score.empty_cta')}
                </Text>
                <Ionicons name="add" size={18} color={colors.onAccent} />
              </View>
            </Pressable>
          )}
        </Animated.View>

        {/* İstatistik şeridi */}
        <Animated.View entering={FadeInDown.duration(360).delay(120)} style={styles.block}>
          <View style={[styles.statStrip, shadow.soft]}>
            <StatSegment
              icon="gift-outline"
              tone="gold"
              value={String(points)}
              label={t('benim.summary.points')}
              onPress={() => router.push('/rewards')}
            />
            <View style={styles.statDivider} />
            <StatSegment
              icon="heart-outline"
              tone="accentFg"
              value={String(favCount)}
              label={t('benim.summary.saved')}
              onPress={() => router.push('/favorites')}
            />
            <View style={styles.statDivider} />
            <StatSegment
              icon="checkmark-done-outline"
              tone="sage"
              value={String(completedCount)}
              label={t('benim.summary.completed')}
              onPress={() => router.push('/bookings')}
            />
          </View>
        </Animated.View>

        {/* Hızlı ekle */}
        <Animated.View entering={FadeInDown.duration(360).delay(220)}>
          <Text variant="label" tone="muted" style={styles.quickTitle}>
            {t('benim.quick_title')}
          </Text>
          <View style={styles.quickRow}>
            {QUICK_ADD.map((q) => {
              const c = makeTone(colors)[q.tone];
              return (
                <PressableScale
                  key={q.id}
                  style={styles.quick}
                  onPress={() => router.push('/care/add?kind=' + q.id)}
                >
                  <View style={[styles.quickIcon, { backgroundColor: c.bg }]}>
                    <Ionicons name={q.icon as IoniconName} size={22} color={c.fg} />
                  </View>
                  <Text variant="caption" tone="inkSoft" style={styles.quickLabel} numberOfLines={1}>
                    {t(q.labelKey)}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </Animated.View>

        {/* Kişisel kayıtlar */}
        <Section
          title={t('benim.section.records')}
          count={personalLogs.length}
          onAdd={() => router.push('/care/add?kind=personal')}
          empty={personalLogs.length === 0 ? t('benim.empty.records') : undefined}
        >
          {personalLogs.map((p, i) => (
            <LogRow key={p.id} log={p} border={i < personalLogs.length - 1} />
          ))}
        </Section>

        {/* Bakım takvimi artık ayrı sayfada (Bakım skoru kartındaki "Rutinlerini gör" → /care/routines) */}

        {/* Özel günler */}
        <Section
          title={t('benim.section.moments')}
          count={moments.length}
          onAdd={() => router.push('/care/add?mode=moment')}
          empty={moments.length === 0 ? t('benim.empty.moments') : undefined}
        >
          {moments.map((m, i) => (
            <MomentRow key={m.id} moment={m} border={i < moments.length - 1} />
          ))}
        </Section>
      </ScrollView>
    </Screen>
  );
}

// ── Öne çıkan randevu kartı (görsel zeminli, premium) ──────────────────────
function FeatureCard({ booking, onPress }: { booking: Appointment; onPress: () => void }) {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale style={[styles.feature, shadow.card]} onPress={onPress}>
      <ImageBackground
        source={{ uri: booking.proImage }}
        style={StyleSheet.absoluteFill}
        imageStyle={styles.featureImg}
      >
        <LinearGradient
          colors={['rgba(20,16,18,0.15)', 'rgba(20,16,18,0.78)']}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>
      <View style={styles.featureBadge}>
        <Ionicons name="calendar" size={12} color={colors.onColor} />
        <Text variant="caption" tone="onColor" style={styles.featureBadgeText}>
          {t('benim.feature.badge')}
        </Text>
      </View>
      <View style={styles.featureBody}>
        <Text variant="h2" tone="onColor" numberOfLines={1}>
          {booking.proName}
        </Text>
        <Text variant="caption" tone="onColor" style={styles.featureMeta} numberOfLines={1}>
          {booking.service} · {formatSlot(booking.startMs, t)}
        </Text>
        <View style={styles.featureCta}>
          <Text variant="caption" tone="ink" style={styles.featureCtaText}>
            {t('benim.feature.cta')}
          </Text>
          <Ionicons name="arrow-forward" size={13} color={colors.ink} />
        </View>
      </View>
    </PressableScale>
  );
}

function StatSegment({
  icon,
  tone,
  value,
  label,
  onPress,
}: {
  icon: IoniconName;
  tone: 'gold' | 'accentFg' | 'sage';
  value: string;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const fg = tone === 'gold' ? colors.gold : tone === 'accentFg' ? colors.accentFg : colors.sage;
  return (
    <Pressable style={styles.statSegment} onPress={onPress}>
      <Ionicons name={icon} size={17} color={fg} />
      <Text variant="h2" tone="ink" style={styles.statValue}>
        {value}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// ── Boni kartı + maskot-hazır avatar ──────────────────────────────────────
function BoniCard({ onPress }: { onPress: () => void }) {
  const { t } = useLocale();
  const { colors, gradients, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale onPress={onPress}>
      <LinearGradient
        colors={gradients.plum}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.boniCard, shadow.soft]}
      >
        <BoniAvatar />
        <View style={styles.flex}>
          <Text variant="bodyStrong" tone="onColor">
            {t('boni.entry')}
          </Text>
          <Text variant="caption" tone="onColor" style={styles.dim}>
            {t('boni.subtitle')}
          </Text>
        </View>
        <View style={styles.boniGo}>
          <Ionicons name="arrow-forward" size={16} color={colors.onColor} />
        </View>
      </LinearGradient>
    </PressableScale>
  );
}

// Maskot hazır: assets/boni-mascot.png eklenince
// <Image source={require('../../assets/boni-mascot.png')} style={...}/> ile değiştir.
export function BoniAvatar() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.boniAvatar}>
      <Ionicons name="sparkles" size={22} color={colors.onColor} />
    </View>
  );
}

// ── Bölüm sarmalayıcı (tutarlı başlık + yumuşak kart + boş durum) ──────────
function Section({
  title,
  count,
  onAdd,
  empty,
  children,
}: {
  title: string;
  count: number;
  onAdd: () => void;
  empty?: string;
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleWrap}>
          <Text variant="label" tone="muted" style={styles.sectionTitle}>
            {title}
          </Text>
          {count > 0 ? (
            <View style={styles.countPill}>
              <Text variant="caption" tone="muted">
                {count}
              </Text>
            </View>
          ) : null}
        </View>
        <Pressable hitSlop={8} onPress={onAdd} style={styles.addBtn}>
          <Ionicons name="add" size={15} color={colors.accentFg} />
          <Text variant="caption" tone="accentFg">
            {t('common.add')}
          </Text>
        </Pressable>
      </View>
      {empty ? (
        <View style={styles.emptyRow}>
          <Text variant="caption" tone="muted">
            {empty}
          </Text>
        </View>
      ) : (
        <View style={[styles.group, shadow.soft]}>{children}</View>
      )}
    </View>
  );
}

function LogRow({ log, border }: { log: PersonalLog; border: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const c = makeTone(colors)[log.tone];
  // Karta/… dokununca detay-düzenleme ekranı açılır (orada düzenle + sil)
  const openDetail = () => router.push(`/care/add?id=${log.id}`);
  return (
    <Pressable onPress={openDetail} style={[styles.row, border && styles.rowBorder]}>
      <View style={[styles.iconChip, { backgroundColor: c.bg }]}>
        <Ionicons name={log.icon as IoniconName} size={18} color={c.fg} />
      </View>
      <View style={styles.rowText}>
        <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
          {log.title}
        </Text>
        <Text variant="caption" tone="muted">
          {log.dateLabel}
        </Text>
      </View>
      <Pressable hitSlop={10} onPress={openDetail} style={styles.trash}>
        <Ionicons name="ellipsis-horizontal" size={18} color={colors.muted} />
      </Pressable>
    </Pressable>
  );
}

function dueLabel(days: number, t: (k: 'care.due_in' | 'care.overdue' | 'care.today') => string) {
  if (days < 0) return { text: `${Math.abs(days)} ${t('care.overdue')}`, danger: true };
  if (days === 0) return { text: t('care.today'), danger: false };
  return { text: `${days} ${t('care.due_in')}`, danger: false };
}

export function RoutineRow({ routine, border }: { routine: CareRoutine; border: boolean }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const completeRoutine = useStore((s) => s.completeRoutine);
  const due = dueLabel(routine.dueDays, t);
  // Yeşil tik → onaylı "tamamladım": kazara sıfırlamayı önler, ne olacağını açıklar
  const markDone = () =>
    Alert.alert(
      t('care.done.confirm_title'),
      fillParams(t('care.done.confirm_body'), { name: routine.name, days: routine.periodDays }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('care.done.confirm_yes'), onPress: () => completeRoutine(routine.id) },
      ],
    );
  return (
    <View style={[styles.routineRow, border && styles.rowBorder]}>
      <View style={styles.routineTop}>
        <View style={[styles.iconChip, { backgroundColor: colors.sageSoft }]}>
          <Ionicons name={routine.icon as IoniconName} size={18} color={colors.sage} />
        </View>
        <Text variant="bodyStrong" tone="ink" style={styles.rowText} numberOfLines={1}>
          {routine.name}
        </Text>
        <View style={[styles.duePill, due.danger && styles.dueDanger]}>
          <Text variant="caption" style={{ color: due.danger ? colors.danger : colors.inkSoft }}>
            {due.text}
          </Text>
        </View>
        <Pressable
          hitSlop={8}
          onPress={markDone}
          style={[styles.checkBtn, { backgroundColor: colors.sage }]}
        >
          <Ionicons name="checkmark" size={16} color={colors.onColor} />
        </Pressable>
      </View>
      {/* §5.4.5 — her hatırlatmada "Teklif Al" kısayolu → talep akışı (retention→gelir).
          Bakım kategorisi (Kalıcı oje→Tırnak vb.) talep ekranında otomatik seçilir. */}
      <Pressable
        style={styles.offerLink}
        onPress={() =>
          router.push(
            routine.categoryCode ? `/demand/new?category=${routine.categoryCode}` : '/demand/new',
          )
        }
      >
        <Ionicons name="pricetags-outline" size={13} color={colors.accentFg} />
        <Text variant="caption" tone="accentFg" style={styles.offerText}>
          {t('care.get_offer')}
        </Text>
        <Ionicons name="arrow-forward" size={12} color={colors.accentFg} />
      </Pressable>
    </View>
  );
}

function MomentRow({ moment, border }: { moment: Moment; border: boolean }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.row, border && styles.rowBorder]}>
      <View style={[styles.iconChip, { backgroundColor: colors.lavenderSoft }]}>
        <Ionicons name={moment.icon as IoniconName} size={18} color={colors.lavender} />
      </View>
      <View style={styles.rowText}>
        <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
          {moment.title}
        </Text>
        <Text variant="caption" tone="muted">
          {moment.dateLabel}
        </Text>
      </View>
      <View style={styles.duePill}>
        <Text variant="caption" tone="inkSoft">
          {moment.daysLeft} {t('care.due_in')}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingTop: space(3), paddingBottom: space(13) },
    flex: { flex: 1 },
    dim: { opacity: 0.9 },
    header: { paddingHorizontal: space(3), paddingTop: space(1.5), marginBottom: space(2.5) },
    greetingLabel: { marginBottom: space(0.75) },
    greetingName: { letterSpacing: -0.6 },
    scoreCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: space(2.25) },
    scoreTop: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
    scoreCenter: { alignItems: 'center' },
    scoreNum: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    scoreRingLabel: { fontSize: 9, marginTop: 1 },
    scoreText: { flex: 1, gap: 3 },
    scoreStatus: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, lineHeight: 26 },
    scoreSub: { lineHeight: 17 },
    scoreCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.accent,
      borderRadius: radius.lg,
      paddingVertical: space(1.5),
      marginTop: space(2),
    },
    scoreEmptyIcon: {
      width: 62,
      height: 62,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    block: { paddingHorizontal: space(3), marginBottom: space(2) },

    // Öne çıkan randevu
    feature: {
      height: 164,
      borderRadius: radius.xl,
      overflow: 'hidden',
      justifyContent: 'flex-end',
      backgroundColor: colors.surfaceMuted,
    },
    featureImg: { borderRadius: radius.xl },
    featureBadge: {
      position: 'absolute',
      top: space(2),
      left: space(2),
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(255,255,255,0.22)',
      paddingHorizontal: space(1.25),
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    featureBadgeText: { fontWeight: '600' },
    featureBody: { padding: space(2.25), gap: 3 },
    featureMeta: { opacity: 0.92 },
    featureCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      marginTop: space(1.25),
      backgroundColor: '#FFFFFF',
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
    },
    featureCtaText: { fontWeight: '700' },

    // Boş randevu durumu
    emptyFeature: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(2),
    },
    emptyFeatureIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyFeatureSub: { marginTop: 2 },

    // İstatistik şeridi
    statStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingVertical: space(2),
    },
    statSegment: { flex: 1, alignItems: 'center', gap: 3 },
    statValue: { marginTop: 2 },
    statDivider: { width: 1, height: 36, backgroundColor: colors.line },

    // Boni
    boniCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      borderRadius: radius.lg,
      paddingHorizontal: space(2),
      paddingVertical: space(2),
    },
    boniAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.24)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    boniGo: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Hızlı ekle
    quickTitle: { paddingHorizontal: space(3), marginBottom: space(1.5) },
    quickRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: space(3),
      marginBottom: space(1),
    },
    quick: { alignItems: 'center', width: 72, gap: space(0.75) },
    quickIcon: {
      width: 60,
      height: 60,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickLabel: { textAlign: 'center' },

    // Bölümler
    section: { marginTop: space(2.5) },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space(3),
      marginBottom: space(1.25),
    },
    sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    sectionTitle: {},
    countPill: {
      minWidth: 22,
      paddingHorizontal: space(0.75),
      paddingVertical: 1,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
    },
    // Belirgin hap — düz metin kolayca kaçırılıyordu (keşfedilebilirlik)
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: space(1.25),
      paddingVertical: space(0.6),
      borderRadius: radius.pill,
    },
    emptyRow: {
      marginHorizontal: space(3),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      borderStyle: 'dashed',
      paddingVertical: space(2.5),
      alignItems: 'center',
    },
    group: {
      marginHorizontal: space(3),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(2),
      paddingVertical: space(1.75),
    },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
    routineRow: { paddingHorizontal: space(2), paddingVertical: space(1.5) },
    routineTop: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
    offerLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.5),
      alignSelf: 'flex-start',
      marginTop: space(1),
      marginLeft: space(7),
    },
    offerText: { fontWeight: '700' },
    iconChip: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: { flex: 1 },
    trash: { padding: space(0.5) },
    duePill: {
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: space(1.25),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
    },
    dueDanger: { backgroundColor: colors.dangerSoft },
    checkBtn: {
      width: 32,
      height: 32,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
