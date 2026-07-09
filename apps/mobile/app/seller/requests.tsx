import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { hasConflict } from '@ayna/domain';
import { api } from '../../src/api';
import { CATEGORIES, type DemandRequest, formatPrice } from '../../src/data';
import { almatySlotMs, formatSlotTr } from '../../src/datetime';
import { fillParams, useLocale } from '../../src/locale';
import { sellerTrialInfo, useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text, TextInput } from '../../src/ui';

const catLabel = (id: string): MessageKey =>
  (CATEGORIES.find((c) => c.id === id)?.labelKey ?? 'nav.discover') as MessageKey;

// §9.3 — yaklaşık mesafe (deterministik, talep id'sinden 1–9 km). Gerçek adres kullanılmaz (privacy).
const estKm = (id: string): number => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return 1 + (Math.abs(h) % 9);
};

export default function SellerRequestsScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bookings = useStore((s) => s.bookings);
  const hours = useStore((s) => s.sellerHours);
  const submitOffer = useStore((s) => s.submitOffer);
  const token = useStore((s) => s.token);
  // §5.2 Faz A — açık talepler BULUTTAN (sunucu şehir filtresini uygular §9.3).
  // Uzmanın kendi teklifi 'myQuoteId' ile işaretli gelir.
  const [pool, setPool] = useState<(DemandRequest & { myQuoteId: string | null })[]>([]);
  const refreshPool = useCallback(async () => {
    if (!token) return;
    try {
      setPool(await api.openQuoteRequests(token));
    } catch {
      // çevrimdışı: eldeki liste korunur
    }
  }, [token]);
  useFocusEffect(
    useCallback(() => {
      void refreshPool();
      const timer = setInterval(() => void refreshPool(), 20_000);
      return () => clearInterval(timer);
    }, [refreshPool]),
  );
  // §11 — açık taleplere YANIT VERMEK premium'a özel; premium olmayan görür ama teklif veremez.
  const premium = useStore((s) => s.premium);
  // §11 — kayıttan itibaren 3 gün ÜCRETSİZ deneme: bu sürede premium gibi tam erişim.
  const trialStart = useStore((s) => s.sellerTrialStart);
  const trial = sellerTrialInfo(trialStart);
  // Tam erişim = premium/platinum VEYA deneme süresi devam ediyor.
  const canAccess = premium || trial.active;
  // §4.4 — kısıtlı mod: ceza doğunca uzman yeni talep göremez/teklif veremez.
  const restricted = useStore((s) => s.currentUser?.restricted ?? false);
  const router = useRouter();
  const upsell = () =>
    Alert.alert(t('requests.premium_title'), t('requests.premium_body'), [
      { text: t('promo.later'), style: 'cancel' },
      { text: t('promo.upsell_cta'), onPress: () => router.push('/seller/premium') },
    ]);

  const open = useMemo(
    () => pool.filter((d) => d.status === 'collecting').sort((a, b) => a.expiresAt - b.expiresAt),
    [pool],
  );

  const [form, setForm] = useState<{ id: string } | null>(null);
  const [price, setPrice] = useState('');
  const [eta, setEta] = useState('60');
  const [note, setNote] = useState('');
  // §4.1.2 — uzman KENDİ boş saatlerinden 2-3 slot seçer (elle saat yazmaz)
  const [picked, setPicked] = useState<number[]>([]);
  // Talep fotoğrafını tam ekran görüntüle (karttan ve teklif formundan)
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  // Aday slotlar: önümüzdeki 3 gün × birkaç saat; mevcut randevularla çakışanlar elenir (süre = eta)
  const candidates = useMemo(() => {
    if (!form) return [];
    const now = Date.now();
    const dur = (Number(eta) || 60) * 60_000;
    const busy = bookings
      .filter((b) => b.status !== 'cancelled' && b.status !== 'no_show')
      .map((b) => ({ startMs: b.startMs, endMs: b.startMs + b.durationMin * 60_000 }));
    // §9.5 — slot ızgarası uzmanın ÇALIŞMA SAATLERİNDEN (kapalı gün atlanır; saat yoksa 10-19 varsayılan)
    const grid: number[] = [];
    for (let d = 1; d <= 3; d++) {
      const wd = new Date(now + d * 86_400_000).getDay();
      const day = hours.find((x) => x.wd === wd);
      if (day && !day.open) continue;
      const fromH = day ? Number(day.from.split(':')[0]) : 10;
      const toH = day ? Number(day.to.split(':')[0]) : 19;
      const mid = Math.floor((fromH + toH) / 2);
      for (const h of [...new Set([fromH + 1, mid, toH - 1])])
        if (h > fromH - 1 && h <= toH) grid.push(almatySlotMs(now, d, h, 0));
    }
    return grid
      .filter((ms) => ms > now && !hasConflict({ startMs: ms, endMs: ms + dur }, busy))
      .slice(0, 6);
  }, [form, eta, bookings]);

  const toggleSlot = (ms: number) =>
    setPicked((p) => (p.includes(ms) ? p.filter((x) => x !== ms) : p.length >= 3 ? p : [...p, ms]));

  function openForm(id: string) {
    setPrice('');
    setEta('60');
    setNote('');
    setPicked([]);
    setForm({ id });
  }

  async function send() {
    if (!form) return;
    if (!canAccess) {
      setForm(null);
      upsell();
      return;
    }
    // §5.2 Faz A — teklif BULUTA gider; talep sahibine gerçek push düşer.
    const ok = await submitOffer(form.id, {
      price: Number(price) || 0,
      etaMin: Number(eta) || 60,
      ...(note.trim() ? { note: note.trim() } : {}),
      slots: [...picked].sort((a, b) => a - b),
    });
    setForm(null);
    if (ok) void refreshPool();
    else Alert.alert(t('common.error'), t('offer.form.send_err'));
  }

  const canSend = Number(price) > 0 && Number(eta) > 0 && picked.length > 0;

  return (
    <Screen edges={[]}>
      <StackHeader title={t('seller.requests.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* §4.4 — kısıtlı mod: talep listesi gizlenir, yükümlülük çözümü yönlendirilir */}
        {restricted ? (
          <View style={styles.restrictBox}>
            <View style={styles.restrictHead}>
              <Ionicons name="alert-circle" size={20} color={colors.danger} />
              <Text variant="bodyStrong" tone="ink" style={styles.flex}>
                {t('restricted.title')}
              </Text>
            </View>
            <Text variant="caption" tone="inkSoft" style={styles.restrictBody}>
              {t('restricted.locked_offer')}
            </Text>
            <Button
              label={t('restricted.cta')}
              variant="primary"
              onPress={() => router.push('/seller/commissions')}
            />
          </View>
        ) : (
          <>
            {/* §11 — ücretsiz deneme sürüyor: davetkâr bilgi şeridi (kilit değil) */}
            {trial.active && !premium ? (
              <View style={[styles.premiumBanner, styles.trialBanner]}>
                <View style={styles.premiumIcon}>
                  <Ionicons name="gift" size={16} color={colors.accentFg} />
                </View>
                <View style={styles.flex}>
                  <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                    {t('requests.trial_title')}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={2}>
                    {fillParams(t('requests.trial_banner'), { n: trial.daysLeft })}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* §11 — deneme bitti + premium değil: görebildiği tek şey kilit; teklif veremez, detay göremez */}
            {!canAccess ? (
              <Pressable style={styles.premiumBanner} onPress={upsell}>
                <View style={styles.premiumIcon}>
                  <Ionicons name="sparkles" size={16} color={colors.accentFg} />
                </View>
                <View style={styles.flex}>
                  <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                    {t('requests.premium_title')}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={2}>
                    {t('requests.premium_banner')}
                  </Text>
                </View>
                <View style={styles.premiumCta}>
                  <Text variant="caption" tone="accentFg" style={styles.premiumCtaText}>
                    {t('promo.upsell_cta')}
                  </Text>
                </View>
              </Pressable>
            ) : null}

            {open.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="pricetags-outline" size={30} color={colors.muted} />
                <Text variant="caption" tone="muted">
                  {t('seller.requests.empty')}
                </Text>
              </View>
            ) : (
              open.map((d) => (
                <RequestCard
                  key={d.id}
                  demand={d}
                  locked={!canAccess}
                  offered={!!d.myQuoteId}
                  onViewPhoto={setViewPhoto}
                  onGive={() => (canAccess ? openForm(d.id) : upsell())}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={form !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setForm(null)}
      >
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.sheet}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScroll}
            >
              <Pressable onPress={Keyboard.dismiss}>
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
                {/* Kullanıcının istediği saatler: müsaitse TEK DOKUNUŞLA okey; doluysa ⛔ uyarı (§4.1) */}
                {(() => {
                  const d = form ? pool.find((x) => x.id === form.id) : null;
                  const prefs = d?.preferredSlots ?? [];
                  if (prefs.length === 0) return null;
                  const dur = (Number(eta) || 60) * 60_000;
                  const busySet = bookings
                    .filter((b) => b.status !== 'cancelled' && b.status !== 'no_show')
                    .map((b) => ({
                      startMs: b.startMs,
                      endMs: b.startMs + b.durationMin * 60_000,
                    }));
                  return (
                    <>
                      <Text variant="caption" tone="inkSoft" style={styles.label}>
                        {t('offer.form.pref')}
                      </Text>
                      <View style={styles.slotGrid}>
                        {prefs.map((ms) => {
                          const busy = hasConflict({ startMs: ms, endMs: ms + dur }, busySet);
                          const on = picked.includes(ms);
                          return (
                            <Pressable
                              key={ms}
                              style={[
                                styles.slotChip,
                                on && styles.slotChipOn,
                                busy && { opacity: 0.45 },
                              ]}
                              onPress={() => {
                                if (busy) {
                                  Alert.alert(
                                    t('offer.form.pref_busy_t'),
                                    t('offer.form.pref_busy'),
                                  );
                                  return;
                                }
                                toggleSlot(ms);
                              }}
                            >
                              {busy ? (
                                <Ionicons name="close-circle" size={13} color={colors.danger} />
                              ) : on ? (
                                <Ionicons name="checkmark" size={13} color={colors.onAccent} />
                              ) : null}
                              <Text
                                variant="caption"
                                tone={on ? 'onAccent' : 'ink'}
                                style={styles.slotChipText}
                              >
                                {formatSlotTr(ms)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </>
                  );
                })()}
                <Text variant="caption" tone="inkSoft" style={styles.label}>
                  {t('offer.form.slots')}
                </Text>
                <View style={styles.slotHint}>
                  <Ionicons name="time-outline" size={14} color={colors.muted} />
                  <Text variant="caption" tone="muted" style={styles.flex}>
                    {t('offer.form.slots_note')}
                  </Text>
                </View>
                {candidates.length === 0 ? (
                  <Text variant="caption" tone="muted" style={styles.noSlots}>
                    {t('offer.form.no_slots')}
                  </Text>
                ) : (
                  <View style={styles.slotGrid}>
                    {candidates.map((ms) => {
                      const on = picked.includes(ms);
                      return (
                        <Pressable
                          key={ms}
                          style={[styles.slotChip, on && styles.slotChipOn]}
                          onPress={() => toggleSlot(ms)}
                        >
                          {on ? (
                            <Ionicons name="checkmark" size={13} color={colors.onAccent} />
                          ) : null}
                          <Text
                            variant="caption"
                            tone={on ? 'onAccent' : 'ink'}
                            style={styles.slotChipText}
                          >
                            {formatSlotTr(ms)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                <Button
                  label={t('offer.form.send')}
                  variant={canSend ? 'primary' : 'secondary'}
                  disabled={!canSend}
                  onPress={send}
                />
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Tam ekran fotoğraf görüntüleyici */}
      <Modal
        visible={!!viewPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setViewPhoto(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' }}
          onPress={() => setViewPhoto(null)}
        >
          {viewPhoto ? (
            <Image
              source={{ uri: viewPhoto }}
              style={{ width: '100%', height: '80%' }}
              resizeMode="contain"
            />
          ) : null}
          <View style={{ position: 'absolute', top: 60, right: 24 }}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function RequestCard({
  demand,
  onGive,
  locked,
  offered,
  onViewPhoto,
}: {
  demand: DemandRequest;
  onGive: () => void;
  locked?: boolean;
  offered?: boolean; // §5.2 Faz A — bu talebe teklifim var (buton "güncelle" olur)
  onViewPhoto?: (uri: string) => void;
}) {
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
            color={colors.accentFg}
          />
        </View>
        <Text variant="bodyStrong" tone="ink" style={styles.flex}>
          {t(catLabel(demand.category))}
        </Text>
        <View style={[styles.countdown, urgent && styles.countdownUrgent]}>
          <Ionicons name="alarm-outline" size={12} color={urgent ? colors.onColor : colors.gold} />
          <Text
            variant="caption"
            style={{ color: urgent ? colors.onColor : colors.gold, fontWeight: '700' }}
          >
            {t('seller.requests.last')} {remainMin} {t('quotes.remain')}
          </Text>
        </View>
      </View>

      {locked ? (
        /* §11 — deneme bitti + premium değil: DETAYLAR gizli (not/mesafe/bütçe/teklif sayısı).
           Yalnızca kategori + geri sayım görünür; içerik için üyelik yükseltme daveti. */
        <View style={styles.lockedBox}>
          <Ionicons name="sparkles" size={15} color={colors.accentFg} />
          <Text variant="caption" tone="inkSoft" style={styles.flex}>
            {t('requests.locked_hint')}
          </Text>
        </View>
      ) : (
        <>
          {/* Kullanıcının yüklediği referans fotoğrafı — teklif verirken görülür (§5.2) */}
          {demand.photoUrl ? (
            <Pressable onPress={() => onViewPhoto?.(demand.photoUrl!)}>
              <Image source={{ uri: demand.photoUrl }} style={styles.reqPhoto} resizeMode="cover" />
            </Pressable>
          ) : null}
          {demand.note ? (
            <Text variant="caption" tone="inkSoft" style={styles.note} numberOfLines={2}>
              {demand.note}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            {/* §9.3 — mesafe/şehir (privacy: kullanıcı adresi ASLA gösterilmez, yalnızca yaklaşık) */}
            <View style={styles.metaChip}>
              <Ionicons name="location-outline" size={12} color={colors.inkSoft} />
              <Text variant="caption" tone="inkSoft">
                {demand.city} · ~{estKm(demand.id)} km
              </Text>
            </View>
            {demand.budget ? (
              <View style={styles.metaChip}>
                <Ionicons name="wallet-outline" size={12} color={colors.inkSoft} />
                <Text variant="caption" tone="inkSoft">
                  {t('seller.requests.budget')}: {formatPrice(demand.budget)}
                </Text>
              </View>
            ) : null}
            {/* §7.3 — yalnız POZİTİF rozet (yüksek tamamlanma); negatif sinyal asla gösterilmez */}
            {demand.trusted ? (
              <View style={[styles.metaChip, styles.trustChip]}>
                <Ionicons name="shield-checkmark" size={12} color={colors.success} />
                <Text variant="caption" style={styles.trustText}>
                  {t('trust.reliable')}
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
        </>
      )}

      <Button
        label={
          locked
            ? t('requests.give_premium')
            : offered
              ? t('seller.requests.offered')
              : t('seller.requests.give')
        }
        variant={locked || offered ? 'secondary' : 'primary'}
        onPress={onGive}
      />
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), paddingBottom: space(6), gap: space(1.5) },
    // §4.4 kısıtlı mod kutusu
    restrictBox: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.danger,
      padding: space(2),
      gap: space(1.25),
      marginTop: space(2),
    },
    restrictHead: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
    restrictBody: { lineHeight: 18 },
    // §11 premium gate banner
    premiumBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      backgroundColor: colors.accentSoft,
      borderRadius: radius.lg,
      padding: space(1.5),
    },
    // §11 — ücretsiz deneme şeridi (davetkâr, kilit değil)
    trialBanner: { backgroundColor: colors.successSoft },
    // §11 — kilitli kartta detay yerine gösterilen davet kutusu
    lockedBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      backgroundColor: colors.accentSoft,
      borderRadius: radius.md,
      paddingHorizontal: space(1.25),
      paddingVertical: space(1),
    },
    premiumIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    premiumCta: {
      backgroundColor: colors.surface,
      paddingHorizontal: space(1.25),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
    },
    premiumCtaText: { fontWeight: '800' },
    empty: { alignItems: 'center', paddingTop: space(8), gap: space(1) },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1.25),
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    catIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.accentSoft,
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
    reqPhoto: {
      width: '100%',
      height: 160,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
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
    trustChip: { backgroundColor: colors.successSoft },
    trustText: { color: colors.success, fontWeight: '700' },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheetScroll: { paddingBottom: space(1) },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: space(3),
      paddingTop: space(2.5),
      paddingBottom: space(3),
      gap: space(0.5),
      maxHeight: '88%',
    },
    sheetHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: space(1),
    },
    sheetTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
    close: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { marginTop: space(1.5), marginBottom: space(0.75) },
    input: {
      height: 52,
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      fontSize: 16,
      color: colors.ink,
    },
    slotHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      marginTop: space(0.5),
      marginBottom: space(1.25),
    },
    noSlots: { lineHeight: 17, marginBottom: space(2) },
    slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1), marginBottom: space(2) },
    slotChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      borderWidth: 1.25,
      borderColor: colors.line,
      backgroundColor: colors.surface,
    },
    slotChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    slotChipText: { fontWeight: '600' },
  });
