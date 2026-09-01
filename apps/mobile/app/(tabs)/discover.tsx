import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES } from '../../src/data';
import {
  useAds,
  useCampaigns,
  useCollections,
  useOffers,
  useProfessionals,
  useProfessionalsLoading,
} from '../../src/catalog';
import { greetingKey } from '../../src/greeting';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../../src/locale';
import { selectPortrait, selectUnreadCount, useStore } from '../../src/store';
import { useUnreadMessages } from '../../src/use-unread-messages';
import { categoryTints, radius, space, type ColorTokens, font } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  HomeUpcoming,
  HomeUrgent,
  ListSkeleton,
  Marquee,
  PressableScale,
  SalonRow,
  Screen,
  TAB_BAR_CLEARANCE,
  Text,
  TextInput,
  useOfflineInset,
} from '../../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

// Kategori daire zeminleri (spec §0.1) — pastel + ink ikon
// Canlı kategori renkleri (pembe/yeşil gibi doygun) — Saç·Cilt·Nail·Makyaj·Spa·Diğer
// Yatay kaydırmalı kart ölçüsü (Fırsatlar / Öne çıkanlar — profesyonel foto kartı)
const PROMO_W = Math.round(Dimensions.get('window').width * 0.72);
const PROMO_H = 168;

// Ana sayfa kategori seti = MERKEZİ taksonomideki AKTİF kategoriler (CATEGORIES). "Diğer" yok.

export default function DiscoverScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const cevrimdisiBosluk = useOfflineInset();
  const router = useRouter();
  const campaigns = useCampaigns();
  // ÜCRETLİ REKLAMLAR — uzman/salon hangi vitrini ödediyse orada çıkar.
  const ads = useAds();
  const firsatReklamlari = ads.filter((a) => a.placement === 'firsatlar');
  const oneCikanReklamlari = ads.filter((a) => a.placement === 'one_cikanlar');
  const offers = useOffers();
  // §A4 — trend içerikleri (admin 'trend' tipli yayınlar); boşsa bant gizli
  // DİKKAT: seçici içinde .filter() YENİ dizi üretir → useSyncExternalStore
  // "getSnapshot should be cached" sonsuz döngüsü = açılışta beyaz ekran.
  // Ham diziyi seç, türetmeyi useMemo ile yap.
  const articles = useStore((s) => s.articles);
  const trends = useMemo(() => articles.filter((a) => a.contentType === 'trend'), [articles]);
  // §keşif Modül 3 — aktif koleksiyon hero'ları (maks 2; priority sunucudan sıralı)
  const collections = useCollections().slice(0, 2);
  const city = useStore((s) => s.currentUser?.city) ?? 'Almatı';
  const unread = useStore(selectUnreadCount);
  const unreadMsg = useUnreadMessages();
  const points = useStore((s) => s.points);
  const tier = useStore((s) => s.tier);
  // §fix — boş isimde de fallback (|| ; '' ?? x boş string'e düşmez → Keşfet ismi boş görünüyordu)
  const userName =
    useStore((s) => s.currentUser?.name)
      ?.trim()
      .split(' ')[0] || '';
  // Portre TEK YERDEN: bayat kesik portre otomatik elenir (selectPortrait).
  const portre = useStore(selectPortrait);
  // Dinamik kullanıcı adı — ilk harf büyük (el yazısı katman için)
  const displayName = userName.charAt(0).toLocaleUpperCase('tr-TR') + userName.slice(1);
  const pros = useProfessionals();
  // §5.1.4 — şehir tüm Keşfet'i filtreler
  const cityPros = pros.filter((p) => p.city === city);
  // §5.1.7 REVİZE — Öne Çıkanlar SPONSORLU alan: yalnız admin panelinden ⭐ işaretlenenler
  // (badge 'campaign'); otomatik doldurma YOK — admin seçmediyse bölüm görünmez.
  /**
   * ÖNE ÇIKANLAR — ödenmiş vitrin.
   *
   * Burası `badge === 'campaign'` ile süzülüyordu: bölümün kendi yorumu
   * "yalnız admin'in seçtikleri" dediği hâlde kod adminin yönettiği reklam
   * tablosuna hiç bakmıyordu. Yani vitrin satılıyor ama yayınlanmıyordu.
   * Artık kaynak reklam tablosu; ödemesi bitmiş reklamı sunucu zaten süzüyor.
   */
  const featured = oneCikanReklamlari.slice(0, 6);
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
  /**
   * §4 — YÜKLENİYOR ile GERÇEKTEN BOŞ farklı şeyler.
   *
   * `useProfessionalsLoading` yazılmıştı ama BU EKRAN onu hiç kullanmıyordu.
   * Veri gelene kadar liste boş dönüyor ve ekran "Bu şehirde hizmet veren
   * yok" diyordu. Almatı'dan istek ~1,5 sn sürüyor, yani her yeni kullanıcı
   * önce YANLIŞ bir mesaj görüyordu — boş ekrandan da kötü.
   */
  const prosLoading = useProfessionalsLoading();
  const cityEmpty = !prosLoading && cityPros.length === 0;
  const [query, setQuery] = useState('');

  function runSearch() {
    const q = query.trim();
    router.push(q ? { pathname: '/search', params: { q } } : '/search');
  }

  return (
    <Screen edges={[]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* ═══ 1 · KİMLİK — kanvas Main.dc.html §1 ═══
            Kanvas: AÇIK porselen zemin, üstte şehir çipi + eylem düğmeleri,
            altında SOLDA kesik portre + yansıma, sağda selamlama.
            Önceki sürüm mor bir hero bloğuydu ve kanvasla ilgisi yoktu — yalnız
            renk token'ları değişmişti, yapı eski tasarımın kendisiydi. */}
        {/* Çevrimdışı bandı `absolute` çiziliyor ve bu satırı KAPATIYORDU:
            bağlantı yokken kullanıcı şehri değiştiremiyor, bildirim ve mesaj
            ikonlarına dokunamıyordu. Bant varken içerik onun altından
            başlıyor. */}
        <View style={[styles.topRow, { paddingTop: insets.top + space(0.5) + cevrimdisiBosluk }]}>
          <PressableScale
            style={[styles.cityChip, shadow.soft]}
            onPress={() => router.push('/city')}
          >
            <Ionicons name="location" size={13} color={colors.sage} />
            <Text variant="meta" tone="ink" style={styles.cityText}>
              {city}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.muted} />
          </PressableScale>
          <View style={styles.grow} />
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('map.title')}
            style={[styles.iconBtn, shadow.soft]}
            onPress={() => router.push('/map')}
          >
            <Ionicons name="map-outline" size={18} color={colors.ink} />
          </PressableScale>
          {/* Mesajlar ÜST BARDA, bildirimin yanında. Profil menüsünün
              içindeydi: en sık kullanılan yol en derin yerdeydi. */}
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('messages.title')}
            style={[styles.iconBtn, shadow.soft]}
            onPress={() => router.push('/messages')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.ink} />
            {unreadMsg > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadMsg > 9 ? '9+' : unreadMsg}</Text>
              </View>
            ) : null}
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('notifications.title')}
            style={[styles.iconBtn, shadow.soft]}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={18} color={colors.ink} />
            {unread > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            ) : null}
          </PressableScale>
        </View>

        <View style={styles.identityRow}>
          {/* KESİK PORTRE + YANSIMA — AYNA'nın marka imzası: uygulamayı açan
              kullanıcı kendi yansımasını görür. Kanvasta SOLDA, 96×138.
              Kesim RN'de mask-image ile yapılamıyor; alta doğru zemine eriyen
              bir gradyanla aynı etki kuruluyor. */}
          <View style={styles.portraitCol} pointerEvents="none">
            {portre ? (
              <>
                <View style={styles.portraitWrap}>
                  <Image source={{ uri: portre }} style={styles.portrait} resizeMode="cover" />
                  <LinearGradient
                    colors={['rgba(251,248,246,0)', colors.bg]}
                    locations={[0.62, 1]}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  />
                </View>
                <View style={styles.reflection}>
                  <Image source={{ uri: portre }} style={styles.reflectionImg} resizeMode="cover" />
                  <LinearGradient
                    colors={['rgba(251,248,246,0.55)', colors.bg]}
                    locations={[0, 0.88]}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              </>
            ) : displayName ? (
              /* Sıfır-demo: kendi fotosu yoksa sahte model YOK — baş harfi madalyonu */
              <>
                <View style={styles.medallion}>
                  <Text style={styles.medallionText}>{displayName.charAt(0)}</Text>
                </View>
                <View style={styles.reflection}>
                  <View style={[styles.medallion, styles.medallionFlip]}>
                    <Text style={styles.medallionText}>{displayName.charAt(0)}</Text>
                  </View>
                  <LinearGradient
                    colors={['rgba(251,248,246,0.55)', colors.bg]}
                    locations={[0, 0.88]}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.identityText}>
            <Text variant="body" tone="inkSoft">
              {t(greetingKey())}
            </Text>
            {/* İsim YOKSA satır hiç çizilmiyor. Misafirde `displayName` boş
                geliyordu ve 34 puntoluk boş bir satır bırakıyordu: selamlamanın
                altında sebepsiz bir boşluk. Boş bir metni çizmek, orada bir şey
                olması gerektiğini ama gelmediğini gösterir. */}
            {displayName ? (
              <Text
                style={styles.greetName}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {displayName}
              </Text>
            ) : (
              <Text variant="h2" tone="ink">
                {t('home.guest_title')}
              </Text>
            )}
            {points > 0 || tier ? (
              <PressableScale style={styles.tierRow} onPress={() => router.push('/rewards')}>
                <Ionicons name="star" size={13} color={colors.gold} />
                <Text
                  numeric
                  variant="caption"
                  tone="inkSoft"
                  style={styles.tierText}
                  numberOfLines={1}
                >
                  {points.toLocaleString('tr-TR')} {t('rewards.points')}
                  {tier ? ` · ${t(`rewards.tier.${tier.key}` as MessageKey)}` : ''}
                </Text>
              </PressableScale>
            ) : null}
          </View>
        </View>

        {/* ═══ 2 · ACİL — süre işleyen TEK iş, kimliğin hemen altında (kanvas §2).
            Kanvas teşhisi: kapora süresi sessizce doluyordu ve kullanıcı bunu
            ana ekranda göremiyordu. Kural: SÜRE İŞLİYORSA SAYAÇ GÖRÜNÜR. ═══ */}
        <HomeUrgent />

        {/* ═══ 3 · YAKLAŞAN RANDEVU (kanvas §3) ═══ */}
        <HomeUpcoming />

        {/* ═══ 4 · ANA EYLEM — Dileğin Nedir (kanvas §4) ═══ */}
        <PressableScale onPress={() => router.push('/quote')} style={styles.wishPress}>
          <LinearGradient
            colors={[colors.rose, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.wishCard}
          >
            <View style={styles.wishTop}>
              <View style={styles.grow}>
                <Text variant="h2" tone="onAccent" style={styles.wishTitle}>
                  {t('home.how')}
                </Text>
                <Text variant="meta" style={styles.wishSub} numberOfLines={2}>
                  {t('home.how_sub')}
                </Text>
              </View>
              <View style={styles.wishArrow}>
                <Ionicons name="arrow-forward" size={19} color={colors.rose} />
              </View>
            </View>
            {/* Üç adım: kullanıcı ne olacağını ÖNCEDEN bilsin */}
            <View style={styles.wishSteps}>
              {(['home.step1', 'home.step2', 'home.step3'] as MessageKey[]).map((k, i) => (
                <View key={k} style={styles.wishStep}>
                  {i > 0 ? (
                    <Ionicons name="chevron-forward" size={11} color="rgba(251,248,246,0.6)" />
                  ) : null}
                  <Text numeric variant="caption" tone="onAccent" style={styles.wishStepText}>
                    {t(k)}
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </PressableScale>

        {/* ═══ 5 · ARAMA + KATEGORİ (kanvas §5) ═══ */}
        <View style={styles.searchRow}>
          <View style={[styles.search, shadow.soft]}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('home.search')}
              placeholderTextColor={colors.muted}
              returnKeyType="search"
              onSubmitEditing={runSearch}
              style={styles.searchInput}
            />
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('home.search')}
              style={styles.searchGo}
              onPress={runSearch}
            >
              {/* Ters yüzeyin ÜSTÜNDEKİ ikon: onAccent koyu temada koyuya
                  döndüğü için koyu zeminde kayboluyordu. */}
              <Ionicons name="options-outline" size={17} color={colors.onInverse} />
            </PressableScale>
          </View>
        </View>

        {/* Kanvas: kategoriler YATAY HAP biçiminde (kare kutu değil) — isim
            kırpılmıyor, ikon renkli. Önceki kare kutularda "Saç bakımı" gibi
            uzun adlar "S..." diye kesiliyordu. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {CATEGORIES.map((cat, i) => {
            const tint = categoryTints[i % categoryTints.length]!;
            return (
              <Animated.View key={cat.id} entering={FadeInDown.duration(360).delay(i * 55)}>
                <PressableScale
                  style={[styles.catPill, shadow.soft]}
                  onPress={() => router.push(`/category/${cat.id}` as never)}
                >
                  <Ionicons name={cat.icon as IoniconName} size={16} color={tint} />
                  {/* numberOfLines YOK: hap yatay kaydırma içinde, genişlik
                      sınırı yok — "Masaj & Vüc..." gibi kırpılma kabul edilemez. */}
                  <Text variant="cta" tone="ink" style={styles.catLabel}>
                    {t(cat.labelKey)}
                  </Text>
                </PressableScale>
              </Animated.View>
            );
          })}
        </ScrollView>

        {/* Marka sesi — kanvasta yok ama uygulamada vardı; kaldırmak yerine
            kategorilerin altına, akışı bölmeyecek yere alındı. */}
        <Marquee text={t('home.marquee')} style={styles.marquee} />

        {prosLoading && cityPros.length === 0 ? (
          /* §4 — spinner DEĞİL iskelet: ekranın nihai biçimi belli olsun. */
          <View style={styles.skeletonWrap}>
            <ListSkeleton rows={4} />
          </View>
        ) : cityEmpty ? (
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
            {/* ── DÖNEMSEL KOLEKSİYON HERO (Modül 3 — maks 2, tarih penceresi otomatik) ── */}
            {collections.map((c) => (
              <Pressable
                key={c.id}
                style={styles.collectionHero}
                onPress={() => router.push(`/collection/${c.id}`)}
              >
                <Image
                  source={{
                    uri:
                      c.heroImage ||
                      'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=60',
                  }}
                  style={styles.collectionImg}
                />
                <View style={styles.collectionOverlay}>
                  <Text
                    variant="bodyStrong"
                    tone="onColor"
                    numberOfLines={1}
                    style={styles.collectionTitle}
                  >
                    {c.title}
                  </Text>
                  {c.subtitle ? (
                    <Text variant="caption" tone="onColor" numberOfLines={1}>
                      {c.subtitle}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}

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

            {/* ── BU HAFTA TREND (A4 — ilhamdan talebe 3 dokunuş) ── */}
            {trends.length > 0 ? (
              <>
                <SectionHeader title={t('home.trend')} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.promoScroll}
                >
                  {trends.slice(0, 8).map((a) => (
                    <PromoCard
                      key={a.id}
                      title={a.title}
                      image={
                        a.image ||
                        'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400&q=60'
                      }
                      tag={a.tag}
                      onPress={() =>
                        router.push({
                          pathname: '/quote/new',
                          params: { category: a.categoryCode ?? 'hair', note: a.title },
                        })
                      }
                    />
                  ))}
                </ScrollView>
              </>
            ) : null}

            {/* ── SALON/UZMAN KAMPANYALARI (Modül 2 — süreli indirimler) ── */}
            {offers.length > 0 || firsatReklamlari.length > 0 ? (
              <>
                <SectionHeader title={t('offers.title')} onSeeAll={() => router.push('/offers')} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.promoScroll}
                >
                  {/* Ücretli reklamlar başta ve SPONSORLU etiketli. Etiket
                      şart: ödenmiş yerleşimi organik kampanyadan ayırt
                      edilemez göstermek kullanıcıyı yanıltır. */}
                  {firsatReklamlari.map((reklam) => (
                    <PromoCard
                      key={reklam.id}
                      title={reklam.title}
                      image={reklam.image}
                      sponsored
                      {...(reklam.subtitle ? { tag: reklam.subtitle } : {})}
                      onPress={() => router.push('/professional/' + reklam.proId)}
                    />
                  ))}
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
                  {featured.map((reklam) => (
                    <PromoCard
                      key={reklam.id}
                      title={reklam.title}
                      image={reklam.image}
                      sponsored
                      {...(reklam.subtitle ? { tag: reklam.subtitle } : {})}
                      onPress={() => router.push('/professional/' + reklam.proId)}
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
    content: { paddingBottom: TAB_BAR_CLEARANCE },

    // ── Lime hero ── (alt boşluk dengelendi: bant yukarı kaysın AMA alt yazı dalgada kesilmesin)
    bellBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 19,
      height: 19,
      borderRadius: 9.5,
      paddingHorizontal: 4,
      backgroundColor: colors.rose,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
    },
    bellBadgeText: {
      color: colors.onColor,
      fontSize: 10,
      lineHeight: 12,
      fontFamily: font.semibold,
      textAlign: 'center',
      textAlignVertical: 'center',
      includeFontPadding: false,
    },
    // Kanvas §1 — şehir çipi 34 yüksek, İÇERİĞE göre esner.
    // maxWidth ve flexShrink YOK: şehir adı uzunluğu öngörülemez
    // (Almatı · Шымкент · Өскемен) ve "Alm..." diye kırpılması kabul edilemez.
    cityChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      height: 34,
      paddingHorizontal: space(1.5),
      borderRadius: 17,
      backgroundColor: colors.surface,
    },
    cityText: { fontFamily: font.semibold },
    grow: { flex: 1 },
    // Kanvas §1 — üst satır: şehir çipi solda, eylem düğmeleri sağda.
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      paddingHorizontal: space(2.5),
    },
    iconBtn: {
      width: 44,
      height: 44,
      borderRadius: 15,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Kanvas §5 — arama: 64 yüksek beyaz hap + koyu 46'lık eylem düğmesi.
    searchRow: { paddingHorizontal: space(2.5), marginTop: space(3) },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surface,
      paddingLeft: space(2.25),
      paddingRight: space(1),
    },
    searchGo: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor: colors.inverse,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchInput: { flex: 1, fontSize: 14, fontFamily: font.regular, color: colors.ink, padding: 0 },
    // Kanvas §1 — portre SOLDA, selamlama sağda.
    identityRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: space(2),
      paddingHorizontal: space(2.5),
      marginTop: space(1),
    },
    identityText: { flex: 1, paddingBottom: space(3.75), gap: 3, minWidth: 0 },
    // Zemin artık AÇIK porselen — bu üç stil mor hero'dan kalma beyaz metin
    // taşıyordu ve isim ile puan yazısı görünmez oluyordu.
    tierRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 5 },
    tierText: { flexShrink: 1 },
    greetName: {
      fontFamily: font.semibold,
      fontSize: 34,
      lineHeight: 40,
      letterSpacing: -0.8,
      color: colors.ink,
      alignSelf: 'flex-start',
    },
    // Kanvas §1 — kesik portre 96×138: 104 görsel + 34 yansıma.
    // Kesim RN'de mask-image ile yapılamıyor; alta doğru zemine eriyen bir
    // gradyan aynı etkiyi veriyor.
    portraitCol: { width: 96, height: 138 },
    portraitWrap: { width: 96, height: 104, overflow: 'hidden' },
    portrait: { width: 96, height: 104 },
    reflection: { width: 96, height: 34, overflow: 'hidden' },
    reflectionImg: {
      width: 96,
      height: 104,
      marginTop: -70,
      transform: [{ scaleY: -1 }],
      opacity: 0.16,
    },
    medallion: {
      width: 96,
      height: 104,
      borderRadius: 30,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    medallionFlip: { marginTop: -70, transform: [{ scaleY: -1 }], opacity: 0.16 },
    medallionText: { fontFamily: font.semibold, fontSize: 44, color: colors.accent },

    // Kanvas §4 — Dileğin Nedir: gül→mürdüm gradyan, beyaz ok düğmesi, 3 adım.
    wishPress: { marginHorizontal: space(2.5), marginTop: space(2.25) },
    wishCard: { borderRadius: radius.xl, padding: space(2.5), gap: space(1.875) },
    wishTop: { flexDirection: 'row', alignItems: 'center', gap: space(1.75) },
    wishTitle: { fontSize: 23, lineHeight: 27, letterSpacing: -0.3, textAlign: 'left' },
    wishSub: { color: 'rgba(251,248,246,0.88)', marginTop: 4 },
    wishArrow: {
      width: 56,
      height: 56,
      borderRadius: 19,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    wishSteps: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.875),
      paddingTop: space(1.625),
      borderTopWidth: 1,
      borderTopColor: 'rgba(251,248,246,0.24)',
    },
    wishStep: { flexDirection: 'row', alignItems: 'center', gap: space(0.875) },
    wishStepText: { fontFamily: font.semibold },

    // Kanvas §5 — kategoriler YATAY HAP: 52 yüksek, ad kırpılmıyor.
    catRow: { paddingHorizontal: space(2.5), gap: space(1.125), paddingVertical: space(1.5) },
    catPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      height: 52,
      paddingHorizontal: space(2.125),
      borderRadius: 26,
      backgroundColor: colors.surface,
    },
    catLabel: { fontFamily: font.medium, flexShrink: 0 },
    marquee: { marginTop: space(0.5), marginBottom: space(1.5) },

    // ── Tek satır yatay kaydırma (Fırsatlar / Öne çıkanlar) — referans gradient kart ──
    promoScroll: { paddingHorizontal: space(3), gap: space(1.5) },
    collectionHero: {
      height: 148,
      borderRadius: radius.xl,
      overflow: 'hidden',
      marginHorizontal: space(3), // bölümlerle aynı hiza (tam-genişlik taşma düzeltmesi)
      marginTop: space(1),
      marginBottom: space(2),
    },
    collectionImg: { width: '100%', height: '100%' },
    collectionOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: space(2),
      paddingVertical: space(1.5),
      backgroundColor: 'rgba(0,0,0,0.45)',
      gap: 2,
    },
    collectionTitle: { fontSize: 18, letterSpacing: -0.3 },
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
      fontFamily: font.semibold,
      lineHeight: 21,
      letterSpacing: -0.2,
      color: colors.onColor,
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
    promoTagText: {
      color: colors.onAccent,
      fontSize: 10,
      fontFamily: font.semibold,
      letterSpacing: 0.2,
    },
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
    sponsorText: { color: 'rgba(255,255,255,0.95)', fontSize: 10, fontFamily: font.semibold },

    // ── Kategoriler (yatay kaydırmalı) ──
    // Yuvarlak yerine yumuşak kare (squircle) + gölge — daha profesyonel

    // ── Bölüm başlığı ──
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: space(3),
      marginTop: space(3.5),
      marginBottom: space(1.75),
    },
    sectionTitle: { fontSize: 20, fontFamily: font.semibold, letterSpacing: -0.4 },
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
    promoBadgeText: { fontFamily: font.semibold },
    promoTitle: { fontSize: 17, fontFamily: font.semibold, letterSpacing: -0.2, marginBottom: 2 },

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
    adBadgeText: { fontFamily: font.semibold },
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
    skeletonWrap: { paddingHorizontal: space(2.5), paddingTop: space(1) },
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
    cityEmptyCtaText: { fontFamily: font.semibold },
  });
