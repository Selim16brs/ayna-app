import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { type Promotion, type PromotionStatus } from '../../src/data';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  Button,
  DateField,
  formatTrDate,
  PressableScale,
  Screen,
  StackHeader,
  Text,
  TextInput,
} from '../../src/ui';

// §12.7 — durum rozetleri
const STATUS: Record<
  PromotionStatus,
  { key: MessageKey; tone: 'gold' | 'success' | 'danger' | 'muted' }
> = {
  pending: { key: 'promo.status.pending', tone: 'gold' },
  live: { key: 'promo.status.live', tone: 'success' },
  rejected: { key: 'promo.status.rejected', tone: 'danger' },
  expired: { key: 'promo.status.expired', tone: 'muted' },
};

export default function SellerPromotionsScreen() {
  const { t } = useLocale();
  const { colors, gradients } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const premium = useStore((s) => s.premium);
  const promotions = useStore((s) => s.promotions);
  const createPromotion = useStore((s) => s.createPromotion);
  // §11 — premium uzman/salon haftada YALNIZ 1 promosyon oluşturabilir
  const WEEK_MS = 7 * 86_400_000;
  const madeThisWeek = promotions.some((p) => Date.now() - p.createdAt < WEEK_MS);
  const openForm = () =>
    madeThisWeek ? Alert.alert(t('promo.title'), t('promo.week_limit')) : setOpen(true);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [discount, setDiscount] = useState('');
  const now = new Date();
  const [start, setStart] = useState<Date>(now);
  const [end, setEnd] = useState<Date>(new Date(Date.now() + 7 * 86_400_000));
  const [image, setImage] = useState<string | null>(null);

  const canSubmit = title.trim().length > 1 && desc.trim().length > 1;

  const reset = () => {
    setTitle('');
    setDesc('');
    setDiscount('');
    setImage(null);
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]) setImage(res.assets[0].uri);
  };

  const submit = () => {
    if (!canSubmit) return;
    if (madeThisWeek) {
      Alert.alert(t('promo.title'), t('promo.week_limit'));
      return;
    }
    createPromotion({
      title,
      desc,
      ...(Number(discount) > 0 ? { discountPct: Number(discount) } : {}),
      startLabel: formatTrDate(start, false),
      endLabel: formatTrDate(end, false),
      ...(image ? { imageUri: image } : {}),
    });
    setOpen(false);
    reset();
    Alert.alert(t('promo.submitted_title'), t('promo.submitted_body'));
  };

  // ── PREMIUM DEĞİL → §11 upsell (davetkâr; "kilitli" dili yok) ──
  if (!premium) {
    return (
      <Screen edges={[]}>
        <StackHeader title={t('promo.title')} />
        <ScrollView contentContainerStyle={styles.upsellWrap} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={gradients.gold} style={styles.upsellCard}>
            <View style={styles.upsellIcon}>
              <Ionicons name="megaphone" size={28} color={colors.onAccent} />
            </View>
            <Text variant="h2" tone="onAccent" style={styles.upsellTitle}>
              {t('promo.upsell_title')}
            </Text>
            <Text variant="body" tone="onAccent" style={styles.upsellBody}>
              {t('promo.upsell_body')}
            </Text>
            {(['promo.upsell_b1', 'promo.upsell_b2', 'promo.upsell_b3'] as MessageKey[]).map(
              (k) => (
                <View key={k} style={styles.upsellRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.onAccent} />
                  <Text variant="caption" tone="onAccent" style={styles.upsellRowText}>
                    {t(k)}
                  </Text>
                </View>
              ),
            )}
          </LinearGradient>
          <View style={styles.upsellCta}>
            <Button
              label={t('promo.upsell_cta')}
              variant="primary"
              onPress={() => router.push('/seller/premium')}
            />
          </View>
          <Pressable onPress={() => router.back()} style={styles.laterBtn}>
            <Text variant="bodyStrong" tone="muted">
              {t('promo.later')}
            </Text>
          </Pressable>
        </ScrollView>
      </Screen>
    );
  }

  // ── PREMIUM → liste + oluştur ──
  return (
    <Screen edges={[]}>
      <StackHeader title={t('promo.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" tone="muted" style={styles.intro}>
          {t('promo.intro')}
        </Text>

        <PressableScale style={styles.newCard} onPress={openForm}>
          <View style={styles.newIcon}>
            <Ionicons name="add" size={22} color={colors.onAccent} />
          </View>
          <Text variant="bodyStrong" tone="ink" style={styles.flex}>
            {t('promo.new')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </PressableScale>

        {promotions.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="megaphone-outline" size={30} color={colors.accentFg} />
            </View>
            <Text variant="caption" tone="muted" style={styles.emptyText}>
              {t('promo.empty')}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {promotions.map((p) => (
              <PromoCard key={p.id} promo={p} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Oluşturma formu */}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text variant="h2" tone="ink" style={styles.sheetTitle}>
                {t('promo.form.title')}
              </Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8} style={styles.close}>
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Field label={t('promo.form.name')}>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t('promo.form.name_ph')}
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
              </Field>
              <Field label={t('promo.form.desc')}>
                <TextInput
                  value={desc}
                  onChangeText={setDesc}
                  placeholder={t('promo.form.desc_ph')}
                  placeholderTextColor={colors.muted}
                  multiline
                  style={[styles.input, styles.inputMulti]}
                />
              </Field>
              <Field label={t('promo.form.discount')}>
                <TextInput
                  value={discount}
                  onChangeText={(v) => setDiscount(v.replace(/[^0-9]/g, '').slice(0, 2))}
                  placeholder="20"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </Field>
              <View style={styles.dateRow}>
                <View style={styles.flex}>
                  <DateField
                    label={t('promo.form.start')}
                    value={start}
                    onChange={setStart}
                    mode="date"
                    minimumDate={now}
                  />
                </View>
                <View style={styles.flex}>
                  <DateField
                    label={t('promo.form.end')}
                    value={end}
                    onChange={setEnd}
                    mode="date"
                    minimumDate={start}
                  />
                </View>
              </View>
              <Field label={t('promo.form.image')}>
                <Pressable style={styles.imageBox} onPress={pickImage}>
                  {image ? (
                    <Image source={{ uri: image }} style={styles.image} />
                  ) : (
                    <View style={styles.imageEmpty}>
                      <Ionicons name="image-outline" size={22} color={colors.inkSoft} />
                      <Text variant="caption" tone="muted">
                        {t('promo.form.image_hint')}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </Field>
              <View style={styles.approveNote}>
                <Ionicons name="shield-checkmark-outline" size={15} color={colors.accentFg} />
                <Text variant="caption" tone="accentFg" style={styles.flex}>
                  {t('promo.form.approve_note')}
                </Text>
              </View>
              <Button
                label={t('promo.form.submit')}
                variant={canSubmit ? 'primary' : 'secondary'}
                disabled={!canSubmit}
                onPress={submit}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.field}>
      <Text variant="caption" tone="inkSoft" style={styles.fieldLabel}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function PromoCard({ promo }: { promo: Promotion }) {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const st = STATUS[promo.status];
  const tone = {
    gold: { bg: colors.goldSoft, fg: colors.gold },
    success: { bg: colors.successSoft, fg: colors.success },
    danger: { bg: colors.roseSoft, fg: colors.danger },
    muted: { bg: colors.surfaceMuted, fg: colors.muted },
  }[st.tone];

  return (
    <View style={[styles.card, shadow.soft]}>
      {promo.imageUri ? <Image source={{ uri: promo.imageUri }} style={styles.cardImage} /> : null}
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text variant="bodyStrong" tone="ink" style={styles.flex} numberOfLines={1}>
            {promo.title}
          </Text>
          <View style={[styles.badge, { backgroundColor: tone.bg }]}>
            <Text variant="caption" style={[styles.badgeText, { color: tone.fg }]}>
              {t(st.key)}
            </Text>
          </View>
        </View>
        <Text variant="caption" tone="inkSoft" style={styles.cardDesc} numberOfLines={2}>
          {promo.desc}
        </Text>
        <View style={styles.cardMeta}>
          {promo.discountPct ? (
            <View style={styles.discountChip}>
              <Ionicons name="pricetag" size={11} color={colors.accentFg} />
              <Text variant="caption" tone="accentFg" style={styles.discountText}>
                %{promo.discountPct}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaChip}>
            <Ionicons name="calendar-outline" size={11} color={colors.muted} />
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {promo.startLabel} – {promo.endLabel}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { padding: space(3), paddingBottom: space(6) },
    flex: { flex: 1 },
    intro: { marginBottom: space(2), lineHeight: 18 },

    // Yeni promosyon satırı
    newCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1.25,
      borderColor: colors.accent,
      padding: space(1.75),
      marginBottom: space(2.5),
    },
    newIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.accentFg,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Liste + kartlar
    list: { gap: space(1.5) },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    cardImage: { width: '100%', height: 120, backgroundColor: colors.surfaceMuted },
    cardBody: { padding: space(2), gap: space(1) },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    badge: { paddingHorizontal: space(1), paddingVertical: 3, borderRadius: radius.pill },
    badgeText: { fontWeight: '700' },
    cardDesc: { lineHeight: 18 },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: space(1), flexWrap: 'wrap' },
    discountChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    discountText: { fontWeight: '800' },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
    },

    // Boş durum
    empty: { alignItems: 'center', paddingTop: space(6), gap: space(1) },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(1),
    },
    emptyText: { textAlign: 'center' },

    // §11 upsell
    upsellWrap: { padding: space(3), paddingBottom: space(6) },
    upsellCard: { borderRadius: radius.xl, padding: space(3), gap: space(1.25) },
    upsellIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(255,255,255,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(0.5),
    },
    upsellTitle: { letterSpacing: -0.3 },
    upsellBody: { opacity: 0.9, lineHeight: 21, marginBottom: space(0.5) },
    upsellRow: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    upsellRowText: { flex: 1, opacity: 0.95 },
    upsellCta: { marginTop: space(2.5) },
    laterBtn: { alignItems: 'center', paddingVertical: space(2) },

    // Form (bottom sheet)
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: space(3),
      paddingTop: space(2.5),
      paddingBottom: space(3),
      maxHeight: '90%',
    },
    sheetHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: space(1.5),
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
    field: { marginBottom: space(1.5) },
    fieldLabel: { marginBottom: space(0.75) },
    input: {
      minHeight: 50,
      paddingHorizontal: space(2),
      paddingVertical: space(1.25),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      fontSize: 15,
      color: colors.ink,
    },
    inputMulti: { minHeight: 80, textAlignVertical: 'top' },
    dateRow: { flexDirection: 'row', gap: space(1.5) },
    imageBox: {
      height: 120,
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    image: { width: '100%', height: '100%' },
    imageEmpty: { alignItems: 'center', gap: space(0.5) },
    approveNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      backgroundColor: colors.accentSoft,
      padding: space(1.5),
      borderRadius: radius.md,
      marginBottom: space(2),
    },
  });
