import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import type { Appointment, BookingStatus } from '../data';
import { daysUntil, formatSlot, slotTime } from '../datetime';
import { useLocale } from '../locale';
import { useStore } from '../store';
import { control, font, radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

/**
 * ANA EKRAN · YAKLAŞAN RANDEVU.
 *
 * "Randevum ne zaman?" ana ekranı açma sebeplerinin birincisi; eskiden cevabı
 * iki dokunuş uzaktaydı. Kart, durum adım çubuğuyla birlikte "nerede kaldık"
 * sorusunu da aynı yerde cevaplar.
 */

const STEPS: { key: MessageKey; done: (s: BookingStatus, hasReceipt: boolean) => boolean }[] = [
  { key: 'home.next.step_request', done: () => true },
  {
    key: 'home.next.step_accepted',
    done: (s) => s !== 'awaiting_provider' && s !== 'alternative_proposed',
  },
  {
    key: 'home.next.step_deposit',
    done: (s, hasReceipt) => hasReceipt || s === 'confirmed' || s === 'completed',
  },
  { key: 'home.next.step_service', done: (s) => s === 'completed' },
];

/** Bir sonraki gerçekleşecek randevu: iptal/bitmiş olanlar hariç, en yakın gelecek. */
function pickNext(bookings: Appointment[], now: number): Appointment | null {
  const dead: BookingStatus[] = ['cancelled', 'completed', 'expired', 'no_show'];
  const future = bookings
    .filter((b) => !dead.includes(b.status) && b.startMs > now)
    .sort((a, b) => a.startMs - b.startMs);
  return future[0] ?? null;
}

export function HomeUpcoming() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const bookings = useStore((s) => s.bookings);
  const next = useMemo(() => pickNext(bookings, Date.now()), [bookings]);

  if (!next) return null;

  const dLeft = daysUntil(next.startMs, Date.now());
  const dayLabel =
    dLeft === 0
      ? t('home.next.today')
      : dLeft === 1
        ? t('home.next.tomorrow')
        : formatSlot(next.startMs, t);
  const when = dLeft <= 1 ? `${dayLabel} · ${slotTime(next.startMs)}` : dayLabel;
  const hasReceipt = Boolean(next.receiptUri);
  const onsite = next.depositAmount ? next.price - next.depositAmount : 0;

  return (
    <View style={styles.wrap}>
      <Text variant="h2" tone="ink" style={styles.heading}>
        {t('home.next.title')}
      </Text>

      <PressableScale
        style={[styles.card, shadow.card]}
        onPress={() => router.push(`/booking/${next.id}` as never)}
        accessibilityRole="button"
        accessibilityLabel={`${next.proName} · ${when}`}
      >
        <View style={styles.head}>
          {next.proImage ? (
            <Image source={{ uri: next.proImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person-outline" size={22} color={colors.muted} />
            </View>
          )}
          <View style={styles.headText}>
            <View style={styles.whenRow}>
              <Text numeric style={styles.when}>
                {when}
              </Text>
              {onsite > 0 ? (
                <Text numeric variant="micro" tone="muted" numberOfLines={1}>
                  {onsite.toLocaleString('tr-TR')} ₸ {t('home.next.onsite')}
                </Text>
              ) : null}
            </View>
            <Text variant="title" tone="ink" numberOfLines={2}>
              {next.uzmanName ?? next.proName} · {next.service}
            </Text>
          </View>
        </View>

        {/* Durum adım çubuğu — şu anki adım dolu, geçmişler tik, gelecek boş halka */}
        <View style={styles.steps}>
          {STEPS.map((step, i) => {
            const done = step.done(next.status, hasReceipt);
            const prevDone = i === 0 || STEPS[i - 1]!.done(next.status, hasReceipt);
            const current = !done && prevDone;
            return (
              <View key={step.key} style={styles.step}>
                <View style={styles.stepTop}>
                  {i > 0 ? (
                    <View style={[styles.rail, prevDone && styles.railDone]} />
                  ) : (
                    <View style={styles.railSpacer} />
                  )}
                  <View
                    style={[
                      styles.dot,
                      done && styles.dotDone,
                      current && styles.dotCurrent,
                      !done && !current && styles.dotIdle,
                    ]}
                  >
                    {done ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
                  </View>
                  {i < STEPS.length - 1 ? (
                    <View style={[styles.rail, done && styles.railDone]} />
                  ) : (
                    <View style={styles.railSpacer} />
                  )}
                </View>
                <Text
                  variant="micro"
                  tone={current ? 'ink' : 'muted'}
                  style={styles.stepLabel}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {t(step.key)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.actions}>
          <Action
            icon="swap-horizontal-outline"
            label={t('home.next.reschedule')}
            onPress={() => router.push(`/booking/${next.id}` as never)}
          />
          {/* NOT: doğrudan sohbet açmak uzmanın ownerUserId'sini ve api.startConversation
              çağrısını gerektiriyor; randevu kaydı bu alanı taşımıyor. Yanlış kimlikle
              boş sohbet açmaktansa listeye gidiyoruz. Randevuya ownerUserId eklenince
              doğrudan açılacak. */}
          <Action
            icon="chatbubble-ellipses-outline"
            label={t('home.next.message')}
            onPress={() => router.push('/messages')}
          />
          <Action
            icon="navigate-outline"
            label={t('home.next.route')}
            onPress={() => router.push('/map')}
          />
        </View>
      </PressableScale>
    </View>
  );
}

function Action({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable style={styles.action} onPress={onPress} accessibilityRole="button">
      <Ionicons name={icon} size={17} color={colors.inkSoft} />
      <Text
        variant="meta"
        tone="inkSoft"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    wrap: { marginTop: space(2.5), gap: space(1.25) },
    heading: { paddingHorizontal: space(3) },
    card: {
      marginHorizontal: space(2.5),
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: space(2),
      gap: space(2),
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
    avatar: { width: 60, height: 60, borderRadius: radius.md, backgroundColor: colors.bgSunken },
    avatarFallback: { alignItems: 'center', justifyContent: 'center' },
    headText: { flex: 1, gap: 3 },
    whenRow: { flexDirection: 'row', alignItems: 'center', gap: space(1), flexWrap: 'wrap' },
    when: {
      fontFamily: font.semibold,
      fontSize: 14,
      lineHeight: 19,
      color: colors.success,
      backgroundColor: colors.successSoft,
      borderRadius: radius.xs / 2,
      paddingHorizontal: space(1),
      paddingVertical: 2,
      overflow: 'hidden',
    },

    steps: { flexDirection: 'row' },
    step: { flex: 1, alignItems: 'center', gap: 5 },
    stepTop: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
    rail: { flex: 1, height: 2, backgroundColor: colors.line },
    railDone: { backgroundColor: colors.success },
    railSpacer: { flex: 1 },
    dot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotDone: { backgroundColor: colors.success },
    dotCurrent: { backgroundColor: colors.accent },
    dotIdle: { borderWidth: 2, borderColor: colors.line, backgroundColor: colors.surface },
    stepLabel: { textAlign: 'center' },

    actions: {
      flexDirection: 'row',
      gap: space(1),
      borderTopWidth: 1,
      borderTopColor: colors.line,
      paddingTop: space(1.75),
    },
    action: {
      flex: 1,
      height: control.button,
      borderRadius: control.button / 2,
      backgroundColor: colors.surfaceMuted,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(0.75),
      paddingHorizontal: space(1),
    },
  });
