import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES, COLLECT_DEFAULT, COLLECT_OPTIONS } from '../../src/data';
import { useCampaigns } from '../../src/catalog';
import type { MessageKey } from '@ayna/i18n';

import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space, font } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { tri } from '../../src/taxonomy';
import {
  HizmetIkonu,
  TarihSecici,
  RulesCard,
  Screen,
  SectionHeader,
  TAB_BAR_CLEARANCE,
  Text,
  TextInput,
} from '../../src/ui';

// Sıfır-demo: stok model fotoğrafı yerine kendi çizim asset'imiz
const HERO_WOMAN = require('../../assets/hero-user.png');

export default function NewQuoteScreen() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const campaigns = useCampaigns();
  const createDemand = useStore((s) => s.createDemand);
  const restricted = useStore((s) => s.currentUser?.restricted ?? false);
  const [photo, setPhoto] = useState<{ uri: string; base64?: string } | null>(null);
  // §A4 trend akışı — ön-dolu talep: kategori + not paramla gelir (3 dokunuş kuralı)
  const preset = useLocalSearchParams<{ category?: string; note?: string }>();
  const [category, setCategory] = useState<string>(preset.category || 'hair');
  const [collectMin, setCollectMin] = useState<number>(COLLECT_DEFAULT);
  const [note, setNote] = useState(preset.note ?? '');
  const [preferred, setPreferred] = useState<number[]>([]);

  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    // §12.3 — kısıtlı modda yeni talep engellenir
    if (restricted) {
      Alert.alert(t('restricted.title'), t('restricted.body'));
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      // §5.2 Faz A — talep BULUTA açılır; şehirdeki uzmanlara gerçek push gider.
      const id = await createDemand({
        mode: 'photo',
        category,
        collectMin,
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(preferred.length ? { preferredSlots: preferred } : {}),
        ...(photo?.base64 ? { photoDataUrl: `data:image/jpeg;base64,${photo.base64}` } : {}),
      });
      if (!id) {
        Alert.alert(t('common.error'), t('quote.new.submit_err'));
        return;
      }
      // §5.2 — doğrudan sonuçlara DÜŞME; önce "talep uzmanlara gitti" onay ekranı.
      router.replace(`/quote/sent?id=${id}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.4, // foto data URL olarak buluta gider — küçük tut
      base64: true,
    });
    if (!result.canceled && result.assets[0])
      setPhoto({
        uri: result.assets[0].uri,
        ...(result.assets[0].base64 ? { base64: result.assets[0].base64 } : {}),
      });
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.4, base64: true });
    if (!result.canceled && result.assets[0])
      setPhoto({
        uri: result.assets[0].uri,
        ...(result.assets[0].base64 ? { base64: result.assets[0].base64 } : {}),
      });
  }

  return (
    <Screen edges={[]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
              <Image source={HERO_WOMAN} style={styles.heroPhoto} resizeMode="contain" />
              <View style={styles.magicFab}>
                <Ionicons name="color-wand" size={20} color={colors.onAccent} />
              </View>
            </View>
          </View>
        </View>

        {/* ── Yükleme kutusu ── */}
        <Pressable onPress={pickPhoto} style={[styles.uploadBox, !photo && shadow.soft]}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.uploaded} />
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
            <Text
              variant="caption"
              tone="onAccent"
              style={styles.pickText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {t('quote.new.camera')}
            </Text>
          </Pressable>
          <Pressable style={[styles.pickBtn, styles.pickBtnSoft]} onPress={pickPhoto}>
            <Ionicons name="images-outline" size={19} color={colors.ink} />
            <Text
              variant="caption"
              tone="ink"
              style={styles.pickText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {t('quote.new.gallery')}
            </Text>
          </Pressable>
        </View>

        {/* ── Kategori (kompakt) ── */}
        {/*
         * ANA SAYFADAKİ KUTU. Burada hap içinde 20'lik ikon çiziliyordu ve
         * Figma çiziminin ayrıntısı o boyutta dağılıp başka bir ikon gibi
         * görünüyordu — kurucu "hizmet ikonları ana sayfadaki gibi olacak"
         * dedi ve bu ekran atlanmıştı. `demand/new` zaten böyle çiziyor.
         *
         * Yatay kaydırma: altı kategori sarmalayınca ekranın yarısını
         * yiyordu; kutular 64px ve tek satırda kalmalı.
         */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {CATEGORIES.slice(0, 6).map((cat) => {
            const active = cat.id === category;
            return (
              <Pressable key={cat.id} onPress={() => setCategory(cat.id)} style={styles.cat}>
                <HizmetIkonu id={cat.id} tarz="kutu" secili={active} />
                <Text variant="caption" tone={active ? 'ink' : 'inkSoft'} numberOfLines={1}>
                  {tri(cat.ad, locale)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {/* Açıklama (ops.) — kurucu isteği: fotoğrafla talepte not uzmanlara İLETİLİR */}
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder={t('quote.new.note_ph')}
          placeholderTextColor={colors.muted}
          multiline
          maxLength={600}
        />

        {/* İstenen tarih & saat (ops.) — uzman okeyler ya da alternatif önerir (§4.1) */}
        <Text variant="bodyStrong" tone="ink" style={styles.durLabel}>
          {t('demand.pref.title')}
        </Text>
        <Text variant="caption" tone="muted" style={{ marginBottom: 8 }}>
          {t('demand.pref.hint')}
        </Text>
        {/*
         * GERÇEK TAKVİM. Burada SABİT DOKUZ ÇİP vardı (yarın/öbür gün/üç gün
         * sonra × 11:00/15:00/18:00). Kullanıcının aklındaki gün ya da saat
         * listede yoksa hiçbir tercih belirtemiyordu.
         *
         * Kurucu: "bu sayfada takvim çıkması lazımdı istediğin tarih kısmında
         * ve saat seçim alanı olmalıydı." `demand/new` zaten `TarihSecici`
         * kullanıyordu; bu ekran atlanmıştı.
         */}
        <TarihSecici secilenler={preferred} degisti={setPreferred} />

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

        {/* §B5 — kurallar kartı (sürpriz yok → itiraz yok) */}
        <RulesCard />
      </ScrollView>

      {/* ── CTA ── */}
      <View
        style={[
          styles.footer,
          { paddingBottom: (insets.bottom || space(1.5)) + TAB_BAR_CLEARANCE },
        ]}
      >
        <Pressable style={styles.cta} onPress={submit} disabled={submitting}>
          <Text
            variant="bodyStrong"
            tone="onAccent"
            style={styles.ctaText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
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

    // Kanvas Dilek.dc.html: zemin AÇIK porselen. Burada mor bir bant vardı ve
    // üstelik içindeki metinler tone="ink" (koyu) idi — yani koyu-üstüne-koyu
    // okunuyordu. Bant kaldırıldı; metinler zaten doğru tonda.
    hero: {
      backgroundColor: colors.bg,
      paddingHorizontal: space(3),
      paddingBottom: space(3),
    },
    heroTop: { flexDirection: 'row', alignItems: 'center' },
    backChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surface, // açık zeminde yarı saydam beyaz kaybolurdu
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
    },
    backText: { fontFamily: font.semibold },
    heroBody: { flexDirection: 'row', alignItems: 'center', marginTop: space(2) },
    heroText: { flex: 1 },
    heroTitle: { fontSize: 32, lineHeight: 36, fontFamily: font.semibold, letterSpacing: -0.6 },
    heroSub: { marginTop: space(1.25), maxWidth: 210, lineHeight: 18 },
    heroPhotoWrap: { width: 130, height: 160 },
    heroPhoto: {
      width: 130,
      height: 160,
      borderTopLeftRadius: radius.xl,
      borderBottomRightRadius: radius.xl,
      borderTopRightRadius: radius.md,
      borderBottomLeftRadius: radius.md,
      // Mor bandın üstünde yarı saydam beyaz bir zemindi; açık zeminde
      // görünmez kalıyordu → token'lı yumuşak zemin.
      backgroundColor: colors.accentSoft,
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
    uploadTitle: { fontFamily: font.semibold },

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
    pickText: { fontFamily: font.semibold },

    catRow: {
      flexDirection: 'row',
      // Sarma YOK: 64'lük kutular sarınca ekranın yarısını yiyordu.
      gap: space(1.5),
      paddingHorizontal: space(3),
      marginTop: space(2.5),
    },
    // Ana sayfadaki ızgara ile aynı: kutu + altında etiket.
    cat: { alignItems: 'center', gap: space(0.75), width: 76 },
    /** Kurucunun Figma ikonu — Ionicons vektörünün yerine. */

    noteInput: {
      minHeight: 76,
      paddingHorizontal: space(2),
      paddingVertical: space(1.5),
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      fontSize: 15,
      color: colors.ink,
      textAlignVertical: 'top',
      marginHorizontal: space(3),
    },
    durLabel: { paddingHorizontal: space(3), marginTop: space(2.5), marginBottom: space(1) },
    durRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1), paddingHorizontal: space(3) },
    durChip: {
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    durChipActive: { backgroundColor: colors.accent },
    durText: { fontFamily: font.semibold },

    specialRow: { paddingHorizontal: space(3), gap: space(1.5) },
    special: {
      width: 150,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    specialImg: { width: '100%', height: 96, backgroundColor: colors.bgSunken },
    specialBody: { padding: space(1.5), gap: 4 },
    specialBadge: { fontFamily: font.semibold },
    specialTitle: { fontFamily: font.semibold, lineHeight: 17 },

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
    ctaText: { fontFamily: font.semibold, fontSize: 16 },
  });
