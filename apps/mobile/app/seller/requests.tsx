import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { CATEGORIES, type DemandRequest, formatPrice } from '../../src/data';
import { almatySlotMs } from '../../src/datetime';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

const catLabel = (id: string): MessageKey =>
  (CATEGORIES.find((c) => c.id === id)?.labelKey ?? 'nav.discover') as MessageKey;

export default function SellerRequestsScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const demands = useStore((s) => s.demands);
  const submitOffer = useStore((s) => s.submitOffer);

  const open = useMemo(
    () => demands.filter((d) => d.status === 'collecting').sort((a, b) => a.expiresAt - b.expiresAt),
    [demands],
  );

  const [form, setForm] = useState<{ id: string } | null>(null);
  const [price, setPrice] = useState('');
  const [eta, setEta] = useState('60');
  const [note, setNote] = useState('');

  function openForm(id: string) {
    setPrice('');
    setEta('60');
    setNote('');
    setForm({ id });
  }

  function send() {
    if (!form) return;
    const now = Date.now();
    const slots = [almatySlotMs(now, 1, 11, 0), almatySlotMs(now, 1, 15, 0), almatySlotMs(now, 2, 13, 0)];
    submitOffer(form.id, {
      price: Number(price) || 0,
      etaMin: Number(eta) || 60,
      ...(note.trim() ? { note: note.trim() } : {}),
      slots,
    });
    setForm(null);
  }

  const canSend = Number(price) > 0 && Number(eta) > 0;

  return (
    <Screen edges={[]}>
      <StackHeader title={t('seller.requests.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {open.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="pricetags-outline" size={30} color={colors.muted} />
            <Text variant="caption" tone="muted">
              {t('seller.requests.empty')}
            </Text>
          </View>
        ) : (
          open.map((d) => <RequestCard key={d.id} demand={d} onGive={() => openForm(d.id)} />)
        )}
      </ScrollView>

      <Modal visible={form !== null} transparent animationType="slide" onRequestClose={() => setForm(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text variant="h2" tone="ink" style={styles.sheetTitle}>
                {t('offer.form.title')}
              </Text>
              <Pressable onPress={() => setForm(null)} hitSlop={8} style={styles.close}>
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>

            <Text variant="caption" tone="inkSoft" style={styles.label}>
              {t('offer.form.price')}
            </Text>
            <TextInput
              value={price}
              onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ''))}
              placeholder="9000"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              style={styles.input}
            />
            <Text variant="caption" tone="inkSoft" style={styles.label}>
              {t('offer.form.eta')}
            </Text>
            <TextInput
              value={eta}
              onChangeText={(v) => setEta(v.replace(/[^0-9]/g, ''))}
              placeholder="60"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              style={styles.input}
            />
            <Text variant="caption" tone="inkSoft" style={styles.label}>
              {t('offer.form.note')}
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('offer.form.note_ph')}
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <View style={styles.slotHint}>
              <Ionicons name="time-outline" size={14} color={colors.muted} />
              <Text variant="caption" tone="muted">
                {t('offer.form.slots_note')}
              </Text>
            </View>
            <Button
              label={t('offer.form.send')}
              variant={canSend ? 'primary' : 'secondary'}
              disabled={!canSend}
              onPress={send}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function RequestCard({ demand, onGive }: { demand: DemandRequest; onGive: () => void }) {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const remainMin = Math.max(0, Math.round((demand.expiresAt - Date.now()) / 60_000));
  const urgent = remainMin <= 60;

  return (
    <View style={[styles.card, shadow.soft]}>
      <View style={styles.cardTop}>
        <View style={styles.catIcon}>
          <Ionicons
            name={demand.mode === 'photo' ? 'image-outline' : 'chatbubble-ellipses-outline'}
            size={20}
            color={colors.rose}
          />
        </View>
        <Text variant="bodyStrong" tone="ink" style={styles.flex}>
          {t(catLabel(demand.category))}
        </Text>
        <View style={[styles.countdown, urgent && styles.countdownUrgent]}>
          <Ionicons name="alarm-outline" size={12} color={urgent ? colors.onColor : colors.gold} />
          <Text variant="caption" style={{ color: urgent ? colors.onColor : colors.gold, fontWeight: '700' }}>
            {t('seller.requests.last')} {remainMin} {t('quotes.remain')}
          </Text>
        </View>
      </View>

      {demand.note ? (
        <Text variant="caption" tone="inkSoft" style={styles.note} numberOfLines={2}>
          {demand.note}
        </Text>
      ) : null}

      <View style={styles.metaRow}>
        {demand.budget ? (
          <View style={styles.metaChip}>
            <Ionicons name="wallet-outline" size={12} color={colors.inkSoft} />
            <Text variant="caption" tone="inkSoft">
              {t('seller.requests.budget')}: {formatPrice(demand.budget)}
            </Text>
          </View>
        ) : null}
        <View style={styles.metaChip}>
          <Ionicons name="pricetags-outline" size={12} color={colors.inkSoft} />
          <Text variant="caption" tone="inkSoft">
            {demand.offers.length} {t('quotes.count')}
          </Text>
        </View>
      </View>

      <Button label={t('seller.requests.give')} variant="primary" onPress={onGive} />
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), paddingBottom: space(6), gap: space(1.5) },
    empty: { alignItems: 'center', paddingTop: space(8), gap: space(1) },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(2), gap: space(1.25) },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    catIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.roseSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    flex: { flex: 1 },
    countdown: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.goldSoft,
      paddingHorizontal: space(1),
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    countdownUrgent: { backgroundColor: colors.danger },
    note: { lineHeight: 18 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: space(1),
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: space(3),
      paddingTop: space(2.5),
      paddingBottom: space(3),
      gap: space(0.5),
    },
    sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space(1) },
    sheetTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
    close: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
    label: { marginTop: space(1.5), marginBottom: space(0.75) },
    input: {
      height: 52,
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      fontSize: 16,
      color: colors.ink,
    },
    slotHint: { flexDirection: 'row', alignItems: 'center', gap: space(0.75), marginTop: space(1.5), marginBottom: space(2) },
  });
