import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES, COLLECT_DEFAULT, COLLECT_OPTIONS } from '../../src/data';
import { useCampaigns } from '../../src/catalog';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, SectionHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

const HERO_WOMAN =
  'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?auto=format&fit=crop&w=500&q=75';

export default function NewQuoteScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const campaigns = useCampaigns();
  const createDemand = useStore((s) => s.createDemand);
  const restricted = useStore((s) => s.currentUser?.restricted ?? false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('hair');
  const [collectMin, setCollectMin] = useState<number>(COLLECT_DEFAULT);
  const [submitting, setSubmitting] = useState(false);

  function submit() {
    // §12.3 — kısıtlı modda yeni talep engellenir
    if (restricted) {
      Alert.alert(t('restricted.title'), t('restricted.body'));
      return;
    }
    setSubmitting(true);
    // §5.2 Mod 1 — fotoğrafla teklif: talep aç, kategorideki uzmanlardan teklifler gelir
    const id = createDemand({
      mode: 'photo',
      category,
      collectMin,
      ...(photo ? { photoUrl: photo } : {}),
    });
    // §5.2 — doğrudan sonuçlara DÜŞME; önce "talep uzmanlara gitti" onay ekranı.
    router.replace(`/quote/sent?id=${id}`);
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setPhoto(result.assets[0].uri);
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) setPhoto(result.assets[0].uri);
  }

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Lime hero ── */}
        <View style={[styles.hero, { paddingTop: insets.top + space(1) }]}>
          <View style={styles.heroTop}>
            <Pressable style={styles.backChip} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={18} color={colors.ink} />
              <Text variant="caption" tone="ink" style={styles.backText}>
                {t('common.back')}
              </Text>
            </Pressable>
          </View>
          <View style={styles.heroBody}>
            <View style={styles.heroText}>
              <Text variant="display" tone="ink" style={styles.heroTitle}>
                {t('quote.new.title')}
              </Text>
              <Text variant="caption" tone="inkSoft" style={styles.heroSub}>
                {t('quote.new.subtitle')}
              </Text>
            </View>
            <View style={styles.heroPhotoWrap}>
              <Image source={{ uri: HERO_WOMAN }} style={styles.heroPhoto} />
              <View style={styles.magicFab}>
                <Ionicons name="color-wand" size={20} color={colors.onAccent} />
              </View>
            </View>
          </View>
        </View>

        {/* ── Yükleme kutusu ── */}
        <Pressable onPress={pickPhoto} style={[styles.uploadBox, !photo && shadow.soft]}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.uploaded} />
          ) : (
            <>
              <View style={styles.uploadIcon}>
                <Ionicons name="cloud-upload-outline" size={30} color={colors.ink} />
              </View>
              <Text variant="bodyStrong" tone="ink" style={styles.uploadTitle}>
                {t('quote.new.upload')}
              </Text>
              <Text variant="caption" tone="muted">
                {t('quote.new.upload_hint')}
              </Text>
            </>
          )}
        </Pressable>

        {/* ── Kamera / Galeri ── */}
        <View style={styles.pickRow}>
          <Pressable style={styles.pickBtn} onPress={takePhoto}>
            <Ionicons name="camera-outline" size={19} color={colors.onAccent} />
            <Text variant="caption" tone="onAccent" style={styles.pickText}>
              {t('quote.new.camera')}
            </Text>
          </Pressable>
          <Pressable style={[styles.pickBtn, styles.pickBtnSoft]} onPress={pickPhoto}>
            <Ionicons name="images-outline" size={19} color={colors.ink} />
            <Text variant="caption" tone="ink" style={styles.pickText}>
              {t('quote.new.gallery')}
            </Text>
          </Pressable>
        </View>

        {/* ── Kategori (kompakt) ── */}
        <View style={styles.catRow}>
          {CATEGORIES.slice(0, 6).map((cat) => {
            const active = cat.id === category;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                style={[styles.catChip, active && styles.catChipActive]}
              >
                <Ionicons
                  name={cat.icon as IoniconName}
                  size={15}
                  color={active ? colors.onAccent : colors.inkSoft}
                />
                <Text variant="caption" tone={active ? 'onAccent' : 'inkSoft'}>
                  {t(cat.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Teklif toplama süresi (§5.2) ── */}
        <Text variant="bodyStrong" tone="ink" style={styles.durLabel}>
          {t('quote.duration')}
        </Text>
        <View style={styles.durRow}>
          {COLLECT_OPTIONS.map((m) => {
            const active = m === collectMin;
            return (
              <Pressable
                key={m}
                onPress={() => setCollectMin(m)}
                style={[styles.durChip, active && styles.durChipActive]}
              >
                <Text
                  variant="caption"
                  tone={active ? 'onAccent' : 'inkSoft'}
                  style={styles.durText}
                >
                  {t(`dur.${m}` as MessageKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Sana özel teklifler ── */}
        <SectionHeader title={t('quote.new.special')} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.specialRow}
        >
          {campaigns.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.special, shadow.soft]}
              onPress={() => router.push(c.category ? '/category/' + c.category : '/search')}
            >
              <Image source={{ uri: c.image }} style={styles.specialImg} />
              <View style={styles.specialBody}>
                {c.badge ? (
                  <Text variant="caption" tone="ink" style={styles.specialBadge}>
                    {c.badge}
                  </Text>
                ) : null}
                <Text variant="caption" tone="ink" style={styles.specialTitle} numberOfLines={2}>
                  {c.title}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </ScrollView>

      {/* ── CTA ── */}
      <View
        style={[
          styles.footer,
          { paddingBottom: (insets.bottom || space(1.5)) + TAB_BAR_CLEARANCE },
        ]}
      >
        <Pressable style={styles.cta} onPress={submit} disabled={submitting}>
          <Text variant="bodyStrong" tone="onAccent" style={styles.ctaText}>
            {t('quote.new.view_offers')}
          </Text>
          <Ionicons name="arrow-forward" size={19} color={colors.onAccent} />
        </Pressable>
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingBottom: space(3) },

    hero: {
      backgroundColor: colors.accent,
      paddingHorizontal: space(3),
      paddingBottom: space(3),
      borderBottomLeftRadius: radius.xl,
      borderBottomRightRadius: radius.xl,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center' },
    backChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.55)',
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
    },
    backText: { fontWeight: '700' },
    heroBody: { flexDirection: 'row', alignItems: 'center', marginTop: space(2) },
    heroText: { flex: 1 },
    heroTitle: { fontSize: 32, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6 },
    heroSub: { marginTop: space(1.25), maxWidth: 210, lineHeight: 18 },
    heroPhotoWrap: { width: 130, height: 160 },
    heroPhoto: {
      width: 130,
      height: 160,
      borderTopLeftRadius: radius.xl,
      borderBottomRightRadius: radius.xl,
      borderTopRightRadius: radius.md,
      borderBottomLeftRadius: radius.md,
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    magicFab: {
      position: 'absolute',
      bottom: -8,
      left: -10,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accent,
      borderWidth: 3,
      borderColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },

    uploadBox: {
      marginHorizontal: space(3),
      marginTop: space(3),
      height: 168,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(0.75),
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    uploaded: { width: '100%', height: '100%' },
    uploadIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(0.5),
    },
    uploadTitle: { fontWeight: '800' },

    pickRow: {
      flexDirection: 'row',
      gap: space(1.5),
      paddingHorizontal: space(3),
      marginTop: space(2),
    },
    pickBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(1),
      height: 52,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
    },
    pickBtnSoft: { backgroundColor: colors.accentSoft },
    pickText: { fontWeight: '800' },

    catRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space(1),
      paddingHorizontal: space(3),
      marginTop: space(2.5),
    },
    catChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: space(1.5),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    catChipActive: { backgroundColor: colors.accent },

    durLabel: { paddingHorizontal: space(3), marginTop: space(2.5), marginBottom: space(1) },
    durRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1), paddingHorizontal: space(3) },
    durChip: {
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    durChipActive: { backgroundColor: colors.accent },
    durText: { fontWeight: '700' },

    specialRow: { paddingHorizontal: space(3), gap: space(1.5) },
    special: {
      width: 150,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    specialImg: { width: '100%', height: 96, backgroundColor: colors.bgSunken },
    specialBody: { padding: space(1.5), gap: 4 },
    specialBadge: { fontWeight: '800' },
    specialTitle: { fontWeight: '700', lineHeight: 17 },

    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      backgroundColor: colors.bg,
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(1),
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
    },
    ctaText: { fontWeight: '800', fontSize: 16 },
  });
