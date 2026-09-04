import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { api, type ReengageAday } from '../../src/api';
import { reengageMessage } from '../../src/data';
import { fillParams, useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { findServiceWithCategory, tri } from '../../src/taxonomy';
import { type ColorTokens, radius, space, font } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

// §10/§4/§11 — GERİ ÇAĞIRMA yönetimi: PREMIUM özellik, sistem OTOMATİK gönderir; uzman aç/kapat eder.

export default function ReengageScreen() {
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  const premium = useStore((s) => s.premium);
  const expertName = useStore((s) => s.currentUser?.name) ?? 'Uzman';
  const autoEnabled = useStore((s) => s.autoReengageEnabled);
  const setAutoReengage = useStore((s) => s.setAutoReengage);
  const token = useStore((st) => st.token);
  const [upcoming, setUpcoming] = useState<ReengageAday[] | null>(null);
  useEffect(() => {
    if (!token) return;
    void api
      .reengageUpcoming(token)
      .then(setUpcoming)
      .catch(() => setUpcoming([]));
  }, [token]);
  const runAutoReengage = useStore((s) => s.runAutoReengage);

  // §11 — ekran açılınca sistem otomatik gönderimi tetikler (premium + açık ise)
  useEffect(() => {
    if (premium && autoEnabled) runAutoReengage(locale);
  }, [premium, autoEnabled, locale, runAutoReengage]);

  // ── PREMIUM DEĞİL → upsell ──
  if (!premium) {
    return (
      <Screen edges={[]}>
        <StackHeader title={t('reengage.title')} />
        <View style={styles.upsellWrap}>
          <View style={styles.upsellIcon}>
            <Ionicons name="heart" size={30} color={colors.accentFg} />
          </View>
          <Text variant="h2" tone="ink" style={styles.upsellTitle}>
            {t('reengage.premium_title')}
          </Text>
          <Text variant="body" tone="muted" style={styles.upsellBody}>
            {t('reengage.premium_body')}
          </Text>
          <View style={styles.upsellCta}>
            <Button
              label={t('reengage.premium_cta')}
              variant="primary"
              onPress={() => router.push('/membership')}
            />
          </View>
        </View>
      </Screen>
    );
  }

  // ── PREMIUM → toggle + otomatik durum listesi ──
  // §11 — bildirim yalnız periyot bitişine 1 gün kala ('pre') ve bitiş günü ('due') gider.
  // GERÇEK müşteriler — sunucudan. Bu liste eskiden `SELLER_PAST_CLIENTS`
  // yani SEED verisiyle çiziliyordu: uzman kendi müşterileri sanarak uydurma
  // isimlere bakıyordu ve "gönderildi" işaretleri de yerel bir diziden
  // geliyordu. Gönderim artık sunucu zamanlayıcısında; ekran onunla AYNI
  // hesabı kullanan uçtan besleniyor ki gösterilen ile gönderilen ayrışmasın.
  const rows = (upcoming ?? []).map((c) => {
    const found = findServiceWithCategory(c.service);
    const label = found ? tri(found.service.label, locale) : c.service;
    const preview = fillParams(
      t(reengageMessage(c.service, c.kalanGun <= 0 ? 'due' : 'pre').bodyKey),
      {
        expert: expertName,
        service: label,
      },
    );
    return {
      c: { id: c.bookingId, name: c.customerName, image: '' },
      label,
      period: c.periodDays,
      daysUntil: c.kalanGun,
      daysSince: c.periodDays - c.kalanGun,
      /*
       * GÖNDERİLDİ Mİ — TAHMİN DEĞİL, KAYIT.
       *
       * Burada "pencere geçmişse gitmiştir" varsayılıyordu ve uzmana
       * yeşil "Gönderildi" rozeti basılıyordu. Zamanlayıcı çalışmamış,
       * müşterinin bildirimi kapalı ya da gönderim hata almış olabilir:
       * uzman gitmemiş bir mesajı gitmiş sanıyordu. Sunucu artık gerçek
       * gönderim kaydını dönüyor.
       */
      preSent: c.preSent === true,
      dueSent: c.dueSent === true,
      sent: c.preSent === true || c.dueSent === true,
      preview,
    };
  });

  const done = rows.filter((r) => r.sent);
  const queue = rows.filter((r) => !r.sent);

  const renderCard = (r: (typeof rows)[number]) => (
    <View key={r.c.id} style={[styles.card, styles.shadowSoft]}>
      <View style={styles.head}>
        {r.c.image ? <Image source={{ uri: r.c.image }} style={styles.avatar} /> : null}
        <View style={styles.flex}>
          <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
            {r.c.name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {r.label}
          </Text>
        </View>
        {r.sent ? (
          <View style={[styles.chip, { backgroundColor: colors.surfaceMuted }]}>
            <Ionicons name="checkmark-circle" size={12} color={colors.success} />
            <Text variant="caption" style={[styles.chipText, { color: colors.success }]}>
              {t(r.dueSent ? 'reengage.status_sent_due' : 'reengage.status_sent_pre')}
            </Text>
          </View>
        ) : (
          <View style={[styles.chip, { backgroundColor: colors.surfaceMuted }]}>
            <Ionicons name="hourglass-outline" size={11} color={colors.muted} />
            <Text variant="caption" tone="muted" style={styles.chipText}>
              {fillParams(t('reengage.status_upcoming'), { n: Math.max(r.daysUntil, 0) })}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.meta}>
        <Ionicons name="time-outline" size={12} color={colors.muted} />
        <Text variant="caption" tone="muted">
          {fillParams(t('reengage.meta'), { last: r.daysSince, period: r.period })}
        </Text>
      </View>

      {/* Gönderilen/gönderilecek sıcak mesaj önizlemesi */}
      <View style={styles.preview}>
        <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.accentFg} />
        <Text variant="caption" tone="inkSoft" style={styles.flex}>
          {r.preview}
        </Text>
      </View>
    </View>
  );

  return (
    <Screen edges={[]}>
      <StackHeader title={t('reengage.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Toggle kartı */}
        <View style={[styles.toggleCard, styles.shadowSoft]}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleIcon}>
              <Ionicons name="sparkles" size={18} color={colors.accentFg} />
            </View>
            <View style={styles.flex}>
              <Text variant="bodyStrong" tone="ink">
                {t('reengage.auto_title')}
              </Text>
              <Text variant="caption" tone="muted">
                {t('reengage.auto_desc')}
              </Text>
            </View>
            <Switch
              value={autoEnabled}
              onValueChange={(v) => {
                setAutoReengage(v);
                if (v) runAutoReengage(locale);
              }}
              trackColor={{ true: colors.accent, false: colors.line }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {!autoEnabled ? (
          <View style={styles.offNote}>
            <Ionicons name="pause-circle-outline" size={15} color={colors.muted} />
            <Text variant="caption" tone="muted" style={styles.flex}>
              {t('reengage.off_note')}
            </Text>
          </View>
        ) : (
          <View style={styles.info}>
            <Ionicons name="lock-closed" size={13} color={colors.muted} />
            <Text variant="caption" tone="muted" style={styles.flex}>
              {t('reengage.info')}
            </Text>
          </View>
        )}

        {done.length > 0 ? (
          <>
            <Text variant="label" tone="accentFg" style={styles.section}>
              {t('reengage.section_done')}
            </Text>
            {done.map(renderCard)}
          </>
        ) : null}

        {queue.length > 0 ? (
          <>
            <Text variant="label" tone="accentFg" style={styles.section}>
              {t('reengage.section_queue')}
            </Text>
            {queue.map(renderCard)}
          </>
        ) : null}

        {rows.length === 0 ? (
          <View style={[styles.card, styles.shadowSoft]}>
            <Text variant="caption" tone="muted">
              {t('reengage.empty')}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: TAB_BAR_CLEARANCE + space(2),
      gap: space(1.25),
    },
    flex: { flex: 1 },
    shadowSoft: {
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    // upsell
    upsellWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space(4),
      gap: space(1.5),
    },
    upsellIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    upsellTitle: { textAlign: 'center' },
    upsellBody: { textAlign: 'center', lineHeight: 22 },
    upsellCta: { alignSelf: 'stretch', marginTop: space(1) },
    // toggle
    toggleCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(1.75) },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space(1.25) },
    toggleIcon: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: space(1.5),
    },
    offNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: space(1.5),
    },
    section: { marginTop: space(1.5), marginBottom: space(0.25) },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
      gap: space(1.25),
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: space(1.25) },
    avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surfaceMuted },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    chipText: { fontFamily: font.semibold, fontSize: 11 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
    preview: {
      flexDirection: 'row',
      gap: space(1),
      backgroundColor: colors.accentSoft,
      borderRadius: radius.md,
      padding: space(1.5),
    },
  });
