import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { api, type PassportAccessRow, type PassportData } from '../api';
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

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      let alive = true;
      void api
        .passport(token)
        .then((d) => alive && setData(d))
        .catch(() => undefined);
      void api
        .passportAccess(token)
        .then((a) => alive && setAccess(a))
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    }, [token]),
  );

  if (!token || !data) return null;

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
    prefRow: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
    accessRow: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
  });
