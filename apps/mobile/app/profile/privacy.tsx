import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, SectionHeader, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

type ToggleKey = 'location' | 'anon' | 'personalized' | 'analytics' | 'marketing';

const TOGGLES: {
  key: ToggleKey;
  label: MessageKey;
  sub?: MessageKey;
  icon: keyof typeof Ionicons.glyphMap;
  default: boolean;
}[] = [
  {
    key: 'location',
    label: 'privacy.location',
    sub: 'privacy.location_sub',
    icon: 'location-outline',
    default: false,
  },
  {
    key: 'anon',
    label: 'privacy.anon_reviews',
    sub: 'privacy.anon_reviews_sub',
    icon: 'eye-off-outline',
    default: true,
  },
  { key: 'personalized', label: 'privacy.personalized', icon: 'sparkles-outline', default: true },
  { key: 'analytics', label: 'privacy.analytics', icon: 'analytics-outline', default: true },
  { key: 'marketing', label: 'privacy.marketing', icon: 'megaphone-outline', default: false },
];

export default function PrivacyScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // "anon" (yorum gizliliği) gerçek store değeridir; diğerleri yerel
  const reviewAnonymous = useStore((s) => s.reviewAnonymous);
  const setReviewAnonymous = useStore((s) => s.setReviewAnonymous);

  const [state, setState] = useState<Record<ToggleKey, boolean>>({
    location: false,
    anon: true,
    personalized: true,
    analytics: true,
    marketing: false,
  });

  const value = (k: ToggleKey) => (k === 'anon' ? reviewAnonymous : state[k]);
  const set = (k: ToggleKey) => (v: boolean) => {
    if (k === 'anon') setReviewAnonymous(v);
    else setState((s) => ({ ...s, [k]: v }));
  };

  const onDownload = () => Alert.alert(t('common.soon'));
  // Hesap silme için sunucu tarafı henüz YOK. "Sil" deyip hiçbir şey yapmamak,
  // kullanıcıya hesabını sildiğini sandırır — en kötü yalan. Durumu açıkça söylüyoruz.
  const onDelete = () => Alert.alert(t('privacy.delete'), t('privacy.delete_note'));

  return (
    <Screen edges={['bottom']}>
      <StackHeader title={t('privacy.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* VAAT KARTI — gizlilik ekranı hukuk metni gibi değil, gündelik dille açılır */}
        <View style={styles.promise}>
          <Ionicons name="shield-checkmark-outline" size={26} color={colors.rose} />
          <Text variant="h2" style={styles.promiseTitle}>
            {t('privacy.promise.title')}
          </Text>
          <Text variant="caption" style={styles.promiseBody}>
            {t('privacy.promise.body')}
          </Text>
        </View>

        <Text variant="body" tone="inkSoft" style={styles.subtitle}>
          {t('privacy.subtitle')}
        </Text>

        <View style={[styles.group, shadow.soft]}>
          {TOGGLES.map((tg, i) => (
            <View key={tg.key} style={[styles.row, i < TOGGLES.length - 1 && styles.rowBorder]}>
              <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name={tg.icon} size={18} color={colors.ink} />
              </View>
              <View style={styles.rowLabel}>
                <Text variant="bodyStrong" tone="ink">
                  {t(tg.label)}
                </Text>
                {tg.sub && (
                  <Text variant="caption" tone="muted">
                    {t(tg.sub)}
                  </Text>
                )}
              </View>
              <Switch
                value={value(tg.key)}
                onValueChange={set(tg.key)}
                trackColor={{ true: colors.accent, false: colors.surfaceMuted }}
              />
            </View>
          ))}
        </View>

        {/* KONUM — kanvas (design/Gizlilik.dc.html §konum) bölümü ekranda yoktu.
            Üç madde de kodda doğrulandı, doğrulayamadığımı yazmıyorum:
            1) booking/[id].tsx: showContact = status === 'confirmed' — adres
               ancak randevu ONAYLANDIKTAN sonra açılıyor.
            2) Aramada müşterinin GPS'i hiç kullanılmıyor: mesafe cihazda,
               ŞEHİR MERKEZİNDEN hesaplanıyor (search.tsx cityCenter).
               Kanvas "semt gösteriyoruz" diyor; gerçek durum daha korumalı,
               o yüzden gerçeği yazıyorum.
            3) packages/analytics: lat/lng/coordinates/location YASAKLI alan —
               varsa capture FIRLATIR, sessizce göndermez. */}
        <SectionHeader title={t('privacy.loc.title')} />
        <View style={[styles.group, styles.list, shadow.soft]}>
          {(['privacy.loc.1', 'privacy.loc.2', 'privacy.loc.3'] as const).map((k) => (
            <View key={k} style={styles.listRow}>
              <Ionicons name="checkmark-circle" size={17} color={colors.success} />
              <Text variant="caption" tone="inkSoft" style={styles.listText}>
                {t(k)}
              </Text>
            </View>
          ))}
        </View>

        {/* ANONİM YORUM — vaat değil MEKANİZMA. Buradaki üç madde kodda doğrulandı:
            yorumda kullanıcı kimliği tutulmuyor, uzman tarihi görmüyor, silme uç
            noktası yok (yalnız tek yanıt hakkı). Doğrulayamadığımı yazmıyorum. */}
        <SectionHeader title={t('privacy.anon.title')} />
        <View style={[styles.group, styles.list, shadow.soft]}>
          {(['privacy.anon.1', 'privacy.anon.2', 'privacy.anon.3'] as const).map((k) => (
            <View key={k} style={styles.listRow}>
              <Ionicons name="checkmark-circle" size={17} color={colors.success} />
              <Text variant="caption" tone="inkSoft" style={styles.listText}>
                {t(k)}
              </Text>
            </View>
          ))}
        </View>

        {/* Verilerim */}
        <SectionHeader title={t('privacy.section.data')} />
        <View style={[styles.group, shadow.soft]}>
          <Pressable onPress={onDownload} style={[styles.row, styles.rowBorder]}>
            <View style={[styles.icon, { backgroundColor: colors.surfaceMuted }]}>
              <Ionicons name="download-outline" size={18} color={colors.inkSoft} />
            </View>
            <Text variant="bodyStrong" tone="ink" style={styles.actionLabel}>
              {t('privacy.download')}
            </Text>
            {/* Dokunmadan önce görünsün: sunucu tarafı henüz yok. */}
            <View style={styles.soon}>
              <Text variant="micro" tone="muted">
                {t('privacy.not_ready')}
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={onDelete} style={styles.row}>
            <View style={[styles.icon, { backgroundColor: colors.dangerSoft }]}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </View>
            <Text variant="bodyStrong" tone="accentFg" style={styles.actionLabel}>
              {t('privacy.delete')}
            </Text>
            <View style={styles.soon}>
              <Text variant="micro" tone="muted">
                {t('privacy.not_ready')}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* İŞ MODELİ — gizlilik ekranında gelir modelini yazmak alışılmadık;
            güveni kuran da tam olarak bu. */}
        <View style={styles.model}>
          <View style={styles.modelHead}>
            <Ionicons name="shield-checkmark-outline" size={17} color={colors.success} />
            <Text variant="title" tone="ink">
              {t('privacy.model.title')}
            </Text>
          </View>
          <Text variant="caption" tone="inkSoft">
            {t('privacy.model.body')}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(1),
      paddingBottom: TAB_BAR_CLEARANCE,
    },
    subtitle: { marginBottom: space(2.5) },
    promise: {
      backgroundColor: colors.ink,
      borderRadius: radius.xl,
      padding: space(2.5),
      gap: space(1.25),
      marginBottom: space(2.5),
    },
    promiseTitle: { color: colors.bg },
    promiseBody: { color: colors.muted },
    list: { paddingVertical: space(1.5), gap: space(1.5) },
    listRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space(1.25),
      paddingHorizontal: space(2),
    },
    listText: { flex: 1 },
    model: {
      marginTop: space(3),
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.lineStrong,
      padding: space(2),
      gap: space(1),
    },
    modelHead: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    soon: {
      paddingHorizontal: space(1),
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(2),
      paddingVertical: space(1.75),
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.surfaceMuted,
    },
    icon: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: { flex: 1, gap: 2 },
    actionLabel: { flex: 1 },
  });
