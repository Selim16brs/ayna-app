import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { hasConflict } from '@ayna/domain';
import { api } from '../../src/api';
import type { Appointment } from '../../src/data';
import { localWallClockToAlmatyMs } from '../../src/datetime';
import { useStore } from '../../src/store';
import { fillParams, useLocale } from '../../src/locale';
import { activeCategories, servicesOf, tri, type TaxService } from '../../src/taxonomy';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, DateField, Screen, Segmented, StackHeader, Text, TextInput } from '../../src/ui';

type Kind = 'normal' | 'group' | 'express';
let seq = 0;

export default function OfflineBookingScreen() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // §4.6 — ajandada boş slota dokununca gelen başlangıç (UTC ms) + (salon görünümü) uzman adı
  const params = useLocalSearchParams<{ start?: string; uzman?: string }>();
  const startParam = params.start ? Number(params.start) : null;
  // §9 uzman ↔ §10 salon: "Uzman" alanı yalnız salonda (uzman zaten kendisidir)
  const isSalon = useStore((s) => s.currentUser?.role === 'salon');
  // Randevunun sahibi = hesabın kendi adı (uzman → kendi adı; salon → salon adı) — 'Salonum' hardcode yerine
  const myName = useStore((s) => s.currentUser?.name) ?? 'AYNA';

  // §6.1 — uzmanın profilinde kayıtlı hizmetler (Hizmetler ekranından) → accordion seçim
  const sellerServices = useStore((s) => s.sellerServices);
  // Kategori bazında yalnız kayıtlı hizmetleri grupla (boş kategorileri gizle)
  const svcGroups = useMemo(
    () =>
      activeCategories()
        .map((c) => ({ cat: c, items: servicesOf(c.id).filter((s) => sellerServices[s.id]) }))
        .filter((g) => g.items.length > 0),
    [sellerServices],
  );
  const hasServices = svcGroups.length > 0;

  const [customer, setCustomer] = useState('');
  const [service, setService] = useState('');
  // §2.2 — offline randevuda uzman BİRDEN FAZLA hizmet seçebilir (fiyat/süre toplanır)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Kayıtlı hizmet yoksa doğrudan elle giriş; varsa "Elle gir" ile geçilebilir
  const [manual, setManual] = useState(!hasServices);
  const [openCat, setOpenCat] = useState<string | null>(svcGroups[0]?.cat.id ?? null);
  const [uzman, setUzman] = useState(typeof params.uzman === 'string' ? params.uzman : '');
  // Tarih + saat — Benim İçin/Randevu al ile AYNI native model
  const [when, setWhen] = useState<Date>(() => new Date(startParam ?? Date.now() + 3_600_000));
  const [dur, setDur] = useState('60');
  const [price, setPrice] = useState('');
  const [kind, setKind] = useState<Kind>('normal');
  const [groupSize, setGroupSize] = useState('3');
  const [busy, setBusy] = useState(false);
  const bookings = useStore((s) => s.bookings);
  const token = useStore((s) => s.token);

  // Taksonomi id → TaxService (seçili hizmetlerin ad/fiyat/süresini toplamak için)
  const svcById = useMemo(() => {
    const m: Record<string, TaxService> = {};
    for (const g of svcGroups) for (const s of g.items) m[s.id] = s;
    return m;
  }, [svcGroups]);

  // Seçim değişince: ad = birleştirilmiş, fiyat = toplam, süre = toplam (uzman yine düzenleyebilir)
  const applySelection = (ids: string[]) => {
    setSelectedIds(ids);
    const names = ids.map((id) => (svcById[id] ? tri(svcById[id]!.label, locale) : ''));
    setService(names.filter(Boolean).join(' + '));
    const totalPrice = ids.reduce((sum, id) => sum + Number(sellerServices[id]?.price || 0), 0);
    const totalDur = ids.reduce((sum, id) => sum + Number(sellerServices[id]?.dur || 0), 0);
    if (totalPrice) setPrice(String(totalPrice));
    if (totalDur) setDur(String(totalDur));
  };

  // Çoklu seçim: hizmete dokun → ekle/çıkar
  const toggleService = (s: TaxService) =>
    applySelection(
      selectedIds.includes(s.id) ? selectedIds.filter((x) => x !== s.id) : [...selectedIds, s.id],
    );

  const canSave = customer.trim().length > 1 && service.trim().length > 1 && !busy;

  async function save() {
    if (!canSave) return;
    // §4.2 — seçilen duvar-saati ALMATI saatidir (cihaz TR'de olsa bile kayma olmaz)
    const startMs = localWallClockToAlmatyMs(when);
    const durationMin = Number(dur.replace(/[^0-9]/g, '')) || 60;
    // §4.2 — çift rezervasyon önlemi: aynı uzmanın çakışan randevusu varsa engelle
    const candidate = { startMs, endMs: startMs + durationMin * 60_000 };
    const uzmanName = uzman.trim();
    const conflictBusy = bookings
      .filter((b) => b.status !== 'cancelled' && (uzmanName ? b.uzmanName === uzmanName : true))
      .map((b) => ({ startMs: b.startMs, endMs: b.startMs + b.durationMin * 60_000 }));
    if (hasConflict(candidate, conflictBusy)) {
      Alert.alert(t('offline.conflict_title'), t('offline.conflict'));
      return;
    }
    setBusy(true);
    const booking: Appointment = {
      id: `off-${Date.now()}-${seq++}`,
      source: 'direct',
      service: service.trim(),
      proId: '',
      proName: myName,
      proImage: '',
      uzmanName: uzman.trim() || undefined,
      customerName: customer.trim(),
      startMs,
      durationMin,
      price: Number(price.replace(/[^0-9]/g, '')) || 0,
      status: 'confirmed',
      bookingKind: kind,
      ...(kind === 'group' ? { groupSize: Number(groupSize) || 2 } : {}),
    };
    try {
      // POST /bookings JWT korumalı — token'sız çağrı 401 ile düşüyordu
      await api.createBooking(booking, token ?? undefined);
      Alert.alert(t('offline.saved'));
      router.back();
    } catch {
      Alert.alert(t('offline.title'), t('common.error') as string);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={[]}>
      <StackHeader title={t('offline.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Field label={t('offline.customer')}>
          <TextInput
            style={styles.input}
            value={customer}
            onChangeText={setCustomer}
            placeholder="Ayşe K."
            placeholderTextColor={colors.muted}
          />
        </Field>
        {/* §6.1 — hizmet: profildeki kayıtlı hizmetlerden accordion seçimi (veya elle gir) */}
        <View style={styles.field}>
          <View style={styles.svcHead}>
            <Text variant="label" tone="accentFg" style={styles.label}>
              {t('offline.service')}
            </Text>
            {hasServices ? (
              <Pressable onPress={() => setManual((m) => !m)} hitSlop={8}>
                <Text variant="caption" tone="accentFg" style={styles.svcToggle}>
                  {manual ? t('offline.service_pick') : t('offline.service_manual')}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {manual || !hasServices ? (
            <>
              <TextInput
                style={styles.input}
                value={service}
                onChangeText={(v) => {
                  setService(v);
                  setSelectedIds([]);
                }}
                placeholder="Saç kesimi & fön"
                placeholderTextColor={colors.muted}
              />
              {!hasServices ? (
                <Text variant="caption" tone="muted" style={styles.svcNone}>
                  {t('offline.service_none')}
                </Text>
              ) : null}
            </>
          ) : (
            <View style={styles.accordion}>
              {svcGroups.map(({ cat, items }) => {
                const open = openCat === cat.id;
                const picked = items.filter((s) => selectedIds.includes(s.id)).length;
                return (
                  <View key={cat.id} style={styles.accCat}>
                    <Pressable
                      style={styles.accHead}
                      onPress={() => setOpenCat(open ? null : cat.id)}
                    >
                      <Ionicons name={cat.icon} size={17} color={colors.accentFg} />
                      <Text
                        variant="bodyStrong"
                        tone="ink"
                        style={styles.accTitle}
                        numberOfLines={1}
                      >
                        {t(cat.labelKey)}
                      </Text>
                      {picked > 0 ? <View style={styles.accDot} /> : null}
                      <Text variant="caption" tone="muted">
                        {items.length}
                      </Text>
                      <Ionicons
                        name={open ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.muted}
                      />
                    </Pressable>
                    {open ? (
                      <View style={styles.accBody}>
                        {items.map((s) => {
                          const on = selectedIds.includes(s.id);
                          const row = sellerServices[s.id];
                          return (
                            <Pressable
                              key={s.id}
                              style={[styles.accRow, on && styles.accRowOn]}
                              onPress={() => toggleService(s)}
                            >
                              <View style={[styles.check, on && styles.checkOn]}>
                                {on ? (
                                  <Ionicons name="checkmark" size={13} color={colors.onAccent} />
                                ) : null}
                              </View>
                              <Text
                                variant="body"
                                tone="ink"
                                style={styles.accName}
                                numberOfLines={1}
                              >
                                {tri(s.label, locale)}
                              </Text>
                              {row ? (
                                <Text variant="caption" tone="muted">
                                  {row.price} ₸ · {row.dur} {t('pro.min')}
                                </Text>
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
          {/* Çoklu seçim özeti: kaç hizmet + toplam süre/ücret inputlarda görünür */}
          {!manual && selectedIds.length > 0 ? (
            <View style={styles.svcSummary}>
              <Ionicons name="checkmark-circle" size={14} color={colors.accentFg} />
              <Text variant="caption" tone="accentFg">
                {fillParams(t('offline.svc_count'), { n: selectedIds.length })}
              </Text>
            </View>
          ) : null}
        </View>
        {/* §9/§10 — "Uzman" alanı YALNIZ salonda (uzman zaten kendisidir) */}
        {isSalon ? (
          <Field label={t('offline.uzman')}>
            <TextInput
              style={styles.input}
              value={uzman}
              onChangeText={setUzman}
              placeholder="Madina"
              placeholderTextColor={colors.muted}
            />
          </Field>
        ) : null}
        {/* Tarih + saat — native seçici (Benim İçin/Randevu al ile aynı) */}
        <DateField label={t('offline.datetime')} value={when} onChange={setWhen} mode="datetime" />
        <View style={styles.rowFields}>
          <Field label={t('offline.dur')} flex>
            <TextInput
              style={styles.input}
              value={dur}
              onChangeText={(v) => setDur(v.replace(/[^0-9]/g, ''))}
              placeholder="60"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
            />
          </Field>
          <Field label={t('offline.price')} flex>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ''))}
              placeholder="9000"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
            />
          </Field>
        </View>

        {/* Faz 3 — randevu türü */}
        <View style={styles.field}>
          <Text variant="label" tone="accentFg" style={styles.label}>
            {t('offline.kind')}
          </Text>
          <Segmented
            options={[
              { value: 'normal', label: t('offline.kind.normal') },
              { value: 'group', label: t('offline.kind.group') },
              { value: 'express', label: t('offline.kind.express') },
            ]}
            value={kind}
            onChange={setKind}
          />
        </View>
        {kind === 'group' ? (
          <Field label={t('offline.group_size')}>
            <TextInput
              style={styles.input}
              value={groupSize}
              onChangeText={(v) => setGroupSize(v.replace(/[^0-9]/g, ''))}
              placeholder="3"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
            />
          </Field>
        ) : null}

        <View style={styles.note}>
          <Text variant="caption" tone="muted">
            {t('offline.note')}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button label={busy ? '…' : t('offline.save')} onPress={save} disabled={!canSave} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Field({
  label,
  children,
  flex,
}: {
  label: string;
  children: React.ReactNode;
  flex?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.field, flex && styles.fieldFlex]}>
      <Text variant="label" tone="accentFg" style={styles.label}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(2.5),
      // Tab bar yüksekliği kadar pay — yoksa "Randevuyu ekle" butonu bar arkasında
      // kalıyor ve kaydırma limiti butona erişimi engelliyor.
      paddingBottom: space(14),
      gap: space(1.5),
    },
    field: { gap: space(0.75) },
    fieldFlex: { flex: 1 },
    label: {},
    rowFields: { flexDirection: 'row', gap: space(1.5) },
    input: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.5),
      color: colors.ink,
      fontSize: 15,
    },
    note: { paddingHorizontal: space(0.5), marginTop: space(0.5) },
    actions: { marginTop: space(2) },
    svcHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    svcToggle: { fontWeight: '700' },
    svcNone: { marginTop: space(0.75), lineHeight: 17 },
    accordion: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    accCat: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
    accHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.5),
    },
    accTitle: { flex: 1 },
    accDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
    accBody: { backgroundColor: colors.surfaceMuted, paddingVertical: space(0.5) },
    accRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.25),
    },
    accRowOn: { backgroundColor: colors.accentSoft },
    accName: { flex: 1 },
    // Çoklu seçim → kare onay kutusu
    check: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    svcSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      marginTop: space(1),
      paddingHorizontal: space(0.5),
    },
  });
