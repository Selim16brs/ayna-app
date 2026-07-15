import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFonts } from 'expo-font';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES } from '../../src/data';
import { useCampaigns, useOffers, useProfessionals } from '../../src/catalog';
import { greetingKey } from '../../src/greeting';
import { useLocale } from '../../src/locale';
import { selectUnreadCount, useStore } from '../../src/store';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  LampIcon,
  Marquee,
  PressableScale,
  SalonRow,
  Screen,
  Text,
  TextInput,
  WaveLayered,
} from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

// Kategori daire zeminleri (spec §0.1) — pastel + ink ikon
const HOT_PINK = '#FF2E93'; // "Ne yapmak istersin?" kartı — çırtlak pembe
// Canlı kategori renkleri (pembe/yeşil gibi doygun) — Saç·Cilt·Nail·Makyaj·Spa·Diğer
const CAT_TINTS = ['#FF2E93', '#C6E24B', '#B06CFF', '#FF8A3D', '#3FC5F0', '#2ED9B0'];
// Yatay kaydırmalı kart ölçüsü (Fırsatlar / Öne çıkanlar — profesyonel foto kartı)
const PROMO_W = Math.round(Dimensions.get('window').width * 0.72);
const PROMO_H = 168;

// Ana sayfa kategori seti = MERKEZİ taksonomideki AKTİF kategoriler (CATEGORIES). "Diğer" yok.

export default function DiscoverScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const campaigns = useCampaigns();
  const offers = useOffers();
  const city = useStore((s) => s.currentUser?.city) ?? 'Almatı';
  const unread = useStore(selectUnreadCount);
  // §fix — boş isimde de fallback (|| ; '' ?? x boş string'e düşmez → Keşfet ismi boş görünüyordu)
  const userName =
    useStore((s) => s.currentUser?.name)
      ?.trim()
      .split(' ')[0] || '';
  const cutoutUri = useStore((s) => s.cutoutUri); // §5.1.1 — premium cut-out profil fotosu
  const avatarUri = useStore((s) => s.avatarUri); // cut-out yoksa yüklenen ham foto
  // Dinamik kullanıcı adı — ilk harf büyük (el yazısı katman için)
  const displayName = userName.charAt(0).toLocaleUpperCase('tr-TR') + userName.slice(1);
  // §fix — Caveat el yazısı fontu geç yüklenince isim önce SİSTEM fontuyla yanıp sönüyordu.
  // Font hazır olana kadar ismi gizle (yer korunur), hazır olunca göster: FOUT biter.
  const [caveatReady] = useFonts({ Caveat_700Bold });
  const pros = useProfessionals();
  // §5.1.4 — şehir tüm Keşfet'i filtreler
  const cityPros = pros.filter((p) => p.city === city);
  // §5.1.7 REVİZE — Öne Çıkanlar SPONSORLU alan: yalnız admin panelinden ⭐ işaretlenenler
  // (badge 'campaign'); otomatik doldurma YOK — admin seçmediyse bölüm görünmez.
  const featured = cityPros.filter((p) => p.badge === 'campaign').slice(0, 6);
  // §5.1.8 Sana Yakın: premium salon önce; YETMEZSE diğer salonlar + bağımsız uzmanlar
  // (yeni pazarda salon az olabilir — kayıtlı uzmanlar da keşfette görünsün). Günlük rotasyon.
  const nearby = useMemo(() => {
    const salons = cityPros.filter((p) => p.kind === 'salon');
    const experts = cityPros.filter((p) => p.kind !== 'salon');
    const premium = salons.filter((p) => p.isPremium);
    const pool =
      premium.length >= 3
        ? premium
        : [...premium, ...salons.filter((p) => !p.isPremium), ...experts];
    if (pool.length === 0) return [];
    // Günlük rotasyon: aynı 3 salon kilitlenmez (premium satış değeri korunur)
    const offset = Math.floor(Date.now() / (24 * 60 * 60_000)) % pool.length;
    return Array.from(
      { length: Math.min(3, pool.length) },
      (_, i) => pool[(offset + i) % pool.length]!,
    );
  }, [cityPros]);
  const cityEmpty = cityPros.length === 0;
  const [query, setQuery] = useState('');

  function runSearch() {
    const q = query.trim();
    router.push(q ? { pathname: '/search', params: { q } } : '/search');
  }

  return (
    <Screen edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* ── LIME HERO (referans: dalgalı kesim + gerçek foto) ── */}
        <View style={[styles.hero, { paddingTop: insets.top + space(1) }]}>
          {/* Üst satır: logo SOLDA — sağda bildirim (şehir seçici "Dileğin Nedir?" yanına taşındı) */}
          <View style={styles.heroTop}>
            <Image
              source={require('../../assets/logo-ayna.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Pressable
              style={styles.bell}
              onPress={() => router.push('/notifications')}
              hitSlop={8}
            >
              <View style={styles.bellCircle}>
                <Ionicons name="notifications-outline" size={20} color={colors.ink} />
                {unread > 0 ? (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : unread}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          </View>

          {/* İkinci satır: uzun arama çubuğu — sağda harita (bildirimin altında hizalı blok) */}
          <View style={styles.searchRow}>
            <View style={styles.search}>
              <Ionicons name="search" size={17} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('home.search')}
                placeholderTextColor={colors.muted}
                returnKeyType="search"
                onSubmitEditing={runSearch}
                style={styles.searchInput}
              />
            </View>
            <Pressable style={styles.mapIconBtn} onPress={() => router.push('/map')}>
              <Ionicons name="map-outline" size={20} color={colors.ink} />
            </Pressable>
          </View>

          {/* Karşılama — solda büyük ve dikey ortalı; foto sağ altta (dalga keser) */}
          <View style={styles.heroBody}>
            <View style={styles.heroText}>
              <Text style={styles.greetLabel}>{t(greetingKey())}</Text>
              <Text
                style={[styles.greetName, { opacity: caveatReady ? 1 : 0 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {displayName}
              </Text>
            </View>
          </View>
          {/* §5.1.1 — premium cut-out foto varsa onu göster; yoksa varsayılan çizim */}
          {/* Sıfır-demo: kullanıcının KENDİ fotosu yoksa sahte model gösterilmez */}
          {cutoutUri || avatarUri ? (
            <Image
              source={{ uri: cutoutUri ?? avatarUri ?? '' }}
              style={styles.heroPhoto}
              resizeMode="contain"
            />
          ) : null}

          {/* Dalga geçişi — yeşilden beyaza (pembe DEĞİL; "Dileğin Nedir?" ayrı kart) */}
          <View style={styles.waveAbs}>
            <WaveLayered sliver={colors.bg} bottom={colors.bg} height={76} />
          </View>
        </View>

        {/* ── SOL: şehir seçici (beyaz alan, ortalı) — SAĞ: "Dileğin Nedir?" pembe kart ── */}
        <View style={styles.wishRow}>
          <View style={styles.wishLeft}>
            <Pressable style={styles.cityChip} onPress={() => router.push('/city')}>
              <Ionicons name="location" size={15} color={colors.ink} />
              <Text variant="caption" tone="ink" style={styles.cityText} numberOfLines={1}>
                {city}
              </Text>
              <Ionicons name="chevron-down" size={13} color={colors.ink} />
            </Pressable>
          </View>
          <PressableScale style={styles.wishCard} onPress={() => router.push('/quote')}>
            <View style={styles.wishIcon}>
              <LampIcon size={30} color={HOT_PINK} />
            </View>
            <View style={styles.wishText}>
              <Text variant="h2" tone="onColor" style={styles.wishTitle}>
                {t('home.how')}
              </Text>
              <Text variant="caption" tone="onColor" style={styles.wishSub} numberOfLines={2}>
                {t('home.how_sub')}
              </Text>
            </View>
          </PressableScale>
        </View>

        {/* ── Kayan slogan (Dileğin Nedir? ile kategoriler arasında) ── */}
        <Marquee text={t('home.marquee')} style={styles.marquee} />

        {/* ── KATEGORİLER (yatay kaydırmalı + animasyonlu, "Diğer" yok) ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {CATEGORIES.map((cat, i) => {
            const bg = CAT_TINTS[i % CAT_TINTS.length]!;
            return (
              <Animated.View key={cat.id} entering={FadeInDown.duration(360).delay(i * 55)}>
                <PressableScale
                  style={styles.cat}
                  onPress={() => router.push(`/category/${cat.id}` as never)}
                >
                  <View style={[styles.catTile, { backgroundColor: bg }, shadow.soft]}>
                    <Ionicons name={cat.icon as IoniconName} size={26} color="#FFFFFF" />
                  </View>
                  <Text variant="caption" tone="ink" style={styles.catLabel} numberOfLines={1}>
                    {t(cat.labelKey)}
                  </Text>
                </PressableScale>
              </Animated.View>
            );
          })}
        </ScrollView>

        {cityEmpty ? (
          /* §5.1.4 — hizmet veren olmayan şehir: boş durum (asla beyaz boşluk) */
          <View style={styles.cityEmpty}>
            <View style={styles.cityEmptyIcon}>
              <Ionicons name="rocket-outline" size={30} color={colors.rose} />
            </View>
            <Text variant="bodyStrong" tone="ink" style={styles.cityEmptyTitle}>
              {t('home.city_empty.title')}
            </Text>
            <Text variant="caption" tone="muted" style={styles.cityEmptySub}>
              {t('home.city_empty.sub')}
            </Text>
            <Pressable style={styles.cityEmptyCta} onPress={() => router.push('/city')}>
              <Ionicons name="notifications-outline" size={16} color={colors.onAccent} />
              <Text variant="caption" tone="onAccent" style={styles.cityEmptyCtaText}>
                {t('home.city_empty.cta')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* ── FIRSATLAR (tek satır, yatay kaydırmalı) ── */}
            <SectionHeader title={t('home.campaigns')} onSeeAll={() => router.push('/search')} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promoScroll}
            >
              {campaigns.map((c) => (
                <PromoCard
                  key={c.id}
                  title={c.title}
                  image={c.image}
                  sponsored
                  onPress={() => router.push(c.category ? '/category/' + c.category : '/search')}
                />
              ))}
            </ScrollView>

            {/* ── SALON/UZMAN KAMPANYALARI (Modül 2 — süreli indirimler) ── */}
            {offers.length > 0 ? (
              <>
                <SectionHeader title={t('offers.title')} onSeeAll={() => router.push('/offers')} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.promoScroll}
                >
                  {offers.slice(0, 8).map((o) => (
                    <PromoCard
                      key={o.id}
                      title={o.title}
                      image={
                        o.imageUrl ||
                        'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=60'
                      }
                      tag={
                        o.discountType === 'percent'
                          ? `-%${o.discountValue}`
                          : `${o.finalPrice.toLocaleString('tr-TR')} ₸`
                      }
                      onPress={() =>
                        router.push({
                          pathname: '/booking/schedule',
                          params: { proId: o.proId, offerId: o.id, source: 'direct' },
                        })
                      }
                    />
                  ))}
                </ScrollView>
              </>
            ) : null}

            {/* ── ÖNE ÇIKANLAR — SPONSORLU: yalnız admin'in seçtikleri; boşsa bölüm gizli ── */}
            {featured.length > 0 ? (
              <>
                <SectionHeader title={t('home.featured')} onSeeAll={() => router.push('/search')} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.promoScroll}
                >
                  {featured.map((pro) => (
                    <PromoCard
                      key={pro.id}
                      title={pro.name}
                      image={pro.image}
                      sponsored
                      tag={`★ ${pro.rating.toFixed(1)}`}
                      onPress={() => router.push('/professional/' + pro.id)}
                    />
                  ))}
                </ScrollView>
              </>
            ) : null}

            {/* ── SANA YAKIN SALONLAR (premium önce + rotasyon) ── */}
            <SectionHeader title={t('home.nearby')} onSeeAll={() => router.push('/nearby')} />
            <View style={styles.nearby}>
              {nearby.map((pro, i) => (
                <SalonRow key={pro.id} pro={pro} index={i} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.sectionHeader}>
      <Text variant="h2" tone="ink" style={styles.sectionTitle}>
        {title}
      </Text>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} style={styles.seeAll}>
          <Text variant="caption" tone="muted">
            {t('common.see_all')}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function PromoCard({
  title,
  image,
  onPress,
  sponsored,
  tag,
}: {
  title: string;
  image: string;
  onPress: () => void;
  sponsored?: boolean;
  tag?: string;
}) {
  const { t } = useLocale();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable style={styles.promoCard} onPress={onPress}>
      {/* Gerçek foto tam kadraj + altta okunabilirlik için koyu degrade (VELOURA offer kartı) */}
      <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(24,18,26,0)', 'rgba(24,18,26,0.10)', 'rgba(24,18,26,0.84)']}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Üst şerit: sol içerik etiketi + sağ sponsorlu */}
      {tag ? (
        <View style={styles.promoTag}>
          <Text style={styles.promoTagText}>{tag}</Text>
        </View>
      ) : null}
      {sponsored ? (
        <View style={styles.sponsorTag}>
          <Text style={styles.sponsorText}>{t('home.sponsored')}</Text>
        </View>
      ) : null}
      {/* Alt: başlık */}
      <View style={styles.promoContent}>
        <Text style={styles.promoCardTitle} numberOfLines={2}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingBottom: space(13) },

    // ── Lime hero ── (alt boşluk dengelendi: bant yukarı kaysın AMA alt yazı dalgada kesilmesin)
    hero: {
      backgroundColor: colors.accent,
      paddingHorizontal: space(3),
      paddingBottom: space(6),
      position: 'relative',
      overflow: 'hidden',
    },
    waveAbs: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2 },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    logo: { width: 132, height: 50 },
    topRight: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    bell: { justifyContent: 'center' },
    bellCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bellBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 19,
      height: 19,
      borderRadius: 9.5,
      paddingHorizontal: 4,
      backgroundColor: HOT_PINK,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
    },
    bellBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '800',
      textAlign: 'center',
      textAlignVertical: 'center',
      includeFontPadding: false,
    },
    mapIconBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cityChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      height: 44,
      paddingHorizontal: space(1.5),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
    },
    cityText: { fontWeight: '700', maxWidth: 74 },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.7)',
      backgroundColor: colors.bgSunken,
    },
    badge: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.rose,
      borderWidth: 2,
      borderColor: colors.accent,
    },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: space(1), marginTop: space(1.5) },
    search: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      paddingHorizontal: space(2),
    },
    searchText: { flex: 1 },
    searchInput: { flex: 1, fontSize: 14, fontWeight: '400', color: colors.ink, padding: 0 },
    mapChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 50,
      borderRadius: radius.pill,
      paddingHorizontal: space(2),
      borderWidth: 1.5,
      borderColor: 'rgba(32,36,15,0.35)',
    },
    mapChipText: { fontWeight: '700' },
    heroBody: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: space(2),
      minHeight: 185,
      zIndex: 2,
    },
    // Karşılama sola yaslı, dikey ORTALI ve BÜYÜK
    heroText: { flex: 1, justifyContent: 'center', paddingRight: space(1) },
    greetLabel: {
      fontSize: 26,
      lineHeight: 30,
      fontWeight: '500',
      letterSpacing: -0.4,
      color: '#1A1A1A',
      zIndex: 1,
    },
    greetName: {
      fontFamily: 'Caveat_700Bold',
      fontSize: 76,
      lineHeight: 74,
      color: '#FFFFFF',
      alignSelf: 'flex-start',
      marginTop: -6,
      marginLeft: -2,
      // §fix — Caveat script fontunun son glifi kendi kutusunca kırpılıyordu (isim sağdan kesik).
      // Sağ dolgu + marginRight ile taşmaya yer; sola kaydırmadan hizayı korur.
      paddingRight: space(3),
      marginRight: -space(3),
      transform: [{ rotate: '-9deg' }],
      zIndex: 2,
      // %15 opasiteli, yumuşak/blurlu alt gölge
      textShadowColor: 'rgba(0,0,0,0.15)',
      textShadowOffset: { width: 0, height: 3 },
      textShadowRadius: 8,
    },
    // Zeminsiz kullanıcı fotoğrafı — sağ altta, yeşilin ÖNÜNDE; alt kısmını dalga keser.
    // Daha büyük alan (kurucu isteği: foto küçük kalıyordu).
    heroPhoto: {
      position: 'absolute',
      right: -space(1),
      bottom: 0,
      width: 210,
      height: 262,
      zIndex: 1,
    },

    // ── SOL: şehir (beyaz alan ortalı) + SAĞ: "Dileğin Nedir?" pembe kart (sağa sıfır) ──
    wishRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: -space(8), // kart yukarı taşar → üst kenarı yeşil hero'ya birleşir
      zIndex: 3,
    },
    wishLeft: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    // Kayan slogan — kart ile kategoriler arasında
    marquee: { marginTop: space(2), marginBottom: space(0.5) },
    wishCard: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '62%',
      gap: space(1.25),
      backgroundColor: HOT_PINK,
      borderTopLeftRadius: radius.lg,
      borderBottomLeftRadius: radius.lg, // sağ köşeler 0 → ekran kenarına sıfır
      paddingVertical: space(1.75),
      paddingLeft: space(1.5),
      paddingRight: space(2),
    },
    wishIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    wishText: { gap: 2 },
    wishTitle: { fontSize: 20, letterSpacing: -0.2, textAlign: 'left' },
    wishSub: { opacity: 0.9 },

    // ── Tek satır yatay kaydırma (Fırsatlar / Öne çıkanlar) — referans gradient kart ──
    promoScroll: { paddingHorizontal: space(3), gap: space(1.5) },
    promoCard: {
      width: PROMO_W,
      height: PROMO_H,
      borderRadius: radius.lg,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: colors.bgSunken,
    },
    promoContent: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: space(2),
      zIndex: 2,
    },
    promoCardTitle: {
      fontSize: 17,
      fontWeight: '700',
      lineHeight: 21,
      letterSpacing: -0.2,
      color: '#FFFFFF',
    },
    promoTag: {
      position: 'absolute',
      top: space(1.25),
      left: space(1.25),
      backgroundColor: colors.accent,
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
      zIndex: 2,
    },
    promoTagText: { color: colors.onAccent, fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
    sponsorTag: {
      position: 'absolute',
      top: space(1.25),
      right: space(1.25),
      backgroundColor: 'rgba(0,0,0,0.4)',
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
      zIndex: 2,
    },
    sponsorText: { color: 'rgba(255,255,255,0.95)', fontSize: 10, fontWeight: '700' },

    // ── Kategoriler (yatay kaydırmalı) ──
    catRow: {
      flexDirection: 'row',
      gap: space(2),
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
    },
    cat: { alignItems: 'center', width: 62 },
    // Yuvarlak yerine yumuşak kare (squircle) + gölge — daha profesyonel
    catTile: {
      width: 60,
      height: 60,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(0.75),
    },
    catLabel: { textAlign: 'center', fontWeight: '600' },

    // ── Bölüm başlığı ──
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: space(3),
      marginTop: space(3.5),
      marginBottom: space(1.75),
    },
    sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
    seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },

    // ── Fırsatlar ──
    promoRow: { paddingHorizontal: space(3), gap: space(1.5) },
    promo: {
      height: 148,
      flexDirection: 'row',
      borderRadius: radius.xl,
      backgroundColor: colors.lavenderSoft,
      overflow: 'hidden',
    },
    promoLeft: { flex: 1, padding: space(2.25), justifyContent: 'center' },
    promoImg: { width: 128, height: '100%', backgroundColor: colors.bgSunken },
    promoBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.accent,
      paddingHorizontal: space(1.25),
      paddingVertical: 4,
      borderRadius: radius.pill,
      marginBottom: space(1),
    },
    promoBadgeText: { fontWeight: '800' },
    promoTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2, marginBottom: 2 },

    // ── Öne çıkanlar (sponsorlu) ──
    ads: { paddingHorizontal: space(3), gap: space(1.5) },
    adCard: {
      height: 160,
      borderRadius: radius.xl,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    adImage: { borderRadius: radius.xl },
    adBadge: {
      position: 'absolute',
      top: space(1.5),
      left: space(1.5),
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.rose,
      paddingHorizontal: space(1),
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    adBadgeText: { fontWeight: '600' },
    adText: { padding: space(2) },
    adSubtitle: { opacity: 0.9, marginTop: 2 },

    // ── Yakındaki salonlar ──
    nearby: { paddingHorizontal: space(3), gap: space(1.5) },
    cityEmpty: {
      marginHorizontal: space(3),
      marginTop: space(3),
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: space(3),
      alignItems: 'center',
      gap: space(1),
    },
    cityEmptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.roseSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(0.5),
    },
    cityEmptyTitle: { textAlign: 'center' },
    cityEmptySub: { textAlign: 'center', lineHeight: 18, maxWidth: 280 },
    cityEmptyCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      backgroundColor: colors.accent,
      paddingHorizontal: space(2),
      paddingVertical: space(1.25),
      borderRadius: radius.pill,
      marginTop: space(1),
    },
    cityEmptyCtaText: { fontWeight: '800' },
  });
