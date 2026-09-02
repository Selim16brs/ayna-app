import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import {
  formatPrice,
  CATEGORIES,
  cityCenter,
  distanceKm,
  priceLabel,
  type Professional,
  proCoords,
} from '../src/data';
import { useProfessionals } from '../src/catalog';
import { useStore } from '../src/store';
import { useLocale } from '../src/locale';
import { type ColorTokens, radius, space, font } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { useProfessionalDetail } from '../src/catalog';
import { asPlanTier, PlanBadge, PressableScale, Screen, StackHeader, Text } from '../src/ui';

export default function MapScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const all = useProfessionals();
  // §5.1.4 — harita da şehre göre filtreli (salona bağlı uzmanlar zaten listede tek başına yok)
  const city = useStore((s) => s.currentUser?.city) ?? 'Almatı';
  const [cat, setCat] = useState<string | null>(null);
  const [selected, setSelected] = useState<Professional | null>(null);
  // §5.1.3 — karta dokun → POPUP profil (kapatınca haritaya dönülür)
  const [profileOpen, setProfileOpen] = useState(false);
  const detail = useProfessionalDetail(selected?.id ?? '');

  // Harita seçili ŞEHRİN merkezine odaklanır (Almatı seçince Almatı, Astana seçince Astana).
  const center = cityCenter(city);
  const region: Region = { ...center, latitudeDelta: 0.14, longitudeDelta: 0.14 };

  const pros = useMemo(
    () => all.filter((p) => p.city === city && (!cat || p.sector === cat)),
    [all, city, cat],
  );

  return (
    <Screen edges={[]}>
      <View style={styles.headerRow}>
        <StackHeader title={t('map.title')} />
        <PressableScale style={styles.listBtn} onPress={() => router.replace('/search')}>
          <Ionicons name="list" size={16} color={colors.ink} />
          <Text variant="caption" tone="ink">
            {t('map.list')}
          </Text>
        </PressableScale>
      </View>

      {/* Kategori filtresi */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsWrap}
      >
        <Chip label={t('map.all')} active={cat === null} onPress={() => setCat(null)} />
        {CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            label={t(c.labelKey)}
            active={cat === c.id}
            onPress={() => setCat(cat === c.id ? null : c.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.mapWrap}>
        <MapView
          key={city}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton
        >
          {pros.map((p) => (
            <Marker
              key={p.id}
              coordinate={proCoords(p.id, p.lat, p.lng)}
              // §5.1.3 — salon vs bağımsız uzman pinleri görsel ayrı
              pinColor={p.kind === 'salon' ? colors.accentFg : colors.blue}
              onPress={() => setSelected(p)}
            />
          ))}
        </MapView>

        {/* Teklif motoru köprüsü (denge kuralı §7.4) */}
        {!selected ? (
          <PressableScale style={styles.bridge} onPress={() => router.push('/quote/new')}>
            <Ionicons name="sparkles" size={15} color={colors.onAccent} />
            <Text variant="caption" tone="onAccent" style={styles.bridgeText} numberOfLines={2}>
              {t('map.bridge')}
            </Text>
          </PressableScale>
        ) : null}

        {/* Seçili sağlayıcı mini kartı — kenarlıksız gölgeli SalonRow dili */}
        {selected ? (
          <>
            {/* Polish 3.4 — kart DIŞINA dokunma kapatır (küçük X'e nişan almak gerekmez) */}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelected(null)}
              accessibilityRole="button"
              accessibilityLabel="Kartı kapat"
            />
            <View style={[styles.card, styles.cardShadow]}>
              <Pressable
                style={styles.cardClose}
                hitSlop={16}
                onPress={() => setSelected(null)}
                accessibilityRole="button"
                accessibilityLabel="Kapat"
              >
                <Ionicons name="close" size={16} color={colors.muted} />
              </Pressable>
              <Pressable style={styles.cardRow} onPress={() => setProfileOpen(true)}>
                <Image source={{ uri: selected.image }} style={styles.cardImage} />
                <View style={styles.cardBody}>
                  <Text variant="bodyStrong" tone="ink" style={styles.cardName} numberOfLines={1}>
                    {selected.name}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {selected.specialty}
                  </Text>
                  <View style={styles.cardMeta}>
                    <Ionicons name="star" size={12} color={colors.gold} />
                    <Text variant="caption" tone="inkSoft">
                      {selected.rating.toFixed(1)}
                    </Text>
                    <Text variant="caption" tone="muted">
                      · {distanceKm(center, proCoords(selected.id, selected.lat, selected.lng))}{' '}
                      {t('map.distance')}
                    </Text>
                    <Text variant="caption" tone="muted">
                      · {priceLabel(selected)}
                    </Text>
                  </View>
                </View>
              </Pressable>
              <PressableScale style={styles.cardBtn} onPress={() => setProfileOpen(true)}>
                <Text variant="bodyStrong" tone="onAccent">
                  {t('map.open')}
                </Text>
              </PressableScale>
            </View>
          </>
        ) : null}

        {/* §5.1.3 — POPUP profil: bilgiler modal'da; kapatınca harita aynen kalır */}
        <Modal
          visible={profileOpen && !!selected}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setProfileOpen(false)}
        >
          <View style={styles.sheetRoot}>
            <View style={styles.sheetHead}>
              <Text variant="h2" tone="ink" numberOfLines={1} style={styles.sheetTitle}>
                {selected?.name ?? ''}
              </Text>
              <Pressable
                style={styles.sheetClose}
                hitSlop={8}
                onPress={() => setProfileOpen(false)}
              >
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.sheetBody}
              showsVerticalScrollIndicator={false}
            >
              {selected?.image || detail.image ? (
                <Image
                  source={{ uri: detail.image || selected?.image }}
                  style={styles.sheetPhoto}
                  resizeMode="cover"
                />
              ) : null}
              <Text variant="bodyStrong" tone="ink">
                {detail.specialty || selected?.specialty}
              </Text>

              {/* GÜVEN ŞERİDİ — sayfanın en üstünde, adın hemen altında.
                  Haritadan bakan kişi "buna güvenir miyim, ne kadar tutar,
                  ne kadar deneyimli" sorularına cevap arıyor; eskiden sayfa
                  bunların HİÇBİRİNİ vermiyordu: fotoğraf, mesafe, puan ve
                  hizmet listesiyle bitiyordu. Doğrulama ve paket ancak tam
                  profile geçince görünüyordu. */}
              {detail.aynaVerified ||
              (detail.membershipTier && detail.membershipTier !== 'free') ? (
                <View style={styles.sheetBadges}>
                  {detail.aynaVerified ? (
                    <View style={styles.sheetVerified}>
                      <Ionicons name="shield-checkmark" size={13} color={colors.onAccent} />
                      <Text variant="caption" tone="onAccent" style={styles.sheetVerifiedText}>
                        {t('verify.ayna')}
                      </Text>
                    </View>
                  ) : null}
                  {detail.membershipTier && detail.membershipTier !== 'free' ? (
                    <PlanBadge tier={asPlanTier(detail.membershipTier)} size="sm" role="pro" />
                  ) : null}
                </View>
              ) : null}
              <View style={styles.sheetMeta}>
                <Ionicons name="location-outline" size={14} color={colors.inkSoft} />
                <Text variant="caption" tone="inkSoft">
                  {selected
                    ? `${selected.city || city} · ${distanceKm(center, proCoords(selected.id, selected.lat, selected.lng))} ${t('map.distance')}`
                    : ''}
                </Text>
                {detail.reviewCount > 0 ? (
                  <>
                    <Ionicons name="star" size={14} color={colors.gold} />
                    <Text variant="caption" tone="inkSoft">
                      {detail.rating.toFixed(1)} ({detail.reviewCount})
                    </Text>
                  </>
                ) : (
                  <Text variant="caption" tone="muted">
                    ✨ {t('pro.new')}
                  </Text>
                )}
              </View>
              {/* KÜNYE — deneyim ve başlangıç fiyatı. Fiyat özellikle önemli:
                  hizmet listesi aşağıda ama kullanıcı oraya inmeden önce
                  "bu benim bütçemde mi" sorusunun cevabını görmeli. */}
              <View style={styles.sheetFacts}>
                {detail.experienceYears > 0 ? (
                  <View style={styles.sheetFact}>
                    <Ionicons name="ribbon-outline" size={14} color={colors.accentFg} />
                    <Text variant="caption" tone="inkSoft">
                      {detail.experienceYears} {t('pro.experience')}
                    </Text>
                  </View>
                ) : null}
                {Number(detail.priceFrom) > 0 ? (
                  <View style={styles.sheetFact}>
                    <Ionicons name="pricetag-outline" size={14} color={colors.accentFg} />
                    <Text variant="caption" tone="inkSoft">
                      {formatPrice(Number(detail.priceFrom))} {t('map.from')}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* W2W sinyali — AYNA'nın çekirdeği. Tanıdığının gittiği yer,
                  yıldız ortalamasından daha çok karar verdiriyor. */}
              {detail.friends ? (
                <View style={styles.sheetFriends}>
                  <Ionicons name="people" size={13} color={colors.ink} />
                  <Text variant="caption" tone="ink" style={styles.sheetFriendsText}>
                    {detail.friends} {t('pro.friends_here')}
                  </Text>
                </View>
              ) : null}

              {detail.about ? (
                <>
                  <Text variant="label" tone="accentFg" style={styles.sheetSection}>
                    {t('pro.about')}
                  </Text>
                  <Text variant="caption" tone="inkSoft" style={styles.sheetAbout}>
                    {detail.about}
                  </Text>
                </>
              ) : null}
              {detail.services.length > 0 ? (
                <>
                  <Text variant="label" tone="accentFg" style={styles.sheetSection}>
                    {t('pro.services')}
                  </Text>
                  {detail.services.slice(0, 6).map((sv) => (
                    <View key={sv.id} style={styles.sheetSvcRow}>
                      <Text
                        variant="caption"
                        tone="ink"
                        style={styles.sheetSvcName}
                        numberOfLines={1}
                      >
                        {sv.name}
                      </Text>
                      <Text variant="caption" tone="inkSoft">
                        {formatPrice(sv.price)}
                      </Text>
                    </View>
                  ))}
                </>
              ) : null}
            </ScrollView>
            <View style={styles.sheetFoot}>
              <PressableScale
                style={styles.cardBtn}
                onPress={() => {
                  setProfileOpen(false);
                  if (selected) router.push('/professional/' + selected.id);
                }}
              >
                <Text variant="bodyStrong" tone="onAccent">
                  {t('map.book')}
                </Text>
              </PressableScale>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text variant="caption" tone={active ? 'onAccent' : 'inkSoft'} style={styles.chipText}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    sheetRoot: { flex: 1, backgroundColor: colors.bg },
    sheetHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space(3),
      paddingTop: space(2.5),
      paddingBottom: space(1),
    },
    sheetTitle: { flex: 1, marginRight: space(1) },
    sheetClose: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetBody: { paddingHorizontal: space(3), paddingBottom: space(3), gap: space(1) },
    sheetPhoto: {
      width: '100%',
      height: 220,
      borderRadius: radius.xl,
      backgroundColor: colors.surfaceMuted,
    },
    sheetMeta: { flexDirection: 'row', alignItems: 'center', gap: space(0.75), flexWrap: 'wrap' },
    sheetBadges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: space(0.75),
      marginTop: space(0.75),
    },
    sheetVerified: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.5),
      paddingHorizontal: space(1),
      paddingVertical: space(0.375),
      borderRadius: radius.pill,
      backgroundColor: colors.accentFg,
    },
    sheetVerifiedText: { fontFamily: font.semibold },
    sheetFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5), marginTop: space(1) },
    sheetFact: { flexDirection: 'row', alignItems: 'center', gap: space(0.5) },
    sheetFriends: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.5),
      alignSelf: 'flex-start',
      marginTop: space(1),
      paddingHorizontal: space(1),
      paddingVertical: space(0.5),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    sheetFriendsText: { fontFamily: font.semibold },
    sheetSection: { marginTop: space(1.5) },
    sheetAbout: { lineHeight: 19 },
    sheetSvcRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: space(1),
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    sheetSvcName: { flex: 1, marginRight: space(1) },
    sheetFoot: { padding: space(3), paddingTop: space(1) },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    listBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginRight: space(3),
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    chipsWrap: { maxHeight: 58 },
    chips: { paddingHorizontal: space(3), gap: space(1), paddingVertical: space(1) },
    chip: {
      paddingHorizontal: space(2),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    chipActive: { backgroundColor: colors.accent },
    chipText: { fontFamily: font.semibold },
    mapWrap: { flex: 1, overflow: 'hidden' },
    bridge: {
      position: 'absolute',
      top: space(1.5),
      left: space(2),
      right: space(2),
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      paddingHorizontal: space(2),
      paddingVertical: space(1.25),
    },
    bridgeText: { flex: 1 },
    card: {
      position: 'absolute',
      left: space(3),
      right: space(3),
      bottom: space(3),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1.75),
    },
    cardShadow: {
      shadowColor: colors.ink,
      shadowOpacity: 0.16,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },
    cardClose: {
      position: 'absolute',
      top: space(1.25),
      right: space(1.25),
      zIndex: 2,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardRow: { flexDirection: 'row', gap: space(1.5), alignItems: 'center' },
    cardImage: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.bgSunken },
    cardName: { fontSize: 16, fontFamily: font.semibold, letterSpacing: -0.2 },
    cardBody: { flex: 1, gap: 3 },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
      flexWrap: 'wrap',
    },
    cardBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      paddingVertical: space(1.5),
      alignItems: 'center',
    },
  });
