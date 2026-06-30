import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native';
import { type BookingSource, formatPrice } from '../../src/data';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import type { MessageKey } from '@ayna/i18n';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

const SOURCE_KEY: Record<BookingSource, MessageKey> = {
  direct: 'bookings.tab.direct',
  photo_quote: 'bookings.tab.photo',
  demand: 'bookings.tab.demand',
};

export default function BookingDetailScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = useStore((s) => s.bookings.find((b) => b.id === id));
  const cancelBooking = useStore((s) => s.cancelBooking);
  const acceptAlternative = useStore((s) => s.acceptAlternative);

  if (!booking) {
    return (
      <Screen edges={['top']}>
        <StackHeader title={t('booking.detail.title')} />
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={32} color={colors.muted} />
          <Text variant="caption" tone="muted" style={styles.emptyText}>
            {t('bookings.empty')}
          </Text>
        </View>
      </Screen>
    );
  }

  const st = makeStatus(colors)[booking.status];

  // §6.C — iptal: "neden gelemiyorum" sebebi seçilebilir (opsiyonel)
  function doCancel(reason?: string) {
    if (id) cancelBooking(id, reason);
    router.back();
  }

  function onCancel() {
    const late = booking?.inDays === 0; // aynı gün → geç iptal uyarısı (politika)
    const msg = late ? t('booking.cancel.late_warn') : t('booking.cancel.prompt');
    Alert.alert(t('booking.detail.cancel'), msg, [
      { text: t('booking.cancel.reason.plan'), onPress: () => doCancel(t('booking.cancel.reason.plan')) },
      { text: t('booking.cancel.reason.time'), onPress: () => doCancel(t('booking.cancel.reason.time')) },
      { text: t('booking.cancel.reason.price'), onPress: () => doCancel(t('booking.cancel.reason.price')) },
      { text: t('booking.cancel.no_reason'), style: 'destructive', onPress: () => doCancel(undefined) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  const canCancel =
    booking.status === 'confirmed' ||
    booking.status === 'pending' ||
    booking.status === 'awaiting_provider' ||
    booking.status === 'alternative_proposed';
  const showContact = booking.status === 'confirmed';

  return (
    <Screen edges={['top', 'bottom']}>
      <StackHeader title={t('booking.detail.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Uzman / salon */}
        <View style={[styles.proCard, shadow.card]}>
          <Image source={{ uri: booking.proImage }} style={styles.proImage} />
          <View style={styles.proBody}>
            <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
              {booking.proName}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {booking.service}
            </Text>
            <View style={[styles.status, { backgroundColor: st.bg }]}>
              <Text variant="caption" style={[styles.statusText, { color: st.fg }]}>
                {t(st.key)}
              </Text>
            </View>
          </View>
        </View>

        {/* Detaylar */}
        <View style={[styles.card, shadow.card]}>
          <Field icon="cut-outline" labelKey="booking.field.service" value={booking.service} />
          <Field icon="time-outline" labelKey="booking.field.datetime" value={booking.dateLabel} />
          {booking.uzmanName ? (
            <Field icon="person-outline" labelKey="booking.field.pro" value={booking.uzmanName} />
          ) : null}
          <Field
            icon="git-branch-outline"
            labelKey="booking.detail.source"
            value={t(SOURCE_KEY[booking.source])}
          />
          <Field
            icon="pricetag-outline"
            labelKey="booking.field.price"
            value={formatPrice(booking.price)}
            last
          />
        </View>

        {/* İletişim — yalnızca onaylı randevularda (privacy-by-design) */}
        {showContact ? (
          <>
            <View style={[styles.card, shadow.card]}>
              <Field
                icon="location-outline"
                labelKey="booking.field.address"
                value="Almatı, Dostyk 12"
              />
              <Field
                icon="call-outline"
                labelKey="booking.field.phone"
                value="+7 700 123 45 67"
                last
              />
            </View>
            <View style={styles.note}>
              <Ionicons name="lock-closed" size={13} color={colors.muted} />
              <Text variant="caption" tone="muted" style={styles.noteText}>
                {t('booking.address_note')}
              </Text>
            </View>
          </>
        ) : null}

        {/* Onay bekleniyor (§1.6) */}
        {booking.status === 'awaiting_provider' ? (
          <View style={styles.note}>
            <Ionicons name="hourglass-outline" size={14} color={colors.gold} />
            <Text variant="caption" tone="muted" style={styles.noteText}>
              {t('booking.detail.awaiting_note')}
            </Text>
          </View>
        ) : null}

        {/* Uzmanın önerdiği alternatif (§1.6) */}
        {booking.status === 'alternative_proposed' && booking.proposedDateLabel ? (
          <View style={[styles.proposedCard, shadow.soft]}>
            <Text variant="caption" tone="muted">
              {t('booking.detail.proposed')}
            </Text>
            <Text variant="h2" tone="ink" style={styles.proposedTime}>
              {booking.proposedDateLabel}
            </Text>
            <Button
              label={t('booking.detail.accept')}
              variant="primary"
              onPress={() => id && acceptAlternative(id)}
            />
          </View>
        ) : null}

        {/* §6.C — iptal sebebi (kullanıcı ilettiyse) */}
        {booking.status === 'cancelled' && booking.cancelReason ? (
          <View style={[styles.reasonCard, shadow.soft]}>
            <View style={styles.reasonHead}>
              <Ionicons name="chatbox-ellipses-outline" size={14} color={colors.muted} />
              <Text variant="caption" tone="muted">
                {t('booking.cancel.reason_label')}
              </Text>
            </View>
            <Text variant="body" tone="ink">
              {booking.cancelReason}
            </Text>
          </View>
        ) : null}

        {/* §6.C — gelmedi (no-show) bilgisi */}
        {booking.status === 'no_show' ? (
          <View style={styles.note}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
            <Text variant="caption" tone="muted" style={styles.noteText}>
              {t('booking.noshow_note')}
            </Text>
          </View>
        ) : null}

        {/* Aksiyonlar */}
        <View style={styles.actions}>
          {booking.status === 'completed' && !booking.reviewed ? (
            <Button
              label={t('booking.detail.review')}
              variant="primary"
              onPress={() => router.push('/review/new?id=' + booking.id)}
            />
          ) : null}
          {booking.status === 'completed' && booking.reviewed ? (
            <Button label={t('booking.detail.reviewed')} variant="ghost" disabled />
          ) : null}
          <Button
            label={t('booking.detail.rebook')}
            variant="ghost"
            onPress={() => router.push('/professional/' + booking.proId)}
          />
          {canCancel ? (
            <Button label={t('booking.detail.cancel')} variant="secondary" onPress={onCancel} />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Field({
  icon,
  labelKey,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: MessageKey;
  value: string;
  last?: boolean;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.field, !last && styles.fieldBorder]}>
      <View style={styles.fieldIcon}>
        <Ionicons name={icon} size={17} color={colors.rose} />
      </View>
      <View style={styles.fieldText}>
        <Text variant="caption" tone="muted">
          {t(labelKey)}
        </Text>
        <Text variant="bodyStrong" tone="ink">
          {value}
        </Text>
      </View>
    </View>
  );
}

const makeStatus = (
  colors: ColorTokens,
): Record<string, { key: MessageKey; bg: string; fg: string }> => ({
  confirmed: { key: 'booking.status.confirmed', bg: colors.successSoft, fg: colors.success },
  pending: { key: 'booking.status.pending', bg: colors.goldSoft, fg: colors.gold },
  completed: { key: 'booking.status.completed', bg: colors.surfaceMuted, fg: colors.inkSoft },
  cancelled: { key: 'booking.status.cancelled', bg: colors.dangerSoft, fg: colors.danger },
  awaiting_provider: { key: 'booking.status.awaiting', bg: colors.goldSoft, fg: colors.gold },
  alternative_proposed: { key: 'booking.status.alternative', bg: colors.blueSoft, fg: colors.blue },
  no_show: { key: 'booking.status.no_show', bg: colors.dangerSoft, fg: colors.danger },
  waitlist: { key: 'booking.status.waitlist', bg: colors.blueSoft, fg: colors.blue },
});

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4) },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: space(8),
      gap: space(1.5),
    },
    emptyText: {},
    proCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
    },
    proImage: {
      width: 64,
      height: 64,
      borderRadius: radius.md,
      backgroundColor: colors.bgSunken,
    },
    proBody: { flex: 1, gap: 3, alignItems: 'flex-start' },
    status: {
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
      marginTop: 2,
    },
    statusText: { fontSize: 11 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: space(2),
      marginTop: space(2),
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingVertical: space(1.75),
    },
    fieldBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
    fieldIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: colors.roseSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fieldText: { flex: 1, gap: 2 },
    note: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      marginTop: space(1.5),
      paddingHorizontal: space(1),
    },
    noteText: { flex: 1 },
    proposedCard: {
      marginTop: space(2),
      backgroundColor: colors.blueSoft,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1),
    },
    proposedTime: { marginBottom: space(0.5) },
    reasonCard: {
      marginTop: space(2),
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(0.75),
    },
    reasonHead: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
    actions: { marginTop: space(3), gap: space(1.25) },
  });
