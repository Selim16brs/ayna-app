import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/api';
import { CATEGORIES, formatPrice } from '../../src/data';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, Text } from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

const makeCatColors = (colors: ColorTokens) => [
  { bg: colors.roseSoft, fg: colors.rose },
  { bg: colors.sageSoft, fg: colors.sage },
  { bg: colors.lavenderSoft, fg: colors.lavender },
  { bg: colors.goldSoft, fg: colors.gold },
  { bg: colors.blueSoft, fg: colors.blue },
];

export default function NewDemandScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const CAT_COLORS = makeCatColors(colors);
  const city = useStore((s) => s.currentUser?.city) ?? 'Almatı';
  const pushNotification = useStore((s) => s.pushNotification);
  const [desc, setDesc] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [category, setCategory] = useState<string>(CATEGORIES[0]!.id);
  const [budget, setBudget] = useState('');
  const [market, setMarket] = useState<{ average: number; floor: number } | null>(null);

  async function addPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setPhotos((p) => [...p, result.assets[0]!.uri]);
  }

  useEffect(() => {
    let alive = true;
    api
      .marketAverage(category, city)
      .then((m) => alive && setMarket({ average: m.average, floor: m.floor }))
      .catch(() => alive && setMarket(null));
    return () => {
      alive = false;
    };
  }, [category, city]);

  const budgetNum = Number(budget);
  const tooLow = market !== null && budgetNum > 0 && budgetNum < market.floor;
  const canSubmit = desc.trim().length > 0 && budgetNum > 0;

  function submit() {
    // İlgili alandaki uzman/salonlar bütçeyi kabul etti → "yeni teklifin var" bildirimi
    pushNotification({
      type: 'quote',
      title: t('demand.notif.title'),
      body: t('demand.notif.body'),
      dateLabel: 'Şimdi',
      icon: 'pricetags-outline',
      route: '/demand/results',
    });
    router.replace({ pathname: '/demand/results', params: { budget } });
  }

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Lime üst şerit ── */}
        <View style={[styles.hero, { paddingTop: insets.top + space(1) }]}>
          <Image source={require('../../assets/logo-mark.png')} style={styles.logo} resizeMode="contain" />
          <View style={styles.locChip}>
            <Text variant="caption" tone="ink" style={styles.locText}>
              {city}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.ink} />
          </View>
        </View>

        {/* ── Beyaz gövde ── */}
        <View style={styles.sheet}>
          <View style={styles.titleRow}>
            <Pressable style={styles.back} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={colors.ink} />
            </Pressable>
            <View style={styles.titleText}>
              <Text variant="display" tone="ink" style={styles.title}>
                {t('demand.new.title')}
              </Text>
              <Text variant="caption" tone="muted" style={styles.subtitle}>
                {t('demand.new.subtitle')}
              </Text>
            </View>
          </View>

          {/* Kategori seç */}
          <Text variant="bodyStrong" tone="ink" style={styles.label}>
            {t('demand.new.category')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catRow}
          >
            {CATEGORIES.map((cat, i) => {
              const c = CAT_COLORS[i % CAT_COLORS.length]!;
              const active = cat.id === category;
              return (
                <Pressable key={cat.id} style={styles.cat} onPress={() => setCategory(cat.id)}>
                  <View
                    style={[
                      styles.catTile,
                      { backgroundColor: c.bg },
                      active && { borderColor: colors.accent, borderWidth: 2.5 },
                    ]}
                  >
                    <Ionicons name={cat.icon as IoniconName} size={24} color={c.fg} />
                  </View>
                  <Text variant="caption" tone={active ? 'ink' : 'inkSoft'} numberOfLines={1}>
                    {t(cat.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Konum / Tarih satırları */}
          <SelectRow icon="location-outline" label={t('demand.new.location')} value={city} />
          <SelectRow icon="calendar-outline" label={t('demand.new.date')} value={t('demand.new.date_ph')} muted />

          {/* Bütçe (gerçek input) */}
          <View style={styles.budgetRow}>
            <View style={styles.rowIcon}>
              <Ionicons name="wallet-outline" size={20} color={colors.inkSoft} />
            </View>
            <Text variant="bodyStrong" tone="ink" style={styles.rowLabel}>
              {t('demand.new.budget_row')}
            </Text>
            <View style={styles.budgetInputWrap}>
              <Text variant="bodyStrong" tone="muted">
                ₸
              </Text>
              <TextInput
                value={budget}
                onChangeText={(v) => setBudget(v.replace(/[^0-9]/g, ''))}
                placeholder={t('demand.new.budget_row_ph')}
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                style={styles.budgetInput}
              />
            </View>
          </View>
          {market ? (
            <Text variant="caption" tone="muted" style={styles.marketHint}>
              {t('demand.market.avg')}: ~{formatPrice(market.average)}
            </Text>
          ) : null}
          {tooLow ? (
            <View style={styles.warnBox}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text variant="caption" style={styles.warnText}>
                {t('demand.market.low')}
              </Text>
            </View>
          ) : null}

          {/* Not ekle */}
          <View style={styles.noteBox}>
            <View style={styles.noteHead}>
              <Ionicons name="create-outline" size={18} color={colors.inkSoft} />
              <Text variant="bodyStrong" tone="ink">
                {t('demand.new.note')}
              </Text>
            </View>
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder={t('demand.new.note_ph')}
              placeholderTextColor={colors.muted}
              multiline
              style={styles.noteInput}
            />
          </View>

          {/* Fotoğraf ekle */}
          <Text variant="bodyStrong" tone="ink" style={styles.label}>
            {t('demand.new.photos')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoRow}
          >
            <Pressable style={styles.photoAdd} onPress={addPhoto}>
              <Ionicons name="add" size={26} color={colors.inkSoft} />
              <Text variant="caption" tone="muted" style={styles.photoAddText}>
                {t('demand.new.photo_add')}
              </Text>
            </Pressable>
            {photos.map((uri, i) => (
              <Image key={`${uri}-${i}`} source={{ uri }} style={styles.photoThumb} />
            ))}
          </ScrollView>
          <View style={styles.privacyRow}>
            <Ionicons name="lock-closed" size={13} color={colors.muted} />
            <Text variant="caption" tone="muted">
              {t('demand.new.photo_privacy')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── CTA ── */}
      <View style={[styles.footer, { paddingBottom: (insets.bottom || space(1.5)) + space(1) }]}>
        <Pressable style={[styles.cta, !canSubmit && styles.ctaOff]} disabled={!canSubmit} onPress={submit}>
          <Text variant="bodyStrong" tone={canSubmit ? 'onAccent' : 'muted'} style={styles.ctaText}>
            {t('demand.new.send')}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function SelectRow({
  icon,
  label,
  value,
  muted,
}: {
  icon: IoniconName;
  label: string;
  value: string;
  muted?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.selectRow}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.inkSoft} />
      </View>
      <Text variant="bodyStrong" tone="ink" style={styles.rowLabel}>
        {label}
      </Text>
      <Text variant="caption" tone={muted ? 'muted' : 'inkSoft'}>
        {value}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} style={styles.rowChevron} />
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingBottom: space(3) },

    hero: {
      backgroundColor: colors.accent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space(3),
      paddingBottom: space(3),
    },
    logo: { width: 68, height: 34 },
    locChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    locText: { fontWeight: '700' },

    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      marginTop: -space(2),
      paddingHorizontal: space(3),
      paddingTop: space(3),
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
    back: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleText: { flex: 1 },
    title: { fontSize: 30, lineHeight: 34, fontWeight: '800', letterSpacing: -0.6 },
    subtitle: { marginTop: 2 },

    label: { marginTop: space(3), marginBottom: space(1.5) },

    catRow: { gap: space(1.5), paddingRight: space(2) },
    cat: { alignItems: 'center', width: 72, gap: space(0.75) },
    catTile: {
      width: 64,
      height: 64,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2.5,
      borderColor: 'transparent',
    },

    selectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: space(2),
      height: 60,
      marginTop: space(1.5),
    },
    rowIcon: { width: 24, alignItems: 'center' },
    rowLabel: { flex: 1 },
    rowChevron: { marginLeft: space(0.5) },

    budgetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: space(2),
      height: 60,
      marginTop: space(1.5),
    },
    budgetInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    budgetInput: { minWidth: 130, textAlign: 'right', fontSize: 16, fontWeight: '700', color: colors.ink },
    marketHint: { marginTop: space(1), marginLeft: space(1) },
    warnBox: {
      flexDirection: 'row',
      gap: space(1),
      alignItems: 'flex-start',
      marginTop: space(1.25),
      backgroundColor: colors.dangerSoft,
      borderRadius: radius.md,
      padding: space(1.5),
    },
    warnText: { flex: 1, color: colors.danger, lineHeight: 18 },

    noteBox: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      marginTop: space(1.5),
    },
    noteHead: { flexDirection: 'row', alignItems: 'center', gap: space(1), marginBottom: space(1) },
    noteInput: {
      minHeight: 72,
      textAlignVertical: 'top',
      fontSize: 15,
      fontWeight: '400',
      color: colors.ink,
    },

    photoRow: { gap: space(1.25), paddingRight: space(2) },
    photoAdd: {
      width: 96,
      height: 96,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.line,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: colors.accentSoft,
    },
    photoAddText: { textAlign: 'center' },
    photoThumb: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.bgSunken },
    privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space(1.25) },

    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      backgroundColor: colors.bg,
    },
    cta: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
    },
    ctaOff: { backgroundColor: colors.surfaceMuted },
    ctaText: { fontWeight: '800', fontSize: 16 },
  });
