import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { api, type PassportAccessRow, type PassportData } from '../api';
import { formatSlotTr } from '../datetime';
import { useLocale } from '../locale';
import { useStore } from '../store';
import { radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * §19 — PASSPORT'un asıl içeriği: alerjiler, tercihler ve ERİŞİM KAYDI.
 *
 * Ekran daha önce bir sadakat kartıydı (tamamlanan randevu, seviye, premium).
 * Kanvasın Passport'u ise "uzmana açtığında ne görünecek" idi.
 *
 * TERCİHLER küçük ayarlar gibi görünür ama kadın kullanıcıların salonda en çok
 * yaşadığı rahatsızlıkların birebir karşılığıdır: söylemesi zor olanı,
 * söylemeden hallediyoruz.
 *
 * ERİŞİM KAYDI spec'in audit zorunluluğunu kullanıcı vaadine çevirir: kaydı
 * yalnız biz değil, kullanıcı da görür — ve istediği an kapatabilir.
 */
// ── SAÇ VE CİLT PROFİLİ (kanvas Passport.dc.html §saç profili) ──
// `traits` alanı PassportData'da ZATEN vardı ve sunucuya kaydediliyordu; hiçbir
// ekran göstermiyordu. Uzmanın "saçın nasıl?" diye sormasına gerek kalmasın diye
// kanvasta bu bölüm vardı.
//
// Seçenekler serbest metin DEĞİL: uzmanın hızlı okuyabilmesi için sabit küme.
const TRAITS: { key: string; label: MessageKey; options: MessageKey[] }[] = [
  {
    key: 'hair_type',
    label: 'passport.trait.hair_type',
    options: [
      'passport.trait.hair_fine',
      'passport.trait.hair_normal',
      'passport.trait.hair_thick',
    ],
  },
  {
    key: 'hair_length',
    label: 'passport.trait.hair_length',
    options: ['passport.trait.len_short', 'passport.trait.len_shoulder', 'passport.trait.len_long'],
  },
  {
    key: 'colored',
    label: 'passport.trait.colored',
    options: ['passport.trait.col_never', 'passport.trait.col_rare', 'passport.trait.col_often'],
  },
  {
    key: 'skin',
    label: 'passport.trait.skin',
    options: ['passport.trait.skin_dry', 'passport.trait.skin_normal', 'passport.trait.skin_oily'],
  },
];

const PREFS: { key: keyof PassportData; label: MessageKey; desc: MessageKey }[] = [
  { key: 'quietVisit', label: 'passport.prefs.quiet', desc: 'passport.prefs.quiet_d' },
  { key: 'noPhotos', label: 'passport.prefs.nophoto', desc: 'passport.prefs.nophoto_d' },
  { key: 'notifyLate', label: 'passport.prefs.late', desc: 'passport.prefs.late_d' },
  { key: 'womenOnly', label: 'passport.prefs.women', desc: 'passport.prefs.women_d' },
];

export function PassportCare() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const token = useStore((s) => s.token);
  const [data, setData] = useState<PassportData | null>(null);
  const [access, setAccess] = useState<PassportAccessRow[]>([]);
  // DİKKAT: bütün hook'lar erken return'ün ÜSTÜNDE olmalı — aşağıya konursa
  // React hook sırası bozulur ve ekran çöker.
  const bookings = useStore((st) => st.bookings);
  const [acilan, setAcilan] = useState<string | null>(null);

  const [hata, setHata] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    setHata(false);
    void api
      .passport(token)
      .then(setData)
      // Hata SESSİZ KALMAZ: veri gelmediğinde bölüm tamamen kayboluyordu ve
      // kullanıcıya "alerji girecek ekran yok" gibi görünüyordu.
      .catch(() => setHata(true));
    void api
      .passportAccess(token)
      .then(setAccess)
      .catch(() => undefined);
  }, [token]);

  useFocusEffect(load);

  if (!token) return null;
  if (!data) {
    return (
      <View style={[styles.group, shadow.soft]}>
        <Text variant="label" tone="muted">
          {t('passport.care.title')}
        </Text>
        <Text variant="caption" tone="muted">
          {hata ? t('passport.care.load_err') : t('common.loading')}
        </Text>
        {hata ? (
          <Pressable onPress={load} style={styles.retry}>
            <Ionicons name="refresh" size={14} color={colors.accent} />
            <Text variant="caption" tone="accentFg">
              {t('common.retry')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  // Aynı seçeneğe tekrar dokunmak seçimi KALDIRIR — yanlış işaretlenen bir
  // özellik kalıcı olmasın (sağlık/alerji bağlamında önemli).
  const setTrait = (key: string, value: string) => {
    const prev = data;
    const yeni = { ...(data?.traits ?? {}) };
    if (yeni[key] === value) delete yeni[key];
    else yeni[key] = value;
    setData((d) => (d ? { ...d, traits: yeni } : d));
    if (token) void api.savePassport(token, { traits: yeni }).catch(() => setData(prev));
  };

  // Yaklaşan randevular — pasaport yalnız BAĞLAMI olan uzmana açılır.
  // Zaten açık olan (süresi geçmemiş, iptal edilmemiş) uzman listede görünmez.
  const acikProIds = new Set(
    access
      .filter((r) => !r.revokedAt && new Date(r.expiresAt).getTime() > Date.now())
      .map((r) => r.proId),
  );
  const paylasilabilir = bookings
    .filter(
      (b) =>
        b.proId &&
        !acikProIds.has(b.proId) &&
        ['confirmed', 'deposit_pending', 'deposit_submitted'].includes(b.status),
    )
    .slice(0, 3);

  const paylas = (b: (typeof bookings)[number]) => {
    if (!token || !b.proId) return;
    setAcilan(b.id);
    void api
      .grantPassport(token, b.proId, b.id)
      .then(load)
      .catch(() => Alert.alert(t('passport.share.title'), t('common.error')))
      .finally(() => setAcilan(null));
  };

  const toggle = (key: keyof PassportData) => (v: boolean) => {
    const prev = data;
    setData({ ...data, [key]: v });
    void api.savePassport(token, { [key]: v }).catch(() => setData(prev));
  };

  const revoke = (row: PassportAccessRow) => {
    Alert.alert(t('passport.access.close'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('passport.access.close'),
        style: 'destructive',
        onPress: () => {
          setAccess((a) => a.map((r) => (r.id === row.id ? { ...r, revokedAt: 'now' } : r)));
          void api.revokePassportAccess(token, row.id).catch(() => undefined);
        },
      },
    ]);
  };

  return (
    <>
      {/* ── Uzmanın bilmesi gerekenler ── */}
      <View style={[styles.group, shadow.soft]}>
        <Text variant="label" tone="muted">
          {t('passport.care.title')}
        </Text>
        <View style={styles.allergyHead}>
          <Ionicons name="alert-circle-outline" size={17} color={colors.gold} />
          <Text variant="title" tone="ink" style={styles.flex}>
            {t('passport.care.allergies')}
          </Text>
        </View>
        {data.allergies.length ? (
          <View style={styles.chips}>
            {data.allergies.map((a) => (
              <View key={a} style={styles.chip}>
                <Text variant="caption" style={{ color: colors.gold }}>
                  {a}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text variant="caption" tone="muted">
            {t('passport.care.allergies_none')}
          </Text>
        )}
        {/* İstisnayı gizlemek yerine gerekçesiyle yazıyoruz */}
        <Text variant="micro" tone="muted">
          {t('passport.care.health_note')}
        </Text>
      </View>

      {/* ── Tercihler ── */}
      <View style={[styles.group, shadow.soft]}>
        <Text variant="label" tone="muted">
          {t('passport.prefs.title')}
        </Text>
        {PREFS.map((p) => (
          <View key={p.key} style={styles.prefRow}>
            <View style={styles.flex}>
              <Text variant="title" tone="ink">
                {t(p.label)}
              </Text>
              <Text variant="caption" tone="muted">
                {t(p.desc)}
              </Text>
            </View>
            <Switch
              value={Boolean(data[p.key])}
              onValueChange={toggle(p.key)}
              trackColor={{ true: colors.accent, false: colors.surfaceMuted }}
            />
          </View>
        ))}
      </View>

      {/* ── Saç ve cilt profili (kanvas §saç profili) ── */}
      <View style={[styles.group, shadow.soft]}>
        <Text variant="label" tone="muted">
          {t('passport.trait.title')}
        </Text>
        {TRAITS.map((tr) => (
          <View key={tr.key} style={styles.traitRow}>
            <Text variant="caption" tone="inkSoft">
              {t(tr.label)}
            </Text>
            <View style={styles.traitOpts}>
              {tr.options.map((o) => {
                const secili = data.traits?.[tr.key] === o;
                return (
                  <Pressable
                    key={o}
                    onPress={() => setTrait(tr.key, o)}
                    style={[styles.traitChip, secili && styles.traitChipOn]}
                  >
                    <Text variant="caption" tone={secili ? 'onAccent' : 'ink'}>
                      {t(o)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        <Text variant="micro" tone="muted">
          {t('passport.trait.note')}
        </Text>
      </View>

      {/* ── Pasaportu uzmana aç (kanvas §paylaş) ──
          `passportGrant` API'si yazılmıştı ama HİÇBİR ekrandan çağrılmıyordu:
          pasaportu paylaşmanın yolu yoktu. Kanvasta bu bölüm var.
          Rastgele uzman seçtirmiyoruz — yalnız YAKLAŞAN randevunun uzmanına
          açılabiliyor; paylaşımın bir bağlamı olmalı. */}
      {paylasilabilir.length > 0 ? (
        <View style={[styles.group, shadow.soft]}>
          <Text variant="label" tone="muted">
            {t('passport.share.title')}
          </Text>
          {paylasilabilir.map((b) => (
            <View key={b.id} style={styles.shareRow}>
              <View style={styles.flex}>
                <Text variant="title" tone="ink" numberOfLines={1}>
                  {b.proName}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {formatSlotTr(b.startMs)} · {b.service}
                </Text>
              </View>
              <Pressable
                style={styles.shareBtn}
                disabled={acilan === b.id}
                onPress={() => paylas(b)}
              >
                <Ionicons name="lock-open-outline" size={14} color={colors.onAccent} />
                <Text variant="caption" tone="onAccent">
                  {t('passport.share.cta')}
                </Text>
              </Pressable>
            </View>
          ))}
          <Text variant="micro" tone="muted">
            {t('passport.share.note')}
          </Text>
        </View>
      ) : null}

      {/* ── Kim ne zaman baktı ── */}
      <View style={[styles.group, shadow.soft]}>
        <Text variant="label" tone="muted">
          {t('passport.access.title')}
        </Text>
        {access.length === 0 ? (
          <Text variant="caption" tone="muted">
            {t('passport.access.empty')}
          </Text>
        ) : (
          access.map((r) => {
            const closed = Boolean(r.revokedAt) || new Date(r.expiresAt).getTime() < Date.now();
            return (
              <View key={r.id} style={styles.accessRow}>
                <View style={styles.flex}>
                  <Text variant="captionStrong" tone="ink" numberOfLines={1}>
                    {r.proId}
                  </Text>
                  <Text variant="micro" tone="muted" numberOfLines={1}>
                    {/* "Açıldı" ile "bakıldı" aynı şey değil — ayrımı gösteriyoruz */}
                    {r.revokedAt
                      ? t('passport.access.revoked')
                      : r.lastViewAt
                        ? `${fmt(r.lastViewAt)} · ${t('passport.access.viewed')}`
                        : closed
                          ? t('passport.access.expired')
                          : t('passport.access.not_viewed')}
                  </Text>
                </View>
                {closed ? null : (
                  <Pressable onPress={() => revoke(r)} hitSlop={8}>
                    <Text variant="caption" style={{ color: colors.danger }}>
                      {t('passport.access.close')}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })
        )}
        <Text variant="micro" tone="muted">
          {t('passport.access.note')}
        </Text>
      </View>
    </>
  );
}

function fmt(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1.25),
      marginTop: space(2),
    },
    flex: { flex: 1 },
    allergyHead: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(0.75) },
    chip: {
      backgroundColor: colors.goldSoft,
      borderRadius: radius.pill,
      paddingHorizontal: space(1.25),
      paddingVertical: space(0.625),
    },
    retry: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
    shareRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    shareBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.accent,
    },
    traitRow: { gap: 6 },
    traitOpts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    traitChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: colors.line,
    },
    traitChipOn: { backgroundColor: colors.accent },
    prefRow: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
    accessRow: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
  });
