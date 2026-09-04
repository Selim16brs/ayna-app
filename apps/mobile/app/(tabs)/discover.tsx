import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Professional, CATEGORIES, cityCenter, distanceKm } from '../../src/data';
import {
  useAds,
  useCampaigns,
  useProfessionals,
  useProfessionalsLoading,
  usePromosyonlar,
} from '../../src/catalog';
import { AKIS_ADIMLARI, akisAdimi, durumEtiketi } from '../../src/booking-flow';
import { formatSlotTr } from '../../src/datetime';
import type { MessageKey } from '@ayna/i18n';
import { ANA_EKRAN_PROMOSYON, promosyonlariSirala } from '@ayna/domain';
import { useLocale } from '../../src/locale';
import { hizmetEtiketiCevir } from '../../src/hizmet-adi';
import {
  musteriRandevulari,
  selectPortrait,
  selectPortraitKesilmis,
  selectUnreadCount,
  useStore,
} from '../../src/store';
import { useUnreadMessages } from '../../src/use-unread-messages';
import { space, type ColorTokens, font } from '../../src/theme';
import { lightColors } from '../../src/theme.palette';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { greetingKey } from '../../src/greeting';
import { tri } from '../../src/taxonomy';
import { useKategoriYakinda } from '../../src/yakinda';
import {
  PromosyonKarti,
  HizmetIkonu,
  ListSkeleton,
  PressableScale,
  Screen,
  TAB_BAR_CLEARANCE,
  TepeIsigi,
  Text,
  YakindaRozeti,
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

/*
 * DEPOZİTO İADE KARTI — zemin artık SEÇİLEN RENKTEN.
 *
 * Eskiden `'#64285A'` sabitiydi: kullanıcı Zümrüt seçse bile bu kart
 * mürdüm kalıyordu. Kurucu: "yine ortak renk kullanılan kartlar kalmış."
 * `colors.plum` her sette o setin derin yüzeyi — iki temada da koyu, yani
 * kartın karakteri değişmiyor, yalnız ailesi.
 *
 * Yazı sabit beyaz: kart iki temada da koyu, `ink` koyu temada açığa
 * dönüp kaybolurdu (uzman hero'sunda tam olarak bu hata yaşanmıştı).
 */

const LOGO_SIYAH = require('../../assets/logo-ayna.png');
const LOGO_BEYAZ = require('../../assets/logo-ayna-white.png');

const HIZLI_EYLEMLER = [
  {
    id: 'randevu',
    etiket: 'home.qa.book' as MessageKey,
    // GEZİNME modu: klavye açılmadan sonuçlar + filtre penceresi. Keşfet'te
    // zaten bir arama kutusu var; bu kart ikincisini açmamalı.
    yol: '/search?mod=gozat' as const,
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
  const { t, locale } = useLocale();
  const kategoriYakinda = useKategoriYakinda();
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
  const portreKesilmis = useStore(selectPortraitKesilmis);
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
  /*
   * PROMOSYONLAR — ana ekranda EN YAKIN dördü, gerisi "Tümü" ekranında.
   *
   * Mesafesi bilinmeyen (koordinatı olmayan işletme) sona düşüyor:
   * "0 km" sayıp başa koymak, kullanıcıya en yakın sanıp yola çıkacağı
   * bir şey göstermek olurdu.
   */
  const promosyonlar = usePromosyonlar();
  const yakinPromosyonlar = useMemo(
    () => promosyonlariSirala(promosyonlar, 'yakinlik').slice(0, ANA_EKRAN_PROMOSYON),
    [promosyonlar],
  );
  /*
   * ── SALONLAR ve UZMANLAR AYRI ──────────────────────────────────────
   *
   * Kurucu: "yakınındaki uzmanlar diye bir alan da olmalı. salonların
   * altında. hem yakınındaki salonlar hem de yakınındaki uzmanlar ilk 3
   * görünmeli (başarı durumuna göre) kalanlar tümü butonuna basılarak
   * görünmeli."
   *
   * Tek bir "Sana yakın" bölümü vardı ve salon yetmezse uzmanları da
   * içine katıyordu: müşteri ikisini ayırt edemiyordu.
   *
   * SIRALAMA SUNUCUDAN: liste başarıya göre sıralı geliyor
   * (`catalog.service` — tamamlanan/gelen oranı + değerlendirme).
   * Burada yeniden sıralamak, iki yerde iki farklı kural demek olurdu.
   *
   * PREMIUM SALON ÖNCE: satın alınmış görünürlük korunuyor; premium
   * içinde sıra yine başarıya göre.
   */
  const nearbySalons = useMemo(() => {
    const salons = cityPros.filter((p) => p.kind === 'salon');
    const premium = salons.filter((p) => p.isPremium);
    return [...premium, ...salons.filter((p) => !p.isPremium)].slice(0, 3);
  }, [cityPros]);
  const nearbyExperts = useMemo(
    () => cityPros.filter((p) => p.kind !== 'salon').slice(0, 3),
    [cityPros],
  );
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
      {/*
       * ═══ SABİT ÜST BLOK ═══
       *
       * Kurucu: "ana sayfada search kısmını üstünden yukarı kadar olan
       * kısmı aynı profildeki gibi sabit tutabilir misin?"
       *
       * Başlık, karşılama ve arama kaydırma alanının DIŞINDA: sayfa
       * kayarken yerlerinde duruyorlar. Arama her an elin altında —
       * eskiden aramak için en yukarı kaydırmak gerekiyordu.
       *
       * Tepe ışığı bu bloğun İÇİNDE ve onu dolduruyor: daireler artık
       * sabit alanın boyuna göre yerleşiyor, altındaki kayan içeriğe
       * taşmıyor.
       */}
      <View style={styles.sabitUst}>
        <TepeIsigi />
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

        {/* ═══ KARŞILAMA — Figma `welcome-vip-area` (px24 py20) ═══
            Kurucu: "mesaj üstte ve daha küçük, altında da isim daha büyük
            ve bold olsun."

            Tek satırdı ("Merhaba, Selim") ve isim selamlamanın içinde
            kayboluyordu. Artık iki satır: üstte saate göre karşılama
            küçük, altında İSİM büyük. Hiyerarşi de doğrulandı — ekranın
            konusu kullanıcının kendisi, karşılama sözü değil. */}
        <View style={styles.karsilama}>
          <View style={styles.grow}>
            <Text style={styles.selamUst}>{t(greetingKey())}</Text>
            <Text style={styles.selamAd} numberOfLines={1}>
              {displayName || t('home.guest_title')}
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
          {/*
           * PORTRE — kurucu: "daha büyük ve arka planı kesilmiş şekilde
           * çıksın, daire içinde olmasın."
           *
           * KESİLMİŞ portre çerçevesiz ve büyük: zemini saydam, tepe
           * ışığının üstünde duruyor. HAM fotoğraf ise daire içinde
           * kalıyor — kendi arka planını taşıyor ve çerçevesiz kare
           * göstermek kullanıcının odasını ana sayfaya yapıştırmak olurdu.
           */}
          <PressableScale
            style={portreKesilmis ? styles.portreKap : styles.avatarHalka}
            onPress={() => router.push('/(tabs)/profile')}
            accessibilityRole="button"
            accessibilityLabel={t('nav.profile')}
          >
            {portre ? (
              <Image
                source={{ uri: portre }}
                style={portreKesilmis ? styles.portreKesik : styles.avatar}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarBos]} />
            )}
            {/*
             * ZEMİN ÇİZGİSİ — yalnız kesilmiş portrede.
             *
             * Kurucu: "o profil fotoğrafının altına paralel şekilde
             * dairenin dışındaki pembe renkten çizgi atar mısın? tam
             * fotoğrafın bittiği yerde ince görünsün ve fotoğraf genişliği
             * kadar olsun."
             *
             * Kesilmiş portrenin zemini saydam; çizgi olmadan figür
             * boşlukta asılı duruyor. Çizgi fotoğrafın TAM ALTINDA ve
             * TAM GENİŞLİĞİNDE: kabın kendisi portre ölçüsünde, çizgi de
             * kabın alt kenarı.
             *
             * Daire içindeki ham fotoğrafta ÇİZİLMİYOR: orada zaten bir
             * çerçeve var, ikisi birden fazlalık olurdu.
             */}
            {portreKesilmis ? <View style={styles.portreCizgi} /> : null}
          </PressableScale>
        </View>

        {/* ═══ ARAMA — Figma `search-container` (radius 12, border #E5E0DE) ═══ */}
        <View style={styles.aramaKap}>
          <Pressable style={styles.arama} onPress={() => router.push('/search')}>
            <Ionicons name="search" size={16} color={colors.muted} />
            <Text style={styles.aramaYazi}>{t('home.search')}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
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
              <Image source={e.gorsel} style={styles.hizliFoto} resizeMode="cover" />
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
              {/* Referans kutu artık ortak bileşende — altı ekran aynı yerden
                  okuyor, ölçüler bir daha ayrışamıyor. */}
              <HizmetIkonu id={cat.id} tarz="kutu" />
              {/* İKİ SATIR: "Kalıcı Makyaj" ve "Gelin & Özel Gün" tek satıra
                  sığmıyor, kırpılıyordu. Figma da iki satıra sarıyor. */}
              <Text numberOfLines={2} style={styles.ikonYazi}>
                {tri(cat.ad, locale)}
              </Text>
              {/*
               * Brief §7.4 — kategorinin HİÇBİR alt hizmetinde yayında
               * uzman yok. Kategori yine açılıyor: içeride talep bırakma
               * kartı var ve asıl istenen o.
               */}
              {kategoriYakinda(cat.id) ? <YakindaRozeti tarz="kutu" /> : null}
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
                      {hizmetEtiketiCevir(bekleyenRandevu.service, locale)}
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
                  oran="yatay"
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
        {firsatReklamlari.length > 0 || campaigns.length > 0 ? (
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
              {/*
                UZMANIN KENDİ KAMPANYALARI ARTIK BURADA DEĞİL.

                Kurucu: "uzman panelinden oluşturulan promosyonlar,
                fırsatlar alanında gösterilmesin. fırsatlar ve senin için
                seçtiklerim parayla sattığımız alan ama uzmanın açtığı
                promosyonlar o uzmana AYNA'nın sağladığı bir reklam alanı."

                Ücretli yerleşimle ücretsiz hakkı aynı şeritte göstermek,
                ödeyenin satın aldığı yeri dağıtmak olurdu. Uzman
                kampanyaları aşağıdaki "Promosyonlar" bölümünde.
              */}
            </ScrollView>
          </>
        ) : null}

        {/* ═══ PROMOSYONLAR — uzmanların KENDİ kampanyaları ═══
            En yakın dördü burada; gerisi "Tümü" ekranında (filtreli). */}
        {promosyonlar.length > 0 ? (
          <>
            <BolumBasligi title={t('promos.title')} onSeeAll={() => router.push('/promotions')} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vitrinSerit}
            >
              {yakinPromosyonlar.map((p) => (
                <PromosyonKarti
                  key={`${p.proId}:${p.id}`}
                  p={p}
                  onPress={() => router.push(`/professional/${p.proId}`)}
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

        {/* ═══ YAKININDAKİ SALONLAR ═══ */}
        <BolumBasligi title={t('home.nearby')} onSeeAll={() => router.push('/nearby')} />
        {prosLoading ? (
          <View style={styles.iadeKap}>
            <ListSkeleton rows={3} />
          </View>
        ) : (
          <View style={styles.salonListe}>
            {nearbySalons.map((pro) => (
              <SaglayiciSatiri key={pro.id} pro={pro} />
            ))}
          </View>
        )}

        {/* ═══ YAKININDAKİ UZMANLAR ═══
            Kurucu: "yakınındaki uzmanlar diye bir alan da olmalı,
            salonların altında."

            Tek bir "Sana yakın" bölümü vardı ve salon yetmezse uzmanları
            da içine katıyordu: müşteri ikisini ayırt edemiyordu. */}
        {nearbyExperts.length > 0 ? (
          <>
            <BolumBasligi
              title={t('home.nearby_experts')}
              onSeeAll={() => router.push('/nearby?tur=uzman')}
            />
            <View style={styles.salonListe}>
              {nearbyExperts.map((pro) => (
                <SaglayiciSatiri key={pro.id} pro={pro} />
              ))}
            </View>
          </>
        ) : null}

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

/**
 * SAĞLAYICI SATIRI — salon ve uzman listelerinin ORTAK satırı.
 *
 * İki bölüm aynı satırı çiziyor. Kopyalasaydım birine eklenen bir rozet
 * ötekinde çıkmaz, ikisi zamanla ayrışırdı.
 */
function SaglayiciSatiri({ pro }: { pro: Professional }) {
  const { t } = useLocale();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const km = mesafe(pro);
  return (
    <PressableScale
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
          {km != null ? `${km.toFixed(1)} km · ` : ''}
          {pro.city}
        </Text>
        {/*
          DEĞERLENDİRİLMEMİŞ sağlayıcı "0,0" DEĞİL: puanı sıfır göstermek
          onu en kötü puanlı gibi sunardı.
        */}
        <View style={styles.olcuSatir}>
          {pro.reviewCount > 0 ? (
            <View style={styles.puanCip}>
              <Ionicons name="star" size={11} color={colors.gold} />
              <Text variant="micro" tone="ink">
                {pro.rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
          {/*
            BAŞARI YÜZDESİ — kurucunun isteğiyle müşteriye de gösteriliyor.
            Uzmanın kendi panelindekiyle AYNI serviste hesaplanıyor.

            Ölçülecek veri yoksa rozet HİÇ çizilmiyor: "%0" yazmak, hiç
            çalışmamış bir uzmana kötü çalıştığını söylemek olurdu.
          */}
          {pro.basariYuzde != null ? (
            <View style={styles.basariCip}>
              <Ionicons name="trending-up" size={11} color={colors.success} />
              <Text variant="micro" tone="ink">
                %{pro.basariYuzde} {t('home.success')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.detayDugme}>
        <Text style={styles.detayYazi}>{t('home.details')}</Text>
      </View>
    </PressableScale>
  );
}

/** Bölüm başlığı — Figma: 20px başlık, sağda 13px "Tümünü Gör", px24. */
function BolumBasligi({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.bolumBas}>
      {/*
        Başlık KESİLİYORDU: "Hizmetler" → "Hizmetle". Satır
        `space-between` ve iki çocuk da esnemiyordu; yer daralınca yazı
        kırpılıyordu. Başlık daralabilir (`flexShrink`) ve gerekirse
        puntosu iner — harf kaybetmez. "Tümünü Gör" ise daralmaz.
      */}
      <Text
        variant="h2"
        tone="ink"
        style={styles.bolumBaslik}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
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
  discount,
  oran = 'dikey',
  onPress,
}: {
  title: string;
  image?: string | undefined;
  subtitle?: string | undefined;
  sponsored?: boolean;
  rating?: number | undefined;
  /** "%30 İndirim" gibi — referans kartta AYRI bir rozet, alt yazı değil. */
  discount?: string | undefined;
  /**
   * Kartın oranı. Öne çıkanlar YATAY, fırsatlar DİKEY — kurucunun isteği.
   * İki bölüm aynı ekranda; farklı oran ikisini bakışta ayırıyor.
   */
  oran?: 'yatay' | 'dikey';
  onPress: () => void;
}) {
  const { t } = useLocale();
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale
      style={oran === 'yatay' ? styles.vitrinKartYatay : styles.vitrinKart}
      onPress={onPress}
    >
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
        {discount ? (
          <View style={styles.indirimRozet}>
            <Text style={styles.indirimYazi}>{discount}</Text>
          </View>
        ) : null}
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
    /*
     * Sabit üst blok — başlık + karşılama + arama.
     *
     * `overflow: hidden`: tepe ışığı bloğu dolduruyor ve alt kenarından
     * taşmamalı, yoksa kayan içeriğin üstüne renk sızardı.
     */
    sabitUst: { overflow: 'hidden' },
    grow: { flex: 1 },

    // header-section (68h)
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    /*
     * Figma `ayna-logo-mark` 80×30 idi. Kurucu iki kez büyüttü:
     * önce %35 (108×41), sonra %30 daha (140×52.5).
     *
     * ORAN KORUNUYOR (80/30 = 140/52.5 = 2.667): tek kenarı büyütmek
     * işareti ezerdi. Kesirli yükseklik bilerek — yuvarlasaydık oran
     * kayardı ve marka işareti hafifçe basık görünürdü.
     */
    logo: { width: 140, height: 52.5 },
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
      minWidth: 16,
      height: 16,
      borderRadius: 100,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    /*
     * Rakam ROZETE ORTALI.
     *
     * `alignItems/justifyContent: center` tek başına yetmiyordu: yazının
     * satır kutusu yazı tipinin kendi ölçülerinden geliyor (Onest üst
     * boşluğu alt boşluğundan büyük), rakam yukarı kaçıyordu. Satır
     * yüksekliğini rozetin yüksekliğine eşitlemek kutuyu simetrik yapıyor.
     * `includeFontPadding` Android'in eklediği ekstra boşluğu kapatıyor.
     */
    rozetYazi: {
      color: colors.onColor,
      fontSize: 10,
      lineHeight: 16,
      textAlign: 'center',
      includeFontPadding: false,
      fontFamily: font.semibold,
    },

    // welcome-vip-area (px24 py20)
    /*
     * ARAMA ÇUBUĞU PORTRENİN ÇİZGİSİNE YAPIŞIK.
     *
     * Kurucu: "search barın üstü müşteri profil fotosunun alt çizgisi
     * ile yapışık olsun. alttakileri üste çek."
     *
     * İki şey gerekiyordu: satır ORTALI değil ALT hizalı olmalı (ortalıyken
     * portre 104px'lik satırın ortasında yüzüyor, çizginin altında pay
     * kalıyordu) ve alt iç boşluk SIFIR olmalı. İkisi birlikte çizgiyi
     * satırın tam alt kenarına oturtuyor; arama onun hemen altında.
     *
     * `paddingTop` ayrı yazıldı: üstteki 20px nefes duruyor, kalkan
     * yalnızca alttaki.
     */
    karsilama: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 0,
      gap: 12,
    },
    // Üst satır: saate göre karşılama. Küçük ve sakin — asıl bilgi altta.
    selamUst: { fontFamily: font.regular, fontSize: 14, lineHeight: 18, color: colors.inkSoft },
    // Alt satır: İSİM. Ekranın konusu bu.
    selamAd: {
      fontFamily: font.semibold,
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: -0.6,
      color: colors.ink,
      marginTop: 2,
    },
    puanSatir: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    puanSayi: { fontFamily: font.semibold, fontSize: 12, color: colors.gold },
    // Ham fotoğraf da sağa yaslı: kesik/ham geçişinde portre yer değiştirmesin.
    avatarHalka: {
      padding: 2,
      borderRadius: 100,
      borderWidth: 1.5,
      borderColor: colors.accent,
      alignSelf: 'flex-end',
    },
    avatar: { width: 52, height: 52, borderRadius: 100 },
    /*
     * Kesilmiş portre: BÜYÜK ve ÇERÇEVESİZ.
     *
     * `resizeMode="contain"`: kesilmiş görselin oranı fotoğraftan
     * fotoğrafa değişiyor; `cover` olsaydı kimini tepesinden keserdi.
     * Yükseklik selamlama bloğundan biraz taşıyor — portre satırın
     * içinde yüzmüyor, ona yaslanıyor.
     */
    portreKesik: { width: 104, height: 104 },
    /*
     * Kap portre ölçüsünde: çizgi "fotoğraf genişliği kadar" olsun diye
     * genişliği buradan alıyor.
     *
     * SAĞA YASLI — kurucunun isteği. `alignItems: 'center'` iken portre
     * 104px'lik kabın ortasında duruyordu ve sağında bir boşluk kalıyordu:
     * ekranın sağ kenarıyla hizalanmıyordu.
     */
    portreKap: { width: 104, alignItems: 'flex-end' },
    portreCizgi: {
      width: '100%',
      height: 2,
      borderRadius: 1,
      backgroundColor: colors.accent,
    },
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
    /*
     * Fotoğrafın ölçüsü AÇIK yazılmalı.
     *
     * `StyleSheet.absoluteFill` tek başına yetmedi: görsel `require` ile
     * geldiği için kendi doğal ölçüsünü (440×660) biliyor ve o ölçüde,
     * sol üstten çiziliyordu. Kart onu kırpınca ekranda fotoğrafın
     * yalnızca sol üst çeyreği görünüyordu — kurucunun gördüğü
     * "aşırı yakınlaşmış" kartlar buydu. Genişlik/yükseklik %100
     * verilince `cover` gerçekten devreye giriyor.
     */
    /*
     * Fotoğraf kartı TAM dolduruyor.
     *
     * `width/height: '100%'` mutlak konumlu bir çocukta İÇ BOŞLUĞA göre
     * hesaplanıyor: kartın 10px yan ve 14px alt dolgusu kadar fotoğraf
     * içeri kaçıyordu — kenarlarda beyaz şerit kalıyordu. Yüzdeleri
     * kaldırmak da olmazdı, o zaman görsel kendi doğal boyutunda çizilip
     * ölçeklenmiyordu (bir önceki hata).
     *
     * Çözüm: DOLGU KARTTAN ALINDI, yazıya verildi. Kartın iç boşluğu yok,
     * yüzde artık kartın tamamı demek.
     */
    hizliFoto: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    hizliKart: {
      flex: 1,
      height: 140,
      borderRadius: 16,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    hizliYazi: {
      // Boşluk artık burada: kart dolgusuz olmalı ki fotoğraf tam otursun.
      paddingBottom: 14,
      paddingHorizontal: 10,
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
    bolumBaslik: { flexShrink: 1 },
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
      backgroundColor: colors.plum,
    },
    iadeIkon: {
      width: 44,
      height: 44,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,240,245,0.16)',
    },
    iadeTenge: { fontFamily: font.semibold, fontSize: 22, color: colors.onColor },
    iadeBaslik: { fontFamily: font.semibold, fontSize: 15, color: colors.onColor },
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
      backgroundColor: colors.onColor,
    },
    iadeDugmeYazi: { fontFamily: font.semibold, fontSize: 13, color: colors.plum },

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
    // Daralmaz: yer daralırsa BAŞLIK küçülsün, bu değil.
    tumuKap: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
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
      /*
       * Kurucunun referans kartı DİKEY (oran ~0.79); bizimki 260×200 ile
       * yatıktı. Fotoğrafın çoğu kırpılıyor ve kart referanstaki ağırlığı
       * taşımıyordu.
       */
      width: 260,
      height: 328,
      borderRadius: 20,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    /*
     * ÖNE ÇIKANLAR YATAY. Fırsatlarla aynı dikey oranı paylaşıyorlardı ve
     * iki bölüm aynı ekranda birbirinin tekrarı gibi duruyordu. Genişlik
     * biraz artıyor: yatık bir kartta aynı başlık daha dar bir alana
     * sıkışırdı.
     */
    vitrinKartYatay: {
      width: 300,
      height: 180,
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
      borderRadius: 8,
      // Referansta BEYAZ hap + koyu yazı; bizimki yarı saydam siyahtı ve
      // fotoğrafa gömülüyordu.
      backgroundColor: colors.onColor,
    },
    sponsorYazi: {
      fontFamily: font.semibold,
      fontSize: 10,
      color: lightColors.accent,
      letterSpacing: 0.8,
    },
    vitrinAlt: { padding: 16, gap: 6 },
    /**
     * İNDİRİM ROZETİ — referansta kehribar hap, beyaz yazı.
     * Eskiden indirim `subtitle`ın yerine yazılıyordu ("-%30"), yani
     * fırsatın gerçek açıklaması ekrana hiç çıkmıyordu.
     */
    indirimRozet: {
      alignSelf: 'flex-start',
      /*
       * SABİT kehribar — temadan gelmiyor. Kart bir FOTOĞRAF ve fotoğraf
       * iki temada da aynı. `colors.gold` koyu temada açılıyor (#F5BE50)
       * ve üstündeki beyaz yazı 1.70:1'e düşüyordu.
       */
      backgroundColor: lightColors.gold,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      marginBottom: 2,
    },
    indirimYazi: { fontFamily: font.semibold, fontSize: 13, color: colors.onColor },
    vitrinBaslik: { fontFamily: font.semibold, fontSize: 19, color: colors.onColor },
    vitrinAltYazi: { fontFamily: font.regular, fontSize: 14, color: 'rgba(255,255,255,0.86)' },

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
    olcuSatir: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    basariCip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
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
