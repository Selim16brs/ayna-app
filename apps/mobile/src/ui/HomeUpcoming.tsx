import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { Appointment, BookingStatus } from '../data';
import { daysUntil, formatSlot, slotTime } from '../datetime';
import { useLocale } from '../locale';
import { useProfessionals } from '../catalog';
import { useStore } from '../store';
import { control, font, radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { BookingSteps } from './BookingSteps';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

/**
 * ANA EKRAN · YAKLAŞAN RANDEVU.
 *
 * "Randevum ne zaman?" ana ekranı açma sebeplerinin birincisi; eskiden cevabı
 * iki dokunuş uzaktaydı. Kart, durum adım çubuğuyla birlikte "nerede kaldık"
 * sorusunu da aynı yerde cevaplar.
 */

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
  // Kanvas 'mesafe' istiyordu; ama mesafe kullanıcı konumu gerektirir ve konum
  // varsayılan olarak KAPALI (gizlilik kararı). Onun yerine uzmanın mahallesi
  // gösteriliyor — gerçek veri, izin gerektirmiyor, aynı işi görüyor.
  const pros = useProfessionals();
  const district = next ? (pros.find((p) => p.id === next.proId)?.district ?? '') : '';

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
              {district ? (
                <View style={styles.place}>
                  <Ionicons name="location-outline" size={12} color={colors.muted} />
                  <Text variant="micro" tone="muted" numberOfLines={1}>
                    {district}
                  </Text>
                </View>
              ) : null}
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

        <BookingSteps status={next.status} hasReceipt={hasReceipt} />

        <View style={styles.actions}>
          <Action
            icon="swap-horizontal-outline"
            label={t('home.next.reschedule')}
            onPress={() => router.push(`/booking/${next.id}` as never)}
          />
          {/* Sohbet uzman profilinden başlıyor (api.startConversation + ownerUserId
              orada, hata yönetimiyle birlikte). Mesaj listesine göndermek çıkmazdı:
              liste boşsa kullanıcının yapabileceği hiçbir şey yoktu. */}
          <Action
            icon="chatbubble-ellipses-outline"
            label={t('home.next.message')}
            onPress={() =>
              next.proId
                ? router.push(`/professional/${next.proId}` as never)
                : router.push('/messages')
            }
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
    place: { flexDirection: 'row', alignItems: 'center', gap: 3 },
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
