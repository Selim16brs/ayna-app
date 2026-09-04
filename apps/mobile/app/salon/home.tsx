import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type SupplierAd } from '../../src/data';
import { useSalonStaff } from '../../src/staff';
import { TepeIsigi, OccupancyStrip } from '../../src/ui';
import { greetingKey } from '../../src/greeting';
import { useLocale } from '../../src/locale';
import { selectUnreadCount, useStore } from '../../src/store';
import { type ColorTokens, radius, space, font } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { PressableScale, Screen, TAB_BAR_CLEARANCE, Text, TierUpsell } from '../../src/ui';

// §10.1 — SALON dashboard: kadro-merkezli. Üstte salon kapak fotoğrafı; yönetim öğeleri Profil'de.
export default function SalonHomeScreen() {
  /*
   * SALON PANELİ de aynı kapıya sahip: müşteri hesabı buraya düşerse
   * hesabının türü değişmiş gibi görünür (bkz. `seller/reports`).
   */
  const rol = useStore((s) => s.currentUser?.role);
  const satici = rol === 'professional' || rol === 'salon';
  if (rol && !satici) return <Redirect href="/discover" />;

  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const salonName = useStore((s) => s.currentUser?.name) ?? 'Salon';
  const unread = useStore(selectUnreadCount);
  const avatarUri = useStore((s) => s.avatarUri);
  const setAvatar = useStore((s) => s.setAvatar);
  // Faz C — GERÇEK kadro (davet koduyla bağlı uzmanlar); mock Madina/Aigerim yok.
  const { staff } = useSalonStaff();
  const ads: SupplierAd[] = []; // demo tedarikçi reklamı YOK (admin ucu bağlanınca gerçek veri)

  // §10.1 — salon kapak fotoğrafı: uzman profil fotosuyla AYNI yerden (avatar) düzenlenebilir
  const editCover = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.35,
      base64: true,
    });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      setAvatar(a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri);
    }
  };

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ═══ BAŞLIK — kanvas SalonPanel.dc.html §başlık ═══
            Kanvas: AÇIK porselen zemin, 54'lük avatar, koyu başlık, beyaz
            44'lük düğmeler. Önceki sürüm 240px koyu kapak fotoğrafı üstünde
            beyaz metindi — kanvasla ilgisi yoktu.
            Kapak düzenleme işlevi KORUNDU: avatara dokunmak aynı akışı açıyor. */}
        <View style={[styles.header, { paddingTop: insets.top + space(1.5) }]}>
          {/* Tepe ışığı İÇERİDE: başlığın kendi zemini dışarıdakini kapatırdı. */}
          <TepeIsigi />
          <PressableScale
            style={styles.avatarBtn}
            onPress={editCover}
            accessibilityRole="button"
            accessibilityLabel={t('salon.cover.edit')}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} resizeMode="cover" />
            ) : (
              <Ionicons name="business" size={22} color={colors.accent} />
            )}
            <View style={styles.avatarCam}>
              <Ionicons name="camera" size={11} color={colors.onAccent} />
            </View>
          </PressableScale>

          <View style={styles.headerText}>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {t(greetingKey())} · {t('reports.identity.salon')}
            </Text>
            <Text variant="h1" tone="ink" style={styles.headerName} numberOfLines={1}>
              {salonName}
            </Text>
          </View>

          <PressableScale
            style={[styles.circleBtn, shadow.soft]}
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel={t('notifications.title')}
          >
            <Ionicons name="notifications-outline" size={18} color={colors.ink} />
            {unread > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : String(unread)}</Text>
              </View>
            ) : null}
          </PressableScale>
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

          {/* KOLTUK DOLULUK — salon sahibinin gerçek işi boş koltuğu doldurmak.
              Bugünün randevularından SAAT SAAT hesaplanır; boş saatler işaretlenir. */}
          <View style={styles.occupancy}>
            <OccupancyStrip salonName={salonName} />
          </View>

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
            {staff.length === 0 ? (
              /* Faz C — dürüst boş-durum: kadro yok → davet koduyla uzman ekle */
              <PressableScale
                style={[styles.staffCard, shadow.soft]}
                onPress={() => router.push('/seller/codes')}
              >
                <View style={[styles.staffImg, styles.staffInitial]}>
                  <Ionicons name="person-add-outline" size={22} color={colors.inkSoft} />
                </View>
                <View style={styles.staffInfo}>
                  <Text variant="bodyStrong" tone="ink">
                    {t('salon.staff.empty_t')}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {t('salon.staff.empty_b')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </PressableScale>
            ) : (
              staff.map((u) => (
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
                  {u.image ? (
                    <Image source={{ uri: u.image }} style={styles.staffImg} />
                  ) : (
                    <View style={[styles.staffImg, styles.staffInitial]}>
                      <Text variant="bodyStrong" tone="inkSoft">
                        {u.name.charAt(0).toLocaleUpperCase('tr-TR')}
                      </Text>
                    </View>
                  )}
                  <View style={styles.staffInfo}>
                    <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                      {u.name}
                    </Text>
                    {/* Gerçek geçmiş birikene kadar sahte metrik YOK — dürüst "yeni" etiketi */}
                    <Text variant="caption" tone="muted">
                      {u.bookings > 0
                        ? `${u.bookings}${u.rating !== null ? ` · ${u.rating.toFixed(1)}` : ''}`
                        : t('salon.staff.new')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </PressableScale>
              ))
            )}
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

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingBottom: TAB_BAR_CLEARANCE + space(2) },
    occupancy: { paddingHorizontal: space(2.5), marginTop: space(2) },
    flex: { flex: 1 },
    // Kapak foto hero
    // Kanvas §başlık — açık zeminde 54'lük avatar + koyu başlık + beyaz düğme.
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(2.5),
      paddingBottom: space(1),
    },
    avatarBtn: {
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
    },
    avatarImg: { width: 54, height: 54, borderRadius: 18 },
    avatarCam: {
      position: 'absolute',
      right: -3,
      bottom: -3,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.bg,
    },
    headerText: { flex: 1, minWidth: 0, gap: 2 },
    headerName: { letterSpacing: -0.5 },
    circleBtn: {
      width: 44,
      height: 44,
      borderRadius: 15,
      // Koyu kapak fotoğrafı kalktı; yarı saydam siyah açık zeminde kaybolurdu.
      backgroundColor: colors.surface,
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
      backgroundColor: colors.rose,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bellBadgeText: {
      // Rozet zemini sabit gül (#D97798) — üstünde KOYU yazı her iki temada
      // da okunur; beyaz yazı 1.9:1 ile okunmuyordu.
      color: colors.ink,
      fontSize: 10,
      lineHeight: 12,
      fontFamily: font.semibold,
      includeFontPadding: false,
    },
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
    upsellCta: { fontFamily: font.semibold, marginTop: 3 },
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
    seeAll: { fontFamily: font.semibold },
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
    staffInitial: { alignItems: 'center', justifyContent: 'center' },
    staffInfo: { flex: 1, gap: space(0.75) },
    perfRow: { flexDirection: 'row', gap: space(0.75), flexWrap: 'wrap' },
    perfChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: space(0.75),
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    perfVal: { fontFamily: font.semibold, fontSize: 11 },
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
    adBrand: { color: 'rgba(255,255,255,0.85)', fontFamily: font.semibold, letterSpacing: 0.2 },
    adTitle: { color: colors.onColor, fontSize: 16, lineHeight: 20 },
    adCta: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      marginTop: space(1),
      backgroundColor: colors.onColor,
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
    },
    adCtaText: { color: colors.ink, fontFamily: font.semibold },
  });
