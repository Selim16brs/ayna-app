import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES, cityCenter, distanceKm } from '../../src/data';
import {
  useAds,
  useCampaigns,
  useOffers,
  useProfessionals,
  useProfessionalsLoading,
} from '../../src/catalog';
import { AKIS_ADIMLARI, akisAdimi, durumEtiketi } from '../../src/booking-flow';
import { formatSlotTr } from '../../src/datetime';
import { HIZMET_IKON } from '../../src/hizmet-ikon';
import type { MessageKey } from '@ayna/i18n';
import { fillParams, useLocale } from '../../src/locale';
import { musteriRandevulari, selectPortrait, selectUnreadCount, useStore } from '../../src/store';
import { useUnreadMessages } from '../../src/use-unread-messages';
import { space, type ColorTokens, font } from '../../src/theme';
import { darkColors, lightColors } from '../../src/theme.palette';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  ListSkeleton,
  PressableScale,
  Screen,
  TAB_BAR_CLEARANCE,
  Text,
  useOfflineInset,
} from '../../src/ui';

// Kategori daire zeminleri (spec §0.1) — pastel + ink ikon
// Canlı kategori renkleri (pembe/yeşil gibi doygun) — Saç·Cilt·Nail·Makyaj·Spa·Diğer
// Yatay kaydırmalı kart ölçüsü (Fırsatlar / Öne çıkanlar — profesyonel foto kartı)

// Ana sayfa kategori seti = MERKEZİ taksonomideki AKTİF kategoriler (CATEGORIES). "Diğer" yok.

/**
 * Figma `quick-action-strip` — üç kart. Görseller Unsplash'ten; tasarımın
 * fotoğrafları yerine aynı konuyu taşıyan serbest görseller kullanıldı
 * (Figma varlıkları 7 günde sona eriyor, kalıcı olmaz).
 */
/** Sadakat seviyesinin etiketi — sunucudan gelen anahtara göre. */
const SEVIYE_ETIKET: Record<'bronze' | 'silver' | 'gold', MessageKey> = {
  bronze: 'rewards.tier.bronze',
  silver: 'rewards.tier.silver',
  gold: 'rewards.tier.gold',
};

/**
 * Salonun şehir merkezine uzaklığı (km).
 *
 * Kullanıcının KENDİ konumu kullanılmıyor: Keşfet ekranı konum izni
 * istemiyor (§izin kuralı — izin girişte istenmez). Salonun kaydında
 * koordinat yoksa mesafe hiç gösterilmiyor; uydurma sayı yazmaktansa
 * satırı boş bırakmak doğru.
 */
function mesafe(pro: { lat?: number; lng?: number; city: string }): number | null {
  if (pro.lat == null || pro.lng == null) return null;
  const merkez = cityCenter(pro.city);
  return distanceKm({ latitude: pro.lat, longitude: pro.lng }, merkez);
}

/** Figma `deposit-refund-card` zemini — accent'ten bir ton açık mürdüm. */
const IADE_ZEMIN = '#64285A';
/** Sabit koyu kartın yazısı da sabit açık — `onAccent` koyu temada döner. */
const IADE_YAZI = darkColors.ink;

const LOGO_SIYAH = require('../../assets/logo-ayna.png');
const LOGO_BEYAZ = require('../../assets/logo-ayna-white.png');

const HIZLI_EYLEMLER = [
  {
    id: 'randevu',
    etiket: 'home.qa.book' as MessageKey,
    yol: '/search' as const,
    gorsel: require('../../assets/hizli-eylem/randevu-al.png'),
  },
  {
    id: 'dilek',
    etiket: 'home.qa.wish' as MessageKey,
    // İKİ YOL var: fotoğrafla teklif (`/quote/new`) ve fiyat/talep ile
    // teklif (`/demand/new`). Seçimi kullanıcı yapar — hub `/quote`.
    // Doğrudan `/quote/new`'e gitmek fiyat yolunu görünmez yapıyordu.
    yol: '/quote' as const,
    gorsel: require('../../assets/hizli-eylem/dilegini-anlat.png'),
  },
  {
    id: 'harita',
    etiket: 'home.qa.map' as MessageKey,
    yol: '/map' as const,
    gorsel: require('../../assets/hizli-eylem/haritada-kesfet.png'),
  },
];

export default function DiscoverScreen() {
  const { t } = useLocale();
  const { colors, mode } = useTheme();
  const koyuTema = mode === 'dark';
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
  /**
   * Figma'daki iki bölüm GERÇEK VERİYE bağlı:
   *  · depozito iadesi bandı — iade hakkı doğmuş randevu varsa,
   *  · bekleyen randevular — akışı sürmekte olan ilk randevu.
   * Yoksa bölüm hiç çizilmiyor: olmayan bir vaadi göstermek, kullanıcıya
   * var olmayan parayı ya da randevuyu göstermektir.
   */
  const bookings = useStore((s) => s.bookings);
  const benimRandevularim = useMemo(() => musteriRandevulari(bookings), [bookings]);
  /**
   * İADE BANDI — vaat ettiği şey DOĞRU olmalı.
   *
   * Kurucu daha önce şunu bildirmişti: kart iade vaat ediyor, basınca ortada
   * iade olmayan bir randevu açılıyordu. Üç koşul o yüzden burada:
   *   · depozito GERÇEKTEN ödenmiş olmalı (tutar > 0),
   *   · geç iptalde depozito YANDI — iade hakkı yok (§4.7),
   *   · talep zaten gönderildiyse bandı tekrar göstermek yanlış.
   * Koşulu `HomeUrgent`ten devraldım; oradaki kart bu ekranla birlikte
   * kaldırıldı ama koruduğu güvence kaldırılmadı.
   */
  const iadeBekleyen = benimRandevularim.find(
    (b) =>
      (b.status === 'iptal_uzman' ||
        b.status === 'no_show_uzman' ||
        b.status === 'iptal_musteri') &&
      (b.depositAmount ?? 0) > 0 &&
      !b.depositForfeited &&
      !b.refundRequestedAt,
  );
  const bekleyenRandevu = benimRandevularim.find((b) => akisAdimi(b.status) >= 0);
  const prosLoading = useProfessionalsLoading();
  const cityEmpty = !prosLoading && cityPros.length === 0;
  return (
    <Screen edges={[]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* ═══ BAŞLIK — Figma `header-section` (68h) ═══
            Solda marka, sağda şehir · mesaj · bildirim. Ölçüler Figma'dan;
            işlevsel ikonlar (mesaj/bildirim rozetleri) korundu. */}
        <View style={[styles.header, { paddingTop: insets.top + space(0.5) + cevrimdisiBosluk }]}>
          {/* Marka İŞARETİ — metin değil. Koyu temada beyaz varyant. */}
          <Image
            source={koyuTema ? LOGO_BEYAZ : LOGO_SIYAH}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.grow} />
          <PressableScale style={styles.sehirCip} onPress={() => router.push('/city')}>
            <Ionicons name="location" size={12} color={colors.accent} />
            <Text variant="micro" tone="ink">
              {city}
            </Text>
            <Ionicons name="chevron-down" size={11} color={colors.muted} />
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('messages.title')}
            hitSlop={4}
            style={styles.basIkon}
            onPress={() => router.push('/messages')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.ink} />
            {unreadMsg > 0 ? (
              <View style={styles.rozet}>
                <Text style={styles.rozetYazi}>{unreadMsg > 9 ? '9+' : unreadMsg}</Text>
              </View>
            ) : null}
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('notifications.title')}
            hitSlop={4}
            style={styles.basIkon}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={18} color={colors.ink} />
            {unread > 0 ? (
              <View style={styles.rozet}>
                <Text style={styles.rozetYazi}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            ) : null}
          </PressableScale>
        </View>

        {/* ═══ KARŞILAMA — Figma `welcome-vip-area` (px24 py20) ═══ */}
        <View style={styles.karsilama}>
          <View style={styles.grow}>
            <Text style={styles.selam}>
              {displayName
                ? fillParams(t('home.greeting'), { ad: displayName })
                : t('home.guest_title')}
            </Text>
            <View style={styles.puanSatir}>
              <Ionicons name="ribbon" size={12} color={colors.gold} />
              <Text style={styles.puanSayi}>
                {points.toLocaleString('tr-TR')} {t('rewards.points')}
              </Text>
              {tier ? (
                <Text variant="micro" tone="muted">
                  · {t(SEVIYE_ETIKET[tier.key])}
                </Text>
              ) : null}
            </View>
          </View>
          <PressableScale style={styles.avatarHalka} onPress={() => router.push('/(tabs)/profile')}>
            {portre ? (
              <Image source={{ uri: portre }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarBos]} />
            )}
          </PressableScale>
        </View>

        {/* ═══ ARAMA — Figma `search-container` (radius 12, border #E5E0DE) ═══ */}
        <View style={styles.aramaKap}>
          <Pressable style={styles.arama} onPress={() => router.push('/search')}>
            <Ionicons name="search" size={16} color={colors.muted} />
            <Text style={styles.aramaYazi}>{t('home.search')}</Text>
          </Pressable>
        </View>

        {/* ═══ HIZLI EYLEMLER — Figma `quick-action-strip` (3 × h140, radius 16) ═══
            Fotoğraf + alttan koyulaşan degrade; yazı degradenin üstünde. */}
        <View style={styles.hizliSerit}>
          {HIZLI_EYLEMLER.map((e) => (
            <PressableScale key={e.id} style={styles.hizliKart} onPress={() => router.push(e.yol)}>
              {/*
                YEREL görsel doğrudan verilir: `require(...)` bir modül
                referansı döndürüyor, adres değil. `{ uri: ... }` içine
                koyunca geçersiz adres oluyor, resim hiç çizilmiyor ve
                geriye yalnız üstteki koyu perde kalıyordu — kartlar
                gri degrade görünüyordu. Aynı dosyadaki logo ve hizmet
                ikonları baştan doğru kullanımdaydı, bu üç kart değildi.
              */}
              <Image source={e.gorsel} style={StyleSheet.absoluteFill} resizeMode="cover" />
              {/*
                Perde SİYAH değil BEYAZ.

                Kurucunun verdiği üç fotoğraf da açık tonlu (krem salon,
                pudra tırnak masası, açık harita). Siyah perde onları hem
                çamurlaştırıyor hem de "ekranlar çok koyu" derdine geri
                dönüyordu. Beyaz perde + koyu yazı: fotoğraf görünür
                kalıyor, yazı okunuyor — en koyu bölgede bile 15:1 üstü.
              */}
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0)',
                  'rgba(255,255,255,0.30)',
                  'rgba(255,255,255,0.78)',
                  'rgba(255,255,255,0.93)',
                ]}
                locations={[0, 0.38, 0.74, 1]}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.hizliYazi}>{t(e.etiket)}</Text>
            </PressableScale>
          ))}
        </View>

        {/* ═══ HİZMETLER — Figma `service-icons-strip` (tile 68, ikon 64, radius 18) ═══ */}
        <BolumBasligi title={t('home.services')} onSeeAll={() => router.push('/search')} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ikonSerit}
        >
          {CATEGORIES.map((cat) => (
            <PressableScale
              key={cat.id}
              style={styles.ikonKap}
              onPress={() => router.push(`/category/${cat.id}` as never)}
            >
              <View style={styles.ikonKart}>
                {HIZMET_IKON[cat.id] ? (
                  <Image source={HIZMET_IKON[cat.id]} style={styles.ikonGorsel} />
                ) : (
                  <Ionicons name={cat.icon} size={26} color={colors.accent} />
                )}
              </View>
              {/* İKİ SATIR: "Kalıcı Makyaj" ve "Gelin & Özel Gün" tek satıra
                  sığmıyor, kırpılıyordu. Figma da iki satıra sarıyor. */}
              <Text numberOfLines={2} style={styles.ikonYazi}>
                {t(cat.labelKey)}
              </Text>
            </PressableScale>
          ))}
        </ScrollView>

        {/* ═══ DEPOZİTO İADESİ — Figma `deposit-refund-banner` ═══
            YALNIZ iade hakkı varsa. Yoksa bant hiç çizilmez: boş bir vaat
            göstermek, olmayan parayı varmış gibi sunmaktır. */}
        {iadeBekleyen ? (
          <View style={styles.iadeKap}>
            <View style={styles.iadeKart}>
              <View style={styles.iadeIkon}>
                <Text style={styles.iadeTenge}>₸</Text>
              </View>
              <View style={styles.grow}>
                <Text style={styles.iadeBaslik}>{t('home.refund.title')}</Text>
                <Text style={styles.iadeAlt}>{t('home.refund.sub')}</Text>
              </View>
              <PressableScale
                style={styles.iadeDugme}
                onPress={() => router.push(`/booking/refund?id=${iadeBekleyen.id}`)}
              >
                <Text style={styles.iadeDugmeYazi}>{t('home.refund.cta')}</Text>
              </PressableScale>
            </View>
          </View>
        ) : null}

        {/* ═══ BEKLEYEN RANDEVULAR — Figma `appointment-card-container` ═══ */}
        {bekleyenRandevu ? (
          <>
            <BolumBasligi title={t('home.pending')} />
            <View style={styles.iadeKap}>
              <PressableScale
                style={styles.randevuKart}
                onPress={() => router.push(`/booking/${bekleyenRandevu.id}`)}
              >
                <View style={styles.randevuBas}>
                  <Image source={{ uri: bekleyenRandevu.proImage }} style={styles.randevuFoto} />
                  <View style={styles.grow}>
                    <Text variant="captionStrong" tone="ink" numberOfLines={1}>
                      {bekleyenRandevu.proName}
                    </Text>
                    <Text variant="micro" tone="muted" numberOfLines={1}>
                      {bekleyenRandevu.service}
                    </Text>
                    {/* Figma `time-badge`: saat düz yazı değil, rozet. */}
                    <View style={styles.zamanRozet}>
                      <Text style={styles.zamanRozetYazi}>
                        {formatSlotTr(bekleyenRandevu.startMs)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.asamaSatir}>
                  <View style={styles.asamaCip}>
                    <Text style={styles.asamaYazi}>
                      {t(durumEtiketi(bekleyenRandevu.status, 'musteri'))}
                    </Text>
                  </View>
                  <Text variant="micro" tone="muted">
                    {akisAdimi(bekleyenRandevu.status) + 1} / {AKIS_ADIMLARI.length}
                  </Text>
                </View>
                {/* Figma `stage-progress-bar`: TEK çubuk değil, dört ayrı
                    parça (stage-1…4). Adımın kaçıncısında olduğunu tek
                    bakışta gösteriyor. */}
                <View style={styles.ilerlemeSatir}>
                  {AKIS_ADIMLARI.map((adim, i) => (
                    <View
                      key={adim.anahtar}
                      style={[
                        styles.ilerlemeParca,
                        i <= akisAdimi(bekleyenRandevu.status) && styles.ilerlemeParcaDolu,
                      ]}
                    />
                  ))}
                </View>
                {/* Figma `ticket-actions` — üç eşit düğme: Ertele · Yaz · Yol. */}
                <View style={styles.biletEylem}>
                  <PressableScale
                    style={styles.biletDugme}
                    onPress={() => router.push(`/booking/reschedule?id=${bekleyenRandevu.id}`)}
                  >
                    <Ionicons name="swap-horizontal" size={15} color={colors.accent} />
                    <Text style={styles.biletYazi}>{t('home.next.reschedule')}</Text>
                  </PressableScale>
                  <PressableScale
                    style={styles.biletDugme}
                    onPress={() => router.push(`/messages/${bekleyenRandevu.proId}`)}
                  >
                    <Ionicons name="chatbubble-outline" size={15} color={colors.accent} />
                    <Text style={styles.biletYazi}>{t('home.next.message')}</Text>
                  </PressableScale>
                  <PressableScale style={styles.biletDugme} onPress={() => router.push('/map')}>
                    <Ionicons name="navigate-outline" size={15} color={colors.accent} />
                    <Text style={styles.biletYazi}>{t('home.next.route')}</Text>
                  </PressableScale>
                </View>
              </PressableScale>
            </View>
          </>
        ) : null}

        {/* ═══ SENİN İÇİN SEÇTİKLERİMİZ — Figma `curated-section` (kart 260×200) ═══
            Kaynak ÜCRETLİ VİTRİN (`one_cikanlar`): kurucu bu bölümün bizim
            "Öne çıkanlar" ücretli alanımız olduğunu söyledi. */}
        {featured.length > 0 ? (
          <>
            <BolumBasligi title={t('home.featured')} onSeeAll={() => router.push('/search')} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vitrinSerit}
            >
              {featured.map((reklam) => (
                <VitrinKarti
                  key={reklam.id}
                  title={reklam.title}
                  image={reklam.image}
                  subtitle={reklam.subtitle}
                  sponsored
                  rating={pros.find((x) => x.id === reklam.proId)?.rating}
                  onPress={() => router.push('/professional/' + reklam.proId)}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* ═══ FIRSATLAR — Figma `firsatlar-section` ═══
            Ücretli reklamlar başta ve SPONSORLU etiketli; ardından organik
            kampanyalar. Etiket şart: ödenmiş yerleşimi organik içerikten
            ayırt edilemez göstermek kullanıcıyı yanıltır. */}
        {firsatReklamlari.length > 0 || offers.length > 0 || campaigns.length > 0 ? (
          <>
            <BolumBasligi title={t('home.campaigns')} onSeeAll={() => router.push('/offers')} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vitrinSerit}
            >
              {firsatReklamlari.map((reklam) => (
                <VitrinKarti
                  key={reklam.id}
                  title={reklam.title}
                  image={reklam.image}
                  subtitle={reklam.subtitle}
                  sponsored
                  rating={pros.find((x) => x.id === reklam.proId)?.rating}
                  onPress={() => router.push('/professional/' + reklam.proId)}
                />
              ))}
              {/* Admin kampanyaları — Figma'da ayrı bölüm yok, ama içerik
                  gerçek. Aynı kavram olduğu için Fırsatlar şeridine katılıyor;
                  bölümü silmek onları ekrandan tümden kaldırmak olurdu. */}
              {campaigns.slice(0, 6).map((c) => (
                <VitrinKarti
                  key={c.id}
                  title={c.title}
                  image={c.image}
                  subtitle={c.subtitle}
                  onPress={() => router.push(`/category/${c.category}` as never)}
                />
              ))}
              {offers.slice(0, 8).map((o) => (
                <VitrinKarti
                  key={o.id}
                  title={o.title}
                  image={o.imageUrl}
                  subtitle={
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

        {/* ═══ BU HAFTA TREND — Figma `trends-section` (radius 12, ikon 36) ═══ */}
        {trends.length > 0 ? (
          <>
            <BolumBasligi title={t('home.trend')} />
            {/* Figma `trends-grid`: iki satır, satır başına iki öğe.
                Yatay kaydırmada dördüncü öğe ekran dışında kalıyordu. */}
            <View style={styles.trendIzgara}>
              {trends.slice(0, 4).map((a) => (
                <PressableScale
                  key={a.id}
                  style={styles.trendKart}
                  onPress={() => router.push(`/life/${a.id}` as never)}
                >
                  {a.image ? (
                    <Image source={{ uri: a.image }} style={styles.trendGorsel} />
                  ) : (
                    <View style={[styles.trendGorsel, styles.trendGorselBos]} />
                  )}
                  <Text numberOfLines={2} style={styles.trendYazi}>
                    {a.title}
                  </Text>
                </PressableScale>
              ))}
            </View>
          </>
        ) : null}

        {/* ═══ YAKININDAKİ SALONLAR — Figma `salons-section` (satır p14, radius 16) ═══ */}
        <BolumBasligi title={t('home.nearby')} onSeeAll={() => router.push('/nearby')} />
        {prosLoading ? (
          <View style={styles.iadeKap}>
            <ListSkeleton rows={4} />
          </View>
        ) : (
          <View style={styles.salonListe}>
            {nearby.map((pro) => (
              <PressableScale
                key={pro.id}
                style={styles.salonSatir}
                onPress={() => router.push('/professional/' + pro.id)}
              >
                <Image source={{ uri: pro.image }} style={styles.salonFoto} />
                <View style={styles.grow}>
                  <View style={styles.salonAdSatir}>
                    <Text variant="captionStrong" tone="ink" numberOfLines={1}>
                      {pro.name}
                    </Text>
                    {pro.aynaVerified ? (
                      <View style={styles.dogruCip}>
                        <Text style={styles.dogruYazi}>{t('home.verified')}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text variant="micro" tone="muted" numberOfLines={1}>
                    {mesafe(pro) != null ? `${mesafe(pro)!.toFixed(1)} km · ` : ''}
                    {pro.city}
                  </Text>
                  <View style={styles.puanCip}>
                    <Ionicons name="star" size={11} color={colors.gold} />
                    <Text variant="micro" tone="ink">
                      {pro.rating.toFixed(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.detayDugme}>
                  <Text style={styles.detayYazi}>{t('home.details')}</Text>
                </View>
              </PressableScale>
            ))}
          </View>
        )}

        {cityEmpty ? (
          <View style={styles.iadeKap}>
            <View style={styles.bosSehir}>
              <Text variant="bodyStrong" tone="ink">
                {t('home.city_empty.title')}
              </Text>
              <Text variant="caption" tone="muted">
                {t('home.city_empty.sub')}
              </Text>
              <PressableScale style={styles.haberDugme} onPress={() => router.push('/city')}>
                <Text style={styles.haberYazi}>{t('home.city_empty.cta')}</Text>
              </PressableScale>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/** Bölüm başlığı — Figma: 20px başlık, sağda 13px "Tümünü Gör", px24. */
function BolumBasligi({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.bolumBas}>
      <Text variant="h2" tone="ink">
        {title}
      </Text>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} accessibilityRole="button" style={styles.tumuKap}>
          <Text variant="caption" tone="accentFg">
            {t('common.see_all')}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Vitrin kartı — Figma `curated-section` kartı: 260×200, radius 20,
 * fotoğraf + alttan koyulaşan degrade, sol üstte SPONSORLU rozeti.
 */
function VitrinKarti({
  title,
  image,
  subtitle,
  sponsored,
  rating,
  onPress,
}: {
  title: string;
  image?: string | undefined;
  subtitle?: string | undefined;
  sponsored?: boolean;
  rating?: number | undefined;
  onPress: () => void;
}) {
  const { t } = useLocale();
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale style={styles.vitrinKart} onPress={onPress}>
      {image ? (
        <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.vitrinBos]} />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.62)', 'rgba(0,0,0,0.86)']}
        locations={[0, 0.38, 0.74, 1]}
        style={StyleSheet.absoluteFill}
      />
      {sponsored ? (
        <View style={styles.sponsorCip}>
          <Text style={styles.sponsorYazi}>{t('home.sponsored')}</Text>
        </View>
      ) : null}
      <View style={styles.vitrinAlt}>
        <View style={styles.vitrinBaslikSatir}>
          <Text style={styles.vitrinBaslik} numberOfLines={1}>
            {title}
          </Text>
          {rating != null ? (
            <View style={styles.vitrinPuan}>
              <Ionicons name="star" size={12} color="#FFFFFF" />
              <Text style={styles.vitrinPuanYazi}>{rating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text style={styles.vitrinAltYazi} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

/**
 * Ölçüler Figma'dan BİREBİR — yuvarlanmadı.
 * Bölüm arası boşluk her yerde 28px; yatay kenar 24px (şeritlerde 24 sol).
 */
const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingBottom: TAB_BAR_CLEARANCE },
    grow: { flex: 1 },

    // header-section (68h)
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    // Figma `ayna-logo-mark` 80×36; oran korunuyor.
    logo: { width: 80, height: 30 },
    sehirCip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 100,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    basIkon: {
      // Figma 36×36. Dokunma alanı hitSlop ile 44pt'ye çıkarılıyor:
      // görsel küçülüyor ama parmak hedefi eşiğin altına inmiyor.
      width: 36,
      height: 36,
      borderRadius: 100,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    rozet: {
      position: 'absolute',
      top: 4,
      right: 4,
      minWidth: 15,
      height: 15,
      borderRadius: 100,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    rozetYazi: { color: colors.onColor, fontSize: 9, fontFamily: font.semibold },

    // welcome-vip-area (px24 py20)
    karsilama: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 20,
      gap: 12,
    },
    // Figma: 28px Bold Italic. Onest'te italik yok; eğim sentezleniyor.
    selam: {
      fontFamily: font.semibold,
      fontSize: 28,
      lineHeight: 34,
      color: colors.ink,
      fontStyle: 'italic',
    },
    puanSatir: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    puanSayi: { fontFamily: font.semibold, fontSize: 12, color: colors.gold },
    avatarHalka: { padding: 2, borderRadius: 100, borderWidth: 1.5, borderColor: colors.accent },
    avatar: { width: 52, height: 52, borderRadius: 100 },
    avatarBos: { backgroundColor: colors.accentSoft },

    // search-container (radius 12, border #E5E0DE, px14 py8)
    aramaKap: { paddingHorizontal: 20 },
    arama: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.lineStrong,
    },
    aramaYazi: { fontFamily: font.regular, fontSize: 13, color: colors.muted, opacity: 0.7 },

    // quick-action-strip (3 × h140, radius 16, gap 10)
    hizliSerit: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 28 },
    hizliKart: {
      flex: 1,
      height: 140,
      borderRadius: 16,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: 14,
      paddingHorizontal: 10,
      gap: 6,
    },
    hizliYazi: {
      fontFamily: font.semibold,
      fontSize: 11,
      /*
       * SABİT koyu — fotoğraflar iki temada da aynı ve açık tonlu.
       * `ink` yazsaydık koyu temada açık renge dönüp beyaz perdenin
       * üstünde kaybolurdu; `uzman/[id]` hero'sundaki hata tam buydu.
       */
      color: lightColors.ink,
      textAlign: 'center',
    },

    // bölüm başlığı (px24, 28 üst boşluk)
    bolumBas: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 12,
    },

    // service-icons-strip (tile 68, ikon 64, radius 18, gap 14)
    ikonSerit: { gap: 14, paddingLeft: 24, paddingRight: 12, paddingBottom: 4 },
    ikonKap: { width: 68, alignItems: 'center', gap: 8 },
    // Figma `icon-card`: 64×64, radius 16, 1px kenarlık.
    ikonKart: {
      width: 64,
      height: 64,
      borderRadius: 16,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.accentSoft,
    },
    ikonGorsel: { width: 64, height: 64 },
    // Figma: 11px, satır aralığı 1.3, ortalı, İKİ SATIRA sarabilir.
    ikonYazi: {
      fontFamily: font.medium,
      fontSize: 11,
      lineHeight: 14,
      textAlign: 'center',
      color: colors.ink,
    },

    // deposit-refund-banner
    iadeKap: { paddingHorizontal: 20, paddingTop: 28 },
    // Figma `deposit-refund-card`: zemin #64285A — accent'ten bir ton AÇIK,
    // bilerek. Kart cihaz temasından bağımsız (iki temada da koyu), yazısı da
    // sabit açık; değerler paletten geliyor ki marka değişince birlikte
    // değişsin.
    iadeKart: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 16,
      borderRadius: 22,
      backgroundColor: IADE_ZEMIN,
    },
    iadeIkon: {
      width: 44,
      height: 44,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,240,245,0.16)',
    },
    iadeTenge: { fontFamily: font.semibold, fontSize: 22, color: IADE_YAZI },
    iadeBaslik: { fontFamily: font.semibold, fontSize: 15, color: IADE_YAZI },
    iadeAlt: {
      fontFamily: font.regular,
      fontSize: 12,
      color: 'rgba(255,240,245,0.72)',
      marginTop: 2,
    },
    iadeDugme: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 100,
      backgroundColor: IADE_YAZI,
    },
    iadeDugmeYazi: { fontFamily: font.semibold, fontSize: 13, color: IADE_ZEMIN },

    // appointment-card-container (radius 24, p16)
    randevuKart: { borderRadius: 24, backgroundColor: colors.surface, padding: 16, gap: 12 },
    randevuBas: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    randevuFoto: { width: 48, height: 48, borderRadius: 100, backgroundColor: colors.accentSoft },
    randevuZaman: { marginTop: 2 },
    asamaSatir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    asamaCip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 100,
      backgroundColor: colors.successSoft,
    },
    asamaYazi: { fontFamily: font.semibold, fontSize: 10, color: colors.success },
    // Figma `time-badge` — saat rozeti.
    zamanRozet: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 100,
      backgroundColor: colors.accentSoft,
      marginTop: 4,
    },
    zamanRozetYazi: { fontFamily: font.semibold, fontSize: 12, color: colors.accent },
    // Figma `stage-progress-bar` — dört ayrı parça.
    ilerlemeSatir: { flexDirection: 'row', gap: 4 },
    ilerlemeParca: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line },
    ilerlemeParcaDolu: { backgroundColor: colors.accent },
    // Vitrin kartı puan rozeti.
    vitrinBaslikSatir: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    vitrinPuan: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    vitrinPuanYazi: { fontFamily: font.semibold, fontSize: 12, color: colors.onColor },
    tumuKap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    // Figma `ticket-actions`: eşit üç düğme, radius 12, px16 py10,
    // zemin accent %7, kenarlık accent %15.
    biletEylem: { flexDirection: 'row', gap: 8 },
    biletDugme: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.line,
    },
    biletYazi: { fontFamily: font.semibold, fontSize: 12, color: colors.accent },

    // curated / firsatlar kartı (260×200, radius 20)
    vitrinSerit: { gap: 14, paddingLeft: 24, paddingRight: 12 },
    vitrinKart: {
      width: 260,
      height: 200,
      borderRadius: 20,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    vitrinBos: { backgroundColor: colors.accentSoft },
    sponsorCip: {
      position: 'absolute',
      top: 12,
      left: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: 'rgba(0,0,0,0.42)',
    },
    sponsorYazi: {
      fontFamily: font.semibold,
      fontSize: 9,
      color: colors.onColor,
      letterSpacing: 0.6,
    },
    vitrinAlt: { padding: 12, gap: 2 },
    vitrinBaslik: { fontFamily: font.semibold, fontSize: 16, color: colors.onColor },
    vitrinAltYazi: { fontFamily: font.regular, fontSize: 12, color: 'rgba(255,255,255,0.82)' },

    // trends-section (radius 12, ikon 36, gap 10)
    // Figma `trends-grid` — 2×2 ızgara; yatay kaydırmada dördüncü öğe
    // ekran dışında kalıyordu.
    trendIzgara: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 24 },
    trendKart: {
      width: '48%',
      flexGrow: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 8,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    trendGorsel: { width: 36, height: 36, borderRadius: 12 },
    trendGorselBos: { backgroundColor: colors.accentSoft },
    trendYazi: {
      flex: 1,
      fontFamily: font.medium,
      fontSize: 12,
      lineHeight: 15,
      color: colors.ink,
    },

    // salons-section (satır p14, radius 16, foto 64/radius 12)
    salonListe: { paddingHorizontal: 20, gap: 10 },
    salonSatir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.surface,
    },
    salonFoto: { width: 64, height: 64, borderRadius: 12, backgroundColor: colors.accentSoft },
    salonAdSatir: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dogruCip: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: colors.successSoft,
    },
    dogruYazi: { fontFamily: font.semibold, fontSize: 9, color: colors.success },
    puanCip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    detayDugme: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 100,
      backgroundColor: colors.accentSoft,
    },
    detayYazi: { fontFamily: font.semibold, fontSize: 12, color: colors.accent },

    bosSehir: { borderRadius: 20, backgroundColor: colors.surface, padding: 16, gap: 8 },
    haberDugme: {
      alignSelf: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 100,
      backgroundColor: colors.accent,
      marginTop: 4,
    },
    haberYazi: { fontFamily: font.semibold, fontSize: 13, color: colors.onAccent },
  });
