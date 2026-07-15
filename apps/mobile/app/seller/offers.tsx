import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api, ApiError, type ApiOffer } from '../../src/api';
import { activeCategories } from '../../src/taxonomy';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, DateField, Screen, StackHeader, Text, TextInput } from '../../src/ui';
import type { MessageKey } from '@ayna/i18n';

const CATS = activeCategories();
const DAY_KEYS: MessageKey[] = [
  'day.sun',
  'day.mon',
  'day.tue',
  'day.wed',
  'day.thu',
  'day.fri',
  'day.sat',
];
// Ölü saat pencereleri (brief §2.3 time_window) — hazır seçenekler
const WINDOWS: { label: string; from: string; to: string }[] = [
  { label: '', from: '', to: '' }, // tüm gün
  { label: '10:00–13:00', from: '10:00', to: '13:00' },
  { label: '14:00–17:00', from: '14:00', to: '17:00' },
  { label: '18:00–21:00', from: '18:00', to: '21:00' },
];

// §keşif Modül 2 — uzman/salon kampanya yönetimi: self-publish (otomatik kural kontrolü
// sunucuda), aktif limit uzman 1 / salon 3, duraklat/sil, kota takibi.
export default function SellerOffersScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const token = useStore((s) => s.token);

  const [rows, setRows] = useState<ApiOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  // form
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [sector, setSector] = useState(CATS[0]!.id);
  const [pct, setPct] = useState('20');
  const [basePrice, setBasePrice] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [winIdx, setWinIdx] = useState(0);
  const [endsAt, setEndsAt] = useState<Date>(() => new Date(Date.now() + 14 * 24 * 3600 * 1000));
  const [quota, setQuota] = useState('');

  const load = useCallback(() => {
    if (!token) return;
    let alive = true;
    void api
      .myOffers(token)
      .then((r) => alive && setRows(r))
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token]);
  useFocusEffect(load);

  const valid =
    title.trim().length >= 3 && Number(pct) >= 5 && Number(pct) <= 50 && Number(basePrice) > 0;

  async function submit() {
    if (!token || !valid || busy) return;
    setBusy(true);
    try {
      const win = WINDOWS[winIdx]!;
      await api.createOffer(token, {
        title: title.trim(),
        description: desc.trim(),
        sector,
        discountType: 'percent',
        discountValue: Number(pct),
        basePrice: Number(basePrice),
        validDays: days,
        timeFrom: win.from,
        timeTo: win.to,
        startsAtMs: Date.now(),
        endsAtMs: endsAt.getTime(),
        ...(Number(quota) > 0 ? { slotQuota: Number(quota) } : {}),
      });
      setCreating(false);
      setTitle('');
      setDesc('');
      setBasePrice('');
      setDays([]);
      setQuota('');
      load();
      Alert.alert(t('offers.created_t'), t('offers.created_b'));
    } catch (e) {
      const code = e instanceof ApiError ? e.code : '';
      const key: MessageKey =
        code === 'ACTIVE_LIMIT'
          ? 'offers.err.limit'
          : code === 'OVERLAPPING_OFFER'
            ? 'offers.err.overlap'
            : code === 'EXTERNAL_CONTACT'
              ? 'offers.err.contact'
              : code === 'BASE_PRICE_INFLATED'
                ? 'offers.err.inflated'
                : code === 'DISCOUNT_RANGE'
                  ? 'offers.err.range'
                  : 'common.error';
      Alert.alert(t(key));
    } finally {
      setBusy(false);
    }
  }

  async function action(id: string, a: 'pause' | 'resume' | 'remove') {
    if (!token) return;
    try {
      await api.offerAction(token, id, a);
      load();
    } catch {
      Alert.alert(t('common.error'));
    }
  }

  const STATUS_KEY: Record<string, MessageKey> = {
    active: 'offers.st.active',
    paused: 'offers.st.paused',
    expired: 'offers.st.expired',
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('offers.mine_title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" tone="muted" style={styles.lead}>
          {t('offers.mine_lead')}
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: space(3) }} />
        ) : (
          rows.map((o) => (
            <View key={o.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text variant="bodyStrong" tone="ink" style={styles.cardTitle} numberOfLines={1}>
                  {o.title}
                </Text>
                <View style={[styles.st, o.status === 'active' ? styles.stOn : styles.stOff]}>
                  <Text variant="caption" tone={o.status === 'active' ? 'onAccent' : 'inkSoft'}>
                    {t(STATUS_KEY[o.status] ?? 'offers.st.expired')}
                  </Text>
                </View>
              </View>
              <Text variant="caption" tone="muted">
                -%{o.discountValue} · {o.basePrice.toLocaleString('tr-TR')} ₸ →{' '}
                {o.finalPrice.toLocaleString('tr-TR')} ₸
                {o.slotQuota ? ` · ${o.usedCount ?? 0}/${o.slotQuota}` : ''}
              </Text>
              <View style={styles.cardActions}>
                {o.status === 'active' ? (
                  <Pressable style={styles.actBtn} onPress={() => action(o.id, 'pause')}>
                    <Text variant="caption" tone="inkSoft">
                      {t('offers.act.pause')}
                    </Text>
                  </Pressable>
                ) : o.status === 'paused' ? (
                  <Pressable style={styles.actBtn} onPress={() => action(o.id, 'resume')}>
                    <Text variant="caption" tone="inkSoft">
                      {t('offers.act.resume')}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={styles.actBtn}
                  onPress={() =>
                    Alert.alert(t('offers.remove_q'), '', [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('common.ok'),
                        style: 'destructive',
                        onPress: () => action(o.id, 'remove'),
                      },
                    ])
                  }
                >
                  <Text variant="caption" style={{ color: colors.danger }}>
                    {t('offers.act.remove')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        {!creating ? (
          <Pressable style={styles.newBtn} onPress={() => setCreating(true)}>
            <Ionicons name="add" size={18} color={colors.onAccent} />
            <Text variant="bodyStrong" tone="onAccent">
              {t('offers.new')}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.form}>
            <Text variant="bodyStrong" tone="ink" style={styles.formTitle}>
              {t('offers.new')}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('offers.f.title')}
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder={t('offers.f.desc')}
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.inputMulti]}
              multiline
            />
            <Text variant="caption" tone="inkSoft" style={styles.label}>
              {t('offers.f.sector')}
            </Text>
            <View style={styles.chips}>
              {CATS.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setSector(c.id)}
                  style={[styles.chip, sector === c.id && styles.chipOn]}
                >
                  <Text variant="caption" tone={sector === c.id ? 'onAccent' : 'inkSoft'}>
                    {t(c.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.row2}>
              <View style={styles.col}>
                <Text variant="caption" tone="inkSoft" style={styles.label}>
                  {t('offers.f.pct')}
                </Text>
                <TextInput
                  value={pct}
                  onChangeText={(v) => setPct(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="5–50"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
              </View>
              <View style={styles.col}>
                <Text variant="caption" tone="inkSoft" style={styles.label}>
                  {t('offers.f.base')}
                </Text>
                <TextInput
                  value={basePrice}
                  onChangeText={(v) => setBasePrice(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="₸"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
              </View>
            </View>
            <Text variant="caption" tone="inkSoft" style={styles.label}>
              {t('offers.f.days')}
            </Text>
            <View style={styles.chips}>
              {DAY_KEYS.map((k, i) => {
                const on = days.includes(i);
                return (
                  <Pressable
                    key={k}
                    onPress={() =>
                      setDays((d) => (on ? d.filter((x) => x !== i) : [...d, i].sort()))
                    }
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text variant="caption" tone={on ? 'onAccent' : 'inkSoft'}>
                      {t(k)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text variant="caption" tone="inkSoft" style={styles.label}>
              {t('offers.f.window')}
            </Text>
            <View style={styles.chips}>
              {WINDOWS.map((w, i) => (
                <Pressable
                  key={i}
                  onPress={() => setWinIdx(i)}
                  style={[styles.chip, winIdx === i && styles.chipOn]}
                >
                  <Text variant="caption" tone={winIdx === i ? 'onAccent' : 'inkSoft'}>
                    {w.label || t('offers.f.all_day')}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text variant="caption" tone="inkSoft" style={styles.label}>
              {t('offers.f.ends')}
            </Text>
            <View style={styles.pickerCard}>
              <DateField
                label={t('offers.f.ends')}
                value={endsAt}
                onChange={setEndsAt}
                mode="date"
                minimumDate={new Date(Date.now() + 24 * 3600 * 1000)}
                maximumDate={new Date(Date.now() + 30 * 24 * 3600 * 1000)}
                last
              />
            </View>
            <Text variant="caption" tone="inkSoft" style={styles.label}>
              {t('offers.f.quota')}
            </Text>
            <TextInput
              value={quota}
              onChangeText={(v) => setQuota(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder={t('offers.f.quota_ph')}
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <Text variant="caption" tone="muted" style={styles.rulesNote}>
              {t('offers.rules_note')}
            </Text>
            <View style={styles.formActions}>
              <Button
                label={t('common.cancel')}
                variant="secondary"
                onPress={() => setCreating(false)}
              />
              <View style={{ width: space(1.5) }} />
              <Button
                label={t('offers.publish')}
                variant={valid && !busy ? 'primary' : 'secondary'}
                disabled={!valid || busy}
                onPress={submit}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(6), gap: space(1.25) },
    lead: { lineHeight: 18 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
      gap: 6,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    cardTitle: { flex: 1 },
    st: { paddingHorizontal: space(1), paddingVertical: 3, borderRadius: radius.pill },
    stOn: { backgroundColor: colors.accent },
    stOff: { backgroundColor: colors.surfaceMuted },
    cardActions: { flexDirection: 'row', gap: space(1), marginTop: 2 },
    actBtn: {
      paddingHorizontal: space(1.5),
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    newBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.accentFg,
      borderRadius: radius.lg,
      paddingVertical: space(1.75),
      marginTop: space(1),
    },
    form: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1),
      marginTop: space(1),
    },
    formTitle: { fontSize: 16 },
    label: { marginTop: space(0.75) },
    input: {
      height: 48,
      paddingHorizontal: space(1.75),
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      fontSize: 15,
      color: colors.ink,
    },
    inputMulti: { height: 76, paddingTop: space(1.25), textAlignVertical: 'top' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(0.75) },
    chip: {
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    chipOn: { backgroundColor: colors.accent },
    row2: { flexDirection: 'row', gap: space(1.5) },
    col: { flex: 1 },
    pickerCard: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: space(1.5),
    },
    rulesNote: { lineHeight: 17, marginTop: space(0.5) },
    formActions: { flexDirection: 'row', marginTop: space(1) },
  });
