import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatPrice } from '../../src/data';
import { formatSlotTr } from '../../src/datetime';
import { tri } from '../../src/taxonomy';
import { useProfessionalDetail } from '../../src/catalog';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { DateField, TAB_BAR_CLEARANCE, Text, WaveLayered } from '../../src/ui';

const HOT_PINK = '#FF2E93'; // favori (kalp) aktif rengi

export default function UzmanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, locale } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const salonId = (id ?? '').split('-u')[0] || '1';
  const salon = useProfessionalDetail(salonId);
  const uzman = salon.staff.find((u) => u.id === id) ?? salon.staff[0];

  const [selected, setSelected] = useState<string>(salon.services[0]?.id ?? '');
  const minDate = new Date(Date.now() + 2 * 3_600_000);
  minDate.setMinutes(0, 0, 0);
  const [when, setWhen] = useState<Date>(() => new Date(minDate));

  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const isFav = useStore((s) => s.favorites.includes(salonId));
  const addBooking = useStore((s) => s.addBooking);

  // Uzman kaydı yoksa (ör. bağımsız) salon detayına düş
  if (!uzman) {
    router.replace('/professional/' + salonId);
    return null;
  }

  // Tarih/saat detay sayfasında seçildi → doğrudan randevu oluştur
  const book = () => {
    const svc = salon.services.find((s) => s.id === selected);
    const startMs = when.getTime();
    const bid = addBooking({
      source: 'direct',
      service: svc ? (svc.label ? tri(svc.label, locale) : svc.name) : salon.specialty,
      proId: salon.id,
      proName: salon.name,
      proImage: salon.image,
      uzmanName: uzman.name,
      startMs,
      durationMin: svc?.durationMin ?? 60,
      price: svc?.price ?? Number(salon.priceFrom),
    });
    router.replace({
      pathname: '/booking/confirmed',
      params: {
        id: bid,
        proId: salon.id,
        source: 'direct',
        slot: formatSlotTr(startMs),
        uzmanName: uzman.name,
      },
    });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 + TAB_BAR_CLEARANCE }}
      >
        {/* HERO — lime bant (Keşfet dili): çerçeveli portre + isim/puan/salon bağı + dalga */}
        <View style={[styles.hero, { paddingTop: insets.top + space(1) }]}>
          <View style={styles.heroTop}>
            <Pressable style={styles.circleBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={colors.ink} />
            </Pressable>
            <Pressable style={styles.circleBtn} onPress={() => toggleFavorite(salonId)}>
              <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? HOT_PINK : colors.ink} />
            </Pressable>
          </View>

          <View style={styles.heroBody}>
            <View style={styles.heroInfo}>
              <View style={styles.badgePill}>
                <Ionicons name="sparkles" size={12} color={colors.accentFg} />
                <Text variant="caption" tone="ink" style={styles.badgePillText}>
                  {uzman.role}
                </Text>
              </View>
              <Text variant="display" tone="ink" style={styles.heroName} numberOfLines={2}>
                {uzman.name}
              </Text>
              <View style={styles.heroStats}>
                <View style={styles.ratingPill}>
                  <Ionicons name="star" size={13} color={colors.gold} />
                  <Text variant="bodyStrong" tone="ink" style={styles.ratingPillText}>
                    {uzman.rating.toFixed(1)}
                  </Text>
                </View>
                <Pressable style={styles.salonPill} onPress={() => router.push('/professional/' + salonId)}>
                  <Ionicons name="storefront-outline" size={12} color={colors.ink} />
                  <Text variant="caption" tone="ink" style={styles.salonPillText} numberOfLines={1}>
                    {salon.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.ink} />
                </Pressable>
              </View>
            </View>
            <Image source={{ uri: uzman.image }} style={styles.heroPortrait} />
          </View>
          <View style={styles.waveAbs}>
            <WaveLayered sliver={colors.bg} bottom={colors.bg} height={70} />
          </View>
        </View>

        {/* SHEET */}
        <View style={styles.sheet}>
          <Text variant="body" tone="inkSoft" style={styles.about}>
            {salon.about}
          </Text>

          <Text variant="bodyStrong" tone="ink" style={styles.section}>
            {t('pro.services')}
          </Text>
          <View style={styles.services}>
            {salon.services.map((s) => {
              const active = s.id === selected;
              const finalPrice = s.discountPct
                ? Math.round((s.price * (100 - s.discountPct)) / 100)
                : s.price;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSelected(s.id)}
                  style={[styles.service, shadow.soft, active && styles.serviceActive]}
                >
                  <View style={styles.serviceText}>
                    <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {s.durationMin} {t('pro.min')}
                      {s.discountPct ? `  ·  −%${s.discountPct}` : ''}
                    </Text>
                  </View>
                  <Text variant="bodyStrong" tone="ink">
                    {formatPrice(finalPrice)}
                  </Text>
                  <View style={[styles.check, active && styles.checkOn]}>
                    {active ? <Ionicons name="checkmark" size={14} color={colors.onAccent} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Tarih & saat — Benim İçin kayıt eklemeleriyle AYNI native seçici */}
          <Text variant="bodyStrong" tone="ink" style={styles.section}>
            {t('booking.schedule.time')}
          </Text>
          <View style={[styles.dateCard, shadow.soft]}>
            <DateField
              label={t('booking.schedule.datetime')}
              value={when}
              onChange={setWhen}
              mode="datetime"
              minimumDate={minDate}
              last
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }]}>
        <Pressable style={styles.ctaBtn} onPress={book}>
          <Text variant="bodyStrong" tone="onAccent" style={styles.ctaText}>
            {t('pro.book')}
          </Text>
          <Ionicons name="arrow-forward" size={19} color={colors.onAccent} />
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    // ── Lime hero (Keşfet dili) ──
    hero: {
      backgroundColor: colors.accent,
      paddingHorizontal: space(3),
      paddingBottom: space(5),
      position: 'relative',
      overflow: 'hidden',
    },
    waveAbs: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2 },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between' },
    circleBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroBody: { flexDirection: 'row', alignItems: 'flex-end', marginTop: space(2), zIndex: 2 },
    heroInfo: { flex: 1, paddingRight: space(1.5), paddingBottom: space(1) },
    badgePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.7)',
      paddingHorizontal: space(1.25),
      paddingVertical: 5,
      borderRadius: radius.pill,
      marginBottom: space(1),
    },
    badgePillText: { fontWeight: '700' },
    heroName: { fontSize: 30, lineHeight: 34, fontWeight: '800', letterSpacing: -0.4 },
    heroStats: { flexDirection: 'row', alignItems: 'center', gap: space(1), marginTop: space(1), flexWrap: 'wrap' },
    ratingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.7)',
      paddingHorizontal: space(1.25),
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    ratingPillText: { fontWeight: '800' },
    salonPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.7)',
      paddingHorizontal: space(1.25),
      paddingVertical: 6,
      borderRadius: radius.pill,
      maxWidth: 190,
    },
    salonPillText: { flexShrink: 1, fontWeight: '600' },
    heroPortrait: {
      width: 128,
      height: 168,
      borderRadius: radius.lg,
      borderWidth: 3,
      borderColor: colors.surface,
      backgroundColor: colors.bgSunken,
    },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      marginTop: 0,
      paddingHorizontal: space(3),
      paddingTop: space(3),
    },
    about: { lineHeight: 21 },
    section: { marginTop: space(3), marginBottom: space(1.5), fontSize: 17 },
    services: { gap: space(1.25) },
    dateCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(2) },
    service: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
    },
    serviceActive: { backgroundColor: colors.accentSoft },
    serviceText: { flex: 1 },
    check: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: { backgroundColor: colors.accent },
    chipRow: { gap: space(1), paddingRight: space(3) },
    dayChip: {
      width: 58,
      alignItems: 'center',
      paddingVertical: space(1.25),
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    dayChipOn: { backgroundColor: colors.accent },
    dayNum: { fontSize: 18, fontWeight: '800', marginTop: 2 },
    timeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    timeChip: {
      paddingHorizontal: space(2),
      paddingVertical: space(1.25),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    timeChipOn: { backgroundColor: colors.accent },
    timeText: { fontWeight: '700' },
    cta: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      backgroundColor: colors.bg,
    },
    ctaBtn: {
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
