import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { PROFESSIONALS } from '../../src/data';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, TAB_BAR_CLEARANCE, Text, TextInput } from '../../src/ui';

const STARS = [1, 2, 3, 4, 5];
// §7.1 — alt kırılım etiketleri (hızlı, isteğe bağlı)
const TAGS: { key: string; label: MessageKey }[] = [
  { key: 'quality', label: 'review.tag.quality' },
  { key: 'clean', label: 'review.tag.clean' },
  { key: 'comm', label: 'review.tag.comm' },
  { key: 'timing', label: 'review.tag.timing' },
];

type Rate = { rating: number; text: string; tags: string[] };
const emptyRate: Rate = { rating: 5, text: '', tags: [] };

export default function ReviewNewScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = useStore((s) => s.bookings.find((b) => b.id === id));
  const reviewBooking = useStore((s) => s.reviewBooking);

  // §7.1 — salon randevusu ise iki adım (önce uzman, sonra salon); bireyselse tek adım.
  // Uzman adımı ancak uzman adı biliniyorsa açılır; yoksa salon adı "Uzman" gibi görünmesin.
  const pro = PROFESSIONALS.find((p) => p.id === booking?.proId);
  const isSalon = pro?.kind === 'salon' && !!booking?.uzmanName;

  const [step, setStep] = useState<'uzman' | 'salon'>('uzman');
  const [uzman, setUzman] = useState<Rate>(emptyRate);
  const [salon, setSalon] = useState<Rate>(emptyRate);
  const [photos, setPhotos] = useState<string[]>([]); // EK Z.10 — öncesi/sonrası galeri

  async function pickPhoto() {
    if (photos.length >= 4) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (res.canceled || !res.assets[0]) return;
    setPhotos((p) => [...p, res.assets[0]!.uri]);
  }

  if (!booking) {
    return (
      <Screen edges={[]}>
        <StackHeader title={t('review.title')} />
        <View style={styles.empty}>
          <Ionicons name="star-outline" size={32} color={colors.muted} />
          <Text variant="caption" tone="muted" style={styles.emptyText}>
            {t('review.not_eligible')}
          </Text>
        </View>
      </Screen>
    );
  }

  const onUzman = step === 'uzman';
  const cur = onUzman ? uzman : salon;
  const setCur = onUzman ? setUzman : setSalon;
  const targetName = onUzman ? booking.uzmanName ?? booking.proName : booking.proName;
  const toggleTag = (key: string) =>
    setCur((r) => ({
      ...r,
      tags: r.tags.includes(key) ? r.tags.filter((x) => x !== key) : [...r.tags, key],
    }));

  function next() {
    if (!id) return;
    // Uzman adımı bitti; salon randevusuysa salon adımına geç
    if (onUzman && isSalon) {
      setStep('salon');
      return;
    }
    reviewBooking(id, {
      rating: uzman.rating,
      text: uzman.text.trim(),
      tags: uzman.tags,
      ...(photos.length ? { photos } : {}), // EK Z.10 — öncesi/sonrası galeri
      ...(isSalon
        ? { salon: { rating: salon.rating, text: salon.text.trim(), tags: salon.tags } }
        : {}),
    });
    router.replace('/bookings');
  }

  return (
    <Screen edges={['bottom']}>
      <StackHeader title={t('review.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* İki adımlı ilerleme göstergesi (yalnız salon randevusunda) */}
        {isSalon ? (
          <View style={styles.steps}>
            <StepDot label={t('review.step.uzman')} active={onUzman} done={!onUzman} />
            <View style={styles.stepLine} />
            <StepDot label={t('review.step.salon')} active={!onUzman} done={false} />
          </View>
        ) : null}

        <Text variant="caption" tone="muted" style={styles.subtitle}>
          {onUzman && isSalon ? t('review.step.uzman') : isSalon ? t('review.step.salon') : t('review.subtitle')}
        </Text>

        <View style={[styles.proCard, shadow.soft]}>
          <Text variant="bodyStrong" tone="ink">
            {targetName}
          </Text>
          <Text variant="caption" tone="muted">
            {booking.service}
          </Text>
        </View>

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('review.rating')}
        </Text>
        <View style={[styles.stars, shadow.soft]}>
          {STARS.map((s) => (
            <Pressable key={s} onPress={() => setCur((r) => ({ ...r, rating: s }))} hitSlop={6}>
              <Ionicons name={s <= cur.rating ? 'star' : 'star-outline'} size={36} color={colors.gold} />
            </Pressable>
          ))}
        </View>

        {/* §7.1 — alt kırılım chip'leri */}
        <Text variant="h2" tone="ink" style={styles.label}>
          {t('review.tags_label')}
        </Text>
        <View style={styles.tags}>
          {TAGS.map((tg) => {
            const on = cur.tags.includes(tg.key);
            return (
              <Pressable
                key={tg.key}
                onPress={() => toggleTag(tg.key)}
                style={[styles.tag, on && styles.tagOn]}
              >
                <Text variant="caption" tone={on ? 'onAccent' : 'inkSoft'} style={on ? styles.tagOnText : undefined}>
                  {t(tg.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('review.comment')}
        </Text>
        <TextInput
          value={cur.text}
          onChangeText={(v) => setCur((r) => ({ ...r, text: v }))}
          placeholder={t('review.comment_ph')}
          placeholderTextColor={colors.muted}
          multiline
          style={styles.input}
        />

        {/* EK Z.10 — öncesi/sonrası foto (yalnız uzman adımı) */}
        {step === 'uzman' ? (
          <>
            <Text variant="h2" tone="ink" style={styles.label}>
              {t('review.photos')}
            </Text>
            <Text variant="caption" tone="muted" style={styles.photoHint}>
              {t('review.photos_hint')}
            </Text>
            <View style={styles.photoGrid}>
              {photos.map((uri, i) => (
                <View key={`${uri}-${i}`} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.photoImg} />
                  <Pressable onPress={() => setPhotos((p) => p.filter((_, x) => x !== i))} style={styles.photoRemove}>
                    <Ionicons name="close" size={14} color={colors.onColor} />
                  </Pressable>
                </View>
              ))}
              {photos.length < 4 ? (
                <Pressable onPress={pickPhoto} style={[styles.photoAdd, { borderColor: colors.line }]}>
                  <Ionicons name="camera-outline" size={22} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={onUzman && isSalon ? t('review.next') : t('review.submit')}
          variant={cur.rating > 0 ? 'primary' : 'secondary'}
          disabled={cur.rating === 0}
          onPress={next}
        />
      </View>
    </Screen>
  );
}

function StepDot({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stepDot}>
      <View style={[styles.stepCircle, (active || done) && styles.stepCircleOn]}>
        {done ? (
          <Ionicons name="checkmark" size={14} color={colors.onAccent} />
        ) : (
          <View style={[styles.stepInner, active && styles.stepInnerOn]} />
        )}
      </View>
      <Text variant="caption" tone={active ? 'ink' : 'muted'}>
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4), paddingTop: space(1) },
    steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space(1), marginBottom: space(2) },
    stepDot: { alignItems: 'center', gap: space(0.5) },
    stepCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepCircleOn: { backgroundColor: colors.accent },
    stepInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted },
    stepInnerOn: { backgroundColor: colors.onAccent },
    stepLine: { width: 40, height: 2, backgroundColor: colors.line, marginBottom: space(2) },
    subtitle: { marginBottom: space(2) },
    empty: { alignItems: 'center', justifyContent: 'center', paddingTop: space(8), gap: space(1.5) },
    emptyText: {},
    proCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(2), gap: 2 },
    label: { marginTop: space(3), marginBottom: space(1.5) },
    stars: {
      flexDirection: 'row',
      gap: space(1.5),
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingVertical: space(2.5),
    },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    tag: {
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    tagOn: { backgroundColor: colors.accent },
    tagOnText: { fontWeight: '700' },
    input: {
      minHeight: 120,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.lg,
      padding: space(2),
      textAlignVertical: 'top',
      color: colors.ink,
      fontSize: 15,
    },
    footer: { paddingHorizontal: space(3), paddingTop: space(1.5), paddingBottom: TAB_BAR_CLEARANCE },
    photoHint: { marginTop: -space(1), marginBottom: space(1) },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5) },
    photoThumb: { width: 84, height: 84, borderRadius: radius.md, overflow: 'hidden' },
    photoImg: { width: '100%', height: '100%' },
    photoRemove: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoAdd: {
      width: 84,
      height: 84,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
