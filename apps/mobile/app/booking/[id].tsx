import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { computeDaySlots } from '@ayna/domain';
import { DEPOSIT_KZT, FREE_CANCEL_WINDOW_MS, type BookingSource, formatPrice } from '../../src/data';
import { almatyDayStart, formatSlot } from '../../src/datetime';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import type { MessageKey } from '@ayna/i18n';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, SlotPicker, StackHeader, Text, type PickerDay } from '../../src/ui';

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
  const allBookings = useStore((s) => s.bookings);
  const closedDays = useStore((s) => s.closedDays);
  const cancelBooking = useStore((s) => s.cancelBooking);
  const acceptAlternative = useStore((s) => s.acceptAlternative);
  const approveBooking = useStore((s) => s.approveBooking);
  const rejectBooking = useStore((s) => s.rejectBooking);
  const proposeAlternative = useStore((s) => s.proposeAlternative);
  const submitReceipt = useStore((s) => s.submitReceipt);
  const confirmReceipt = useStore((s) => s.confirmReceipt);
  const markNoShow = useStore((s) => s.markNoShow);
  const uploadRefundReceipt = useStore((s) => s.uploadRefundReceipt);
  const confirmRefund = useStore((s) => s.confirmRefund);
  const disputeBooking = useStore((s) => s.disputeBooking);
  const acceptReassignment = useStore((s) => s.acceptReassignment);
  const rejectReassignment = useStore((s) => s.rejectReassignment);
  const role = useStore((s) => s.currentUser?.role);
  const isProvider = !!role && role !== 'customer';

  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposeSel, setProposeSel] = useState<number | null>(null);

  // Alternatif-öner modalı için uzmanın boş slotları (§4.1 adım 2)
  const proposeDays: PickerDay[] = useMemo(() => {
    if (!booking) return [];
    const now = Date.now();
    const busy = allBookings
      .filter((b) => b.id !== booking.id && b.proId === booking.proId && b.status !== 'cancelled')
      .map((b) => ({ startMs: b.startMs, endMs: b.startMs + b.durationMin * 60_000 }));
    const out: PickerDay[] = [];
    for (let d = 0; d < 14; d++) {
      const dayStart = almatyDayStart(now, d);
      const openWindows = closedDays.includes(dayStart)
        ? []
        : [{ startMs: dayStart + 10 * 3_600_000, endMs: dayStart + 19 * 3_600_000 }];
      const slots = computeDaySlots({
        openWindows,
        busy,
        serviceDurationMs: booking.durationMin * 60_000,
        stepMs: 30 * 60_000,
        nowMs: now,
        minLeadMs: 2 * 3_600_000,
      });
      out.push({ dateMs: dayStart + 10 * 3_600_000, slots });
    }
    return out;
  }, [booking, allBookings, closedDays]);

  async function uploadReceipt() {
    if (!id) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]) submitReceipt(id, res.assets[0].uri);
  }

  async function uploadRefund() {
    if (!id) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]) uploadRefundReceipt(id, res.assets[0].uri);
  }

  function sendProposal() {
    if (id && proposeSel != null) proposeAlternative(id, proposeSel);
    setProposeOpen(false);
    setProposeSel(null);
  }

  if (!booking) {
    return (
      <Screen edges={[]}>
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
    // §4.4 — 3 saatten az kaldıysa geç iptal: depozito yanar
    const late = booking ? booking.startMs - Date.now() <= FREE_CANCEL_WINDOW_MS : false;
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
    booking.status === 'alternative_proposed' ||
    booking.status === 'deposit_pending' ||
    booking.status === 'deposit_submitted';
  const showContact = booking.status === 'confirmed';

  return (
    <Screen edges={['bottom']}>
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
          <Field icon="time-outline" labelKey="booking.field.datetime" value={formatSlot(booking.startMs, t)} />
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
        {booking.status === 'alternative_proposed' && booking.proposedStartMs != null ? (
          <View style={[styles.proposedCard, shadow.soft]}>
            <Text variant="caption" tone="muted">
              {t('booking.detail.proposed')}
            </Text>
            <Text variant="h2" tone="ink" style={styles.proposedTime}>
              {formatSlot(booking.proposedStartMs, t)}
            </Text>
            <Button
              label={t('booking.detail.accept')}
              variant="primary"
              onPress={() => id && acceptAlternative(id)}
            />
          </View>
        ) : null}

        {/* §4.5 — Uzman ayrıldı, yeni uzman atandı: kullanıcı yeniden onaylar */}
        {!isProvider && booking.status === 'reassigned_pending' ? (
          <View style={[styles.depositCard, shadow.card]}>
            <View style={styles.depositHead}>
              <Ionicons name="swap-horizontal-outline" size={18} color={colors.ink} />
              <Text variant="bodyStrong" tone="ink">
                {t('booking.reassign.title')}
              </Text>
            </View>
            <Text variant="caption" tone="muted" style={styles.depositDesc}>
              {t('booking.reassign.desc')}
            </Text>
            {booking.reassignedFrom ? (
              <View style={styles.depositRow}>
                <Text variant="caption" tone="muted">
                  {t('booking.reassign.from')}
                </Text>
                <Text variant="bodyStrong" tone="ink">
                  {booking.reassignedFrom}
                </Text>
              </View>
            ) : null}
            {booking.uzmanName ? (
              <View style={styles.depositRow}>
                <Text variant="caption" tone="muted">
                  {t('booking.reassign.to')}
                </Text>
                <Text variant="bodyStrong" tone="ink">
                  {booking.uzmanName}
                </Text>
              </View>
            ) : null}
            <Button
              label={t('booking.reassign.accept')}
              variant="primary"
              onPress={() => id && acceptReassignment(id)}
            />
            <Button
              label={t('booking.reassign.reject')}
              variant="ghost"
              onPress={() => id && rejectReassignment(id)}
            />
          </View>
        ) : null}

        {/* §4.3 — Depozito adımı (kullanıcı: ön onaydan sonra dekont yükler) */}
        {!isProvider && booking.status === 'deposit_pending' ? (
          <View style={[styles.depositCard, shadow.card]}>
            <View style={styles.depositHead}>
              <Ionicons name="card-outline" size={18} color={colors.ink} />
              <Text variant="bodyStrong" tone="ink">
                {t('booking.deposit.title')}
              </Text>
            </View>
            <Text variant="caption" tone="muted" style={styles.depositDesc}>
              {t('booking.deposit.desc')}
            </Text>
            <View style={styles.depositRow}>
              <Text variant="caption" tone="muted">
                {t('booking.deposit.amount')}
              </Text>
              <Text variant="bodyStrong" tone="ink">
                {formatPrice(booking.depositAmount ?? DEPOSIT_KZT)}
              </Text>
            </View>
            <View style={styles.depositRow}>
              <Text variant="caption" tone="muted">
                {t('booking.deposit.payto')}
              </Text>
              <Text variant="bodyStrong" tone="ink">
                Kaspi · +7 700 123 45 67
              </Text>
            </View>
            <Text variant="caption" tone="muted" style={styles.depositNote}>
              {t('booking.deposit.note')}
            </Text>
            <Button label={t('booking.deposit.upload')} variant="primary" onPress={uploadReceipt} />
          </View>
        ) : null}

        {/* §4.3 — Dekont gönderildi (kullanıcı: uzman onayı bekleniyor) */}
        {!isProvider && booking.status === 'deposit_submitted' ? (
          <View style={[styles.depositCard, shadow.soft]}>
            <View style={styles.depositHead}>
              <Ionicons name="receipt-outline" size={18} color={colors.blue} />
              <Text variant="bodyStrong" tone="ink">
                {t('booking.status.deposit_submitted')}
              </Text>
            </View>
            <Text variant="caption" tone="muted" style={styles.depositDesc}>
              {t('booking.deposit.submitted_note')}
            </Text>
            {booking.receiptUri ? (
              <Image source={{ uri: booking.receiptUri }} style={styles.receiptThumb} />
            ) : null}
          </View>
        ) : null}

        {/* §4.3 — Uzman: yüklenen dekont */}
        {isProvider && booking.status === 'deposit_submitted' && booking.receiptUri ? (
          <View style={[styles.depositCard, shadow.soft]}>
            <View style={styles.depositHead}>
              <Ionicons name="receipt-outline" size={18} color={colors.ink} />
              <Text variant="bodyStrong" tone="ink">
                {t('booking.provider.receipt')}
              </Text>
            </View>
            <Image source={{ uri: booking.receiptUri }} style={styles.receiptThumb} />
          </View>
        ) : null}

        {/* §4.4 — İade akışı: kullanıcı bekliyor */}
        {!isProvider && booking.status === 'refund_pending' ? (
          <View style={styles.note}>
            <Ionicons name="return-up-back-outline" size={14} color={colors.gold} />
            <Text variant="caption" tone="muted" style={styles.noteText}>
              {t('booking.refund.pending_user')}
            </Text>
          </View>
        ) : null}

        {/* §4.4 — İade dekontu yüklendi: kullanıcı "aldım" onaylar */}
        {!isProvider && booking.status === 'refund_submitted' ? (
          <View style={[styles.depositCard, shadow.card]}>
            <View style={styles.depositHead}>
              <Ionicons name="return-up-back-outline" size={18} color={colors.ink} />
              <Text variant="bodyStrong" tone="ink">
                {t('booking.refund.title')}
              </Text>
            </View>
            <Text variant="caption" tone="muted" style={styles.depositDesc}>
              {t('booking.refund.desc')}
            </Text>
            {booking.refundReceiptUri ? (
              <Image source={{ uri: booking.refundReceiptUri }} style={styles.receiptThumb} />
            ) : null}
            <Button
              label={t('booking.refund.confirm')}
              variant="primary"
              onPress={() => id && confirmRefund(id)}
            />
          </View>
        ) : null}

        {/* §4.4 — Ceza notu (geç iptal veya no-show → kapora yandı) + itiraz */}
        {!isProvider && (booking.depositForfeited || booking.status === 'no_show') ? (
          <View style={[styles.reasonCard, shadow.soft]}>
            <View style={styles.reasonHead}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
              <Text variant="caption" tone="muted">
                {t(booking.status === 'no_show' ? 'booking.penalty.noshow' : 'booking.penalty.forfeited')}
              </Text>
            </View>
            <Button
              label={t('booking.dispute.cta')}
              variant="ghost"
              onPress={() => id && disputeBooking(id)}
            />
          </View>
        ) : null}

        {/* §4.4 — İtiraz açıldı */}
        {booking.status === 'disputed' ? (
          <View style={styles.note}>
            <Ionicons name="flag-outline" size={14} color={colors.gold} />
            <Text variant="caption" tone="muted" style={styles.noteText}>
              {t('booking.dispute.done')}
            </Text>
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
          {isProvider ? (
            <>
              {/* §4.1 — uzman yanıtı: kabul / alternatif / reddet */}
              {booking.status === 'awaiting_provider' ? (
                <>
                  <Button
                    label={t('booking.provider.approve')}
                    variant="primary"
                    onPress={() => id && approveBooking(id)}
                  />
                  <Button
                    label={t('booking.provider.propose')}
                    variant="secondary"
                    onPress={() => setProposeOpen(true)}
                  />
                  <Button
                    label={t('booking.provider.reject')}
                    variant="ghost"
                    onPress={() => id && rejectBooking(id)}
                  />
                </>
              ) : null}
              {booking.status === 'deposit_pending' ? (
                <View style={styles.note}>
                  <Ionicons name="hourglass-outline" size={14} color={colors.gold} />
                  <Text variant="caption" tone="muted" style={styles.noteText}>
                    {t('booking.provider.pending_receipt')}
                  </Text>
                </View>
              ) : null}
              {booking.status === 'deposit_submitted' ? (
                <Button
                  label={t('booking.provider.confirm_receipt')}
                  variant="primary"
                  onPress={() => id && confirmReceipt(id)}
                />
              ) : null}
              {booking.status === 'confirmed' ? (
                <Button
                  label={t('booking.provider.mark_noshow')}
                  variant="secondary"
                  onPress={() => id && markNoShow(id)}
                />
              ) : null}
              {/* §4.4 — serbest iptal: uzman iade dekontunu yükler */}
              {booking.status === 'refund_pending' ? (
                <>
                  <View style={styles.note}>
                    <Ionicons name="return-up-back-outline" size={14} color={colors.gold} />
                    <Text variant="caption" tone="muted" style={styles.noteText}>
                      {t('booking.refund.provider_pending')}
                    </Text>
                  </View>
                  <Button
                    label={t('booking.refund.provider_upload')}
                    variant="primary"
                    onPress={uploadRefund}
                  />
                </>
              ) : null}
            </>
          ) : (
            <>
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
            </>
          )}
        </View>
      </ScrollView>

      {/* §4.1 adım 2 — uzman alternatif saat önerir (boş slotlardan seçer) */}
      <Modal visible={proposeOpen} transparent animationType="slide" onRequestClose={() => setProposeOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHead}>
              <Text variant="h2" tone="ink" style={styles.modalTitle}>
                {t('booking.provider.propose')}
              </Text>
              <Pressable onPress={() => setProposeOpen(false)} hitSlop={8} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <SlotPicker days={proposeDays} selected={proposeSel} onSelect={setProposeSel} />
            </ScrollView>
            <Button
              label={t('booking.detail.proposed')}
              variant={proposeSel != null ? 'primary' : 'secondary'}
              disabled={proposeSel == null}
              onPress={sendProposal}
            />
          </View>
        </View>
      </Modal>
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
        <Ionicons name={icon} size={17} color={colors.ink} />
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
  deposit_pending: { key: 'booking.status.deposit_pending', bg: colors.goldSoft, fg: colors.gold },
  deposit_submitted: { key: 'booking.status.deposit_submitted', bg: colors.blueSoft, fg: colors.blue },
  refund_pending: { key: 'booking.status.refund_pending', bg: colors.goldSoft, fg: colors.gold },
  refund_submitted: { key: 'booking.status.refund_submitted', bg: colors.blueSoft, fg: colors.blue },
  disputed: { key: 'booking.status.disputed', bg: colors.dangerSoft, fg: colors.danger },
  reassigned_pending: { key: 'booking.status.reassigned_pending', bg: colors.blueSoft, fg: colors.blue },
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
      width: 38,
      height: 38,
      borderRadius: radius.md,
      backgroundColor: colors.accentSoft,
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
    depositCard: {
      marginTop: space(2),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1.25),
    },
    depositHead: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    depositDesc: { lineHeight: 17 },
    depositRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    depositNote: { lineHeight: 16, marginTop: space(0.5) },
    receiptThumb: {
      width: '100%',
      height: 160,
      borderRadius: radius.md,
      backgroundColor: colors.bgSunken,
      marginTop: space(0.5),
    },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: space(3),
      paddingTop: space(2.5),
      paddingBottom: space(3),
      maxHeight: '80%',
      gap: space(1.5),
    },
    modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    modalTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
    modalClose: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalBody: { paddingVertical: space(1) },
  });
