import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { hasConflict } from '@ayna/domain';
import type { Appointment } from '../../src/data';
import { localWallClockToAlmatyMs } from '../../src/datetime';
import { useStore } from '../../src/store';
import type { SellerServiceRow } from '../../src/store';
import { fillParams, useLocale } from '../../src/locale';
import { activeCategories, servicesOf, tri } from '../../src/taxonomy';
import { type ColorTokens, radius, space, font } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  HizmetIkonu,
  Button,
  DateField,
  Screen,
  Segmented,
  StackHeader,
  Text,
  TextInput,
  TAB_BAR_CLEARANCE,
} from '../../src/ui';

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

  /*
   * §6.1 + brief §4.1 — uzmanın KENDİ hizmet satırları (Hizmetlerim
   * ekranından). Artık alt hizmet başına tek şablon satır değil; uzman
   * "Kök boyası" ve "Tam boya"yı ayrı ayrı fiyatlayabiliyor ve offline
   * randevuda ikisini AYRI seçebilmeli.
   */
  const sellerServices = useStore((s) => s.sellerServices);
  // Kategori bazında yalnız uzmanın kendi yazdığı satırlar (boş kategoriler gizli)
  const svcGroups = useMemo(() => {
    const altHizmetSirasi = new Map<string, number>();
    let i = 0;
    for (const c of activeCategories())
      for (const s of servicesOf(c.id)) altHizmetSirasi.set(s.id, i++);
    return activeCategories()
      .map((c) => {
        const kimlikler = new Set(servicesOf(c.id).map((s) => s.id));
        const items = sellerServices
          .filter((r) => kimlikler.has(r.serviceId))
          // Katalog sırasını koru: uzmanın ekleme sırası rastgele olabilir,
          // ekranda hep aynı düzen görünmeli.
          .sort(
            (a, b) =>
              (altHizmetSirasi.get(a.serviceId) ?? 0) - (altHizmetSirasi.get(b.serviceId) ?? 0),
          );
        return { cat: c, items };
      })
      .filter((g) => g.items.length > 0);
  }, [sellerServices]);
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
  const queueOfflineBooking = useStore((s) => s.queueOfflineBooking);

  // Satır anahtarı → satır (seçili hizmetlerin ad/fiyat/süresini toplamak için)
  const rowByKey = useMemo(() => {
    const m: Record<string, SellerServiceRow> = {};
    for (const g of svcGroups) for (const r of g.items) m[r.key] = r;
    return m;
  }, [svcGroups]);

  // Seçim değişince: ad = birleştirilmiş, fiyat = toplam, süre = toplam (uzman yine düzenleyebilir)
  const applySelection = (keys: string[]) => {
    setSelectedIds(keys);
    // Uzmanın KENDİ adı kullanılıyor, katalog etiketi değil: müşteriye de
    // randevu kartında o ad görünüyor.
    const names = keys.map((k) => rowByKey[k]?.name ?? '');
    setService(names.filter(Boolean).join(' + '));
    const totalPrice = keys.reduce((sum, k) => sum + Number(rowByKey[k]?.price || 0), 0);
    const totalDur = keys.reduce((sum, k) => sum + Number(rowByKey[k]?.dur || 0), 0);
    if (totalPrice) setPrice(String(totalPrice));
    if (totalDur) setDur(String(totalDur));
  };

  // Çoklu seçim: satıra dokun → ekle/çıkar
  const toggleService = (r: SellerServiceRow) =>
    applySelection(
      selectedIds.includes(r.key)
        ? selectedIds.filter((x) => x !== r.key)
        : [...selectedIds, r.key],
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
      .filter((b) => b.status !== 'iptal_musteri' && (uzmanName ? b.uzmanName === uzmanName : true))
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
      status: 'kesinlesti',
      bookingKind: kind,
      ...(kind === 'group' ? { groupSize: Number(groupSize) || 2 } : {}),
    };
    // VERİ KAYBI YASAĞI — önce yerel kalıcı kayıt + eşitleme kuyruğu; sunucu yazımı
    // başarısız olsa bile randevu cihazda durur ve bağlantı gelince otomatik eşitlenir.
    queueOfflineBooking(booking);
    Alert.alert(t('offline.saved'));
    setBusy(false);
    router.back();
  }

  return (
    <Screen edges={[]}>
      <StackHeader title={t('offline.title')} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Field label={t('offline.customer')}>
          <TextInput
            style={styles.input}
            value={customer}
            onChangeText={setCustomer}
            placeholder={t('name.placeholder')}
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
                placeholder={t('name.service_placeholder')}
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
                const picked = items.filter((r) => selectedIds.includes(r.key)).length;
                return (
                  <View key={cat.id} style={styles.accCat}>
                    <Pressable
                      style={styles.accHead}
                      onPress={() => setOpenCat(open ? null : cat.id)}
                    >
                      <HizmetIkonu id={cat.id} tarz="satir" />
                      <Text
                        variant="bodyStrong"
                        tone="ink"
                        style={styles.accTitle}
                        numberOfLines={1}
                      >
                        {tri(cat.ad, locale)}
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
                        {items.map((r) => {
                          const on = selectedIds.includes(r.key);
                          return (
                            <Pressable
                              key={r.key}
                              style={[styles.accRow, on && styles.accRowOn]}
                              onPress={() => toggleService(r)}
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
                                {r.name}
                              </Text>
                              <Text variant="caption" tone="muted">
                                {r.price} ₸ · {r.dur} {t('pro.min')}
                              </Text>
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
          <Button label={t('offline.save')} loading={busy} onPress={save} disabled={!canSave} />
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
      paddingBottom: TAB_BAR_CLEARANCE,
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
    svcToggle: { fontFamily: font.semibold },
    svcNone: { marginTop: space(0.75), lineHeight: 17 },
    accordion: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    /** Kurucunun Figma ikonu — ana sayfayla aynı kaynak. */
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
