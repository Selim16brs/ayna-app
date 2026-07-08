import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SEED_SUPPLIER_ADS, SELLER_DATA, type SupplierAd } from '../../src/data';
import { greetingKey } from '../../src/greeting';
import { useLocale } from '../../src/locale';
import { selectUnreadCount, useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { PressableScale, Screen, TAB_BAR_CLEARANCE, Text, TierUpsell } from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

// §10.1 — SALON dashboard: kadro-merkezli. Üstte salon kapak fotoğrafı; yönetim öğeleri Profil'de.
export default function SalonHomeScreen() {
  const { t } = useLocale();
  const { colors, gradients, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const salonName = useStore((s) => s.currentUser?.name) ?? 'Salon';
  const unread = useStore(selectUnreadCount);
  const avatarUri = useStore((s) => s.avatarUri);
  const setAvatar = useStore((s) => s.setAvatar);
  const staff = SELLER_DATA.month.staff;
  const city = useStore((s) => s.currentUser?.city) ?? 'Almatı';
  const ads = SEED_SUPPLIER_ADS.filter((a) => !a.city || a.city === city);

  // §10.1 — salon kapak fotoğrafı: uzman profil fotosuyla AYNI yerden (avatar) düzenlenebilir
  const editCover = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) setAvatar(res.assets[0].uri);
  };

  const perf = (name: string, rating: number) => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    return { occupancy: 60 + (Math.abs(h) % 38), response: 8 + (Math.abs(h >> 3) % 34), rating };
  };

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Salon kapak fotoğrafı (düzenlenebilir) + kimlik + karşılama */}
        <View style={styles.hero}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.accent }]} />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.72)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroTop, { paddingTop: insets.top + space(1) }]}>
            <View style={styles.bindingPill}>
              <Ionicons name="business" size={12} color="#FFFFFF" />
              <Text variant="caption" style={styles.bindingText} numberOfLines={1}>
                {t('reports.identity.salon')}
              </Text>
            </View>
            <View style={styles.heroTopRight}>
              <PressableScale style={styles.circleBtn} onPress={editCover}>
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              </PressableScale>
              <PressableScale
                style={styles.circleBtn}
                onPress={() => router.push('/notifications')}
              >
                <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
                {unread > 0 ? (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : String(unread)}</Text>
                  </View>
                ) : null}
              </PressableScale>
            </View>
          </View>
          <View style={styles.heroBottom}>
            <Text variant="caption" style={styles.heroGreet}>
              {t(greetingKey())}
            </Text>
            <Text variant="display" style={styles.heroName} numberOfLines={1}>
              {salonName}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* §10 gizlilik — salon panelinde gelir/komisyon GÖSTERİLMEZ (uzmanın şahsi para alanı) */}

          {/* §11 — katman-farkında üyelik teşviki (free → Premium/Platinum, premium → Platinum) */}
          <TierUpsell />

          {/* §5.1.6 tarzı — sponsorlu tedarikçi reklamları (uzman performanslarının ÜSTÜNDE) */}
          {ads.length > 0 ? (
            <>
              <View style={styles.adsHead}>
                <Text variant="label" tone="accentFg">
                  {t('seller.ads.title')}
                </Text>
                <View style={styles.sponsoredTag}>
                  <Ionicons name="pricetag" size={9} color={colors.muted} />
                  <Text variant="caption" tone="muted" style={styles.sponsoredText}>
                    {t('seller.ads.sponsored')}
                  </Text>
                </View>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.adsRow}
              >
                {ads.map((ad) => (
                  <AdCard key={ad.id} ad={ad} />
                ))}
              </ScrollView>
            </>
          ) : null}

          {/* §10.1 — uzman performansları (çekirdek). Reklam bloğundan NET ayrım için ayırıcı + accent başlık */}
          <View style={styles.sectionDivider} />
          <View style={styles.sectionHead}>
            <View style={styles.sectionTitleWrap}>
              <View style={styles.sectionAccent} />
              <View style={styles.flex}>
                <Text variant="bodyStrong" tone="ink">
                  {t('salon.home.staff_title')}
                </Text>
                <Text variant="caption" tone="muted" style={styles.sectionSub}>
                  {t('salon.home.staff_sub')}
                </Text>
              </View>
            </View>
            <PressableScale onPress={() => router.push('/salon/staff')} style={styles.seeAllBtn}>
              <Text variant="caption" tone="accentFg" style={styles.seeAll}>
                {t('salon.quick.staff')}
              </Text>
              <Ionicons name="chevron-forward" size={13} color={colors.accentFg} />
            </PressableScale>
          </View>
          <View style={styles.staffList}>
            {staff.map((u) => {
              const p = perf(u.name, u.rating);
              return (
                <PressableScale
                  key={u.name}
                  style={[styles.staffCard, shadow.soft]}
                  onPress={() =>
                    router.push({
                      pathname: '/seller/staff',
                      params: {
                        name: u.name,
                        image: u.image,
                        bookings: String(u.bookings),
                        rating: String(u.rating),
                      },
                    })
                  }
                >
                  <Image source={{ uri: u.image }} style={styles.staffImg} />
                  <View style={styles.staffInfo}>
                    <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                      {u.name}
                    </Text>
                    <View style={styles.perfRow}>
                      <PerfChip
                        icon="star"
                        tint={colors.gold}
                        value={p.rating.toFixed(1)}
                        label={t('salon.metric.rating')}
                      />
                      <PerfChip
                        icon="pie-chart"
                        tint={colors.accentFg}
                        value={`%${p.occupancy}`}
                        label={t('salon.metric.occupancy')}
                      />
                      <PerfChip
                        icon="time"
                        tint={colors.inkSoft}
                        value={`${p.response}dk`}
                        label={t('salon.metric.response')}
                      />
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </PressableScale>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function AdCard({ ad }: { ad: SupplierAd }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  return (
    <PressableScale style={styles.adCard} onPress={() => router.push(`/ad/${ad.id}`)}>
      <Image source={{ uri: ad.imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(20,18,22,0)', 'rgba(20,18,22,0.35)', 'rgba(20,18,22,0.88)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.adSponsor}>
        <Text variant="caption" style={styles.adSponsorText}>
          {t('seller.ads.sponsored')}
        </Text>
      </View>
      <View style={styles.adInfo}>
        <Text variant="caption" style={styles.adBrand} numberOfLines={1}>
          {ad.brand}
        </Text>
        <Text variant="bodyStrong" style={styles.adTitle} numberOfLines={2}>
          {ad.title}
        </Text>
        <View style={styles.adCta}>
          <Text variant="caption" style={styles.adCtaText}>
            {ad.ctaLabel}
          </Text>
          <Ionicons name="arrow-forward" size={12} color={colors.ink} />
        </View>
      </View>
    </PressableScale>
  );
}

function PerfChip({
  icon,
  tint,
  value,
  label,
}: {
  icon: IoniconName;
  tint: string;
  value: string;
  label: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.perfChip}>
      <Ionicons name={icon} size={11} color={tint} />
      <Text variant="caption" tone="ink" style={styles.perfVal}>
        {value}
      </Text>
      <Text variant="caption" tone="muted" style={styles.perfLbl}>
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingBottom: TAB_BAR_CLEARANCE + space(2) },
    flex: { flex: 1 },
    // Kapak foto hero
    hero: { height: 240, position: 'relative', justifyContent: 'space-between' },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space(2.5),
    },
    heroTopRight: { flexDirection: 'row', gap: space(1) },
    bindingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(0,0,0,0.4)',
      paddingHorizontal: space(1.25),
      paddingVertical: space(0.5),
      borderRadius: radius.pill,
    },
    bindingText: { color: '#FFFFFF', fontWeight: '700' },
    circleBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bellBadge: {
      position: 'absolute',
      top: -3,
      right: -3,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: '#FF2E93',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bellBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '800',
      includeFontPadding: false,
    },
    heroBottom: { paddingHorizontal: space(3), paddingBottom: space(2.5) },
    heroGreet: { color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
    heroName: { color: '#FFFFFF', letterSpacing: -0.3 },
    body: { paddingHorizontal: space(3), paddingTop: space(2) },
    upsell: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
      marginBottom: space(2.5),
    },
    upsellIcon: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    upsellCta: { fontWeight: '800', marginTop: 3 },
    sectionDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.line,
      marginTop: space(3.5),
      marginBottom: space(2.5),
    },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: space(1.75),
    },
    sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: space(1.25), flex: 1 },
    sectionAccent: { width: 3, height: 30, borderRadius: 2, backgroundColor: colors.accentFg },
    seeAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: colors.accentSoft,
      paddingLeft: space(1.25),
      paddingRight: space(0.75),
      paddingVertical: space(0.5),
      borderRadius: radius.pill,
    },
    seeAll: { fontWeight: '700' },
    sectionSub: { marginTop: 1 },
    staffList: { gap: space(1.25) },
    staffCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.5),
    },
    staffImg: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surfaceMuted },
    staffInfo: { flex: 1, gap: space(0.75) },
    perfRow: { flexDirection: 'row', gap: space(0.75), flexWrap: 'wrap' },
    perfChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: space(0.75),
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    perfVal: { fontWeight: '800', fontSize: 11 },
    perfLbl: { fontSize: 10 },
    // reklamlar
    adsHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      marginTop: space(3),
      marginBottom: space(1.25),
    },
    sponsoredTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: space(0.75),
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    sponsoredText: { fontSize: 10, letterSpacing: 0.2 },
    adsRow: { gap: space(1.5), paddingRight: space(1), paddingBottom: space(1) },
    adCard: {
      width: 290,
      height: 168,
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: colors.surfaceMuted,
      justifyContent: 'flex-end',
    },
    adSponsor: {
      position: 'absolute',
      top: space(1),
      right: space(1),
      backgroundColor: 'rgba(0,0,0,0.45)',
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    adSponsorText: { color: 'rgba(255,255,255,0.9)', fontSize: 9, letterSpacing: 0.3 },
    adInfo: { padding: space(2), gap: 2 },
    adBrand: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', letterSpacing: 0.2 },
    adTitle: { color: '#FFFFFF', fontSize: 16, lineHeight: 20 },
    adCta: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      marginTop: space(1),
      backgroundColor: '#FFFFFF',
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
    },
    adCtaText: { color: colors.ink, fontWeight: '800' },
  });
