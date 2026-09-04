import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type AdOrder, type BookingStats, type SellerReview } from '../../src/api';
import { formatPrice, RESPONSE_WINDOW_MS, type SellerMetric } from '../../src/data';
import { formatSlotTr } from '../../src/datetime';
import { Redirect } from 'expo-router';
import { greetingKey } from '../../src/greeting';
import { fillParams, useLocale } from '../../src/locale';
import { reklamGunu } from '@ayna/domain';
import {
  selectCommissionRate,
  selectPortraitKesilmis,
  selectPortrait,
  selectUnreadCount,
  useStore,
  uzmanRandevulari,
} from '../../src/store';
import { useUnreadMessages } from '../../src/use-unread-messages';
import { type ColorTokens, font, space } from '../../src/theme';
import { darkColors } from '../../src/theme.palette';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { TepeIsigi, PressableScale, Screen, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

type Period = 'week' | 'month' | 'all';

/** Performans sekmeleri — Figma `tab-bar`. */
/**
 * Canlı Özet kartının zemini ve yazısı — CİHAZ TEMASINDAN BAĞIMSIZ.
 * Kart iki temada da koyu kalıyor (Figma böyle), o yüzden yazısı da sabit
 * açık. Değerler elle yazılmıyor: marka paleti değişirse bunlar da değişsin.
 */
const OZET_YAZI = darkColors.ink;
const OZET_ETIKET = darkColors.accent;

const PERIYOT_ETIKET = {
  week: 'reports.period.week',
  month: 'reports.period.month',
  all: 'reports.period.all',
} as const;

export default function ReportsScreen() {
  /*
   * ── BU EKRAN YALNIZ UZMAN/SALON İÇİN ──────────────────────────────────
   *
   * Kurucu: "müşteri hesabı diye açtığım hesapta premium üyelik aldığımda
   * beni bireysel uzman gibi gösterdi."
   *
   * Sebep abonelik dekontu ekranının KOŞULSUZ buraya yönlendirmesiydi ve o
   * düzeltildi. Ama tek bir yönlendirmeyi onarmak yetmez: bu ekran
   * "Bireysel Uzman" rozeti, "Hizmetlerimi gir" ve "AYNA komisyonu"
   * gösteriyor — bir müşteriye açıldığında hesabının türü değişmiş gibi
   * görünüyor.
   *
   * Kapı ARTIK EKRANIN KENDİSİNDE: nereden gelinirse gelinsin müşteri
   * buraya düşemiyor. Rolü sunucu belirliyor; yerel rol yanlışsa da
   * kullanıcı kendi ana sayfasına gider.
   */
  const rol = useStore((s) => s.currentUser?.role);
  const satici = rol === 'professional' || rol === 'salon';
  if (rol && !satici) return <Redirect href="/discover" />;

  const { t, locale } = useLocale();
  // Derin kart gradyanı artık SEÇİLEN RENKTEN geliyor (`gradients.deep`).
  // Eskiden `[lightColors.accent, '#2D0A2E']` sabitiydi: kullanıcı Zümrüt
  // seçse bile bu kart pembe kalıyordu.
  const { colors, gradients } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('week');
  const salonName = useStore((s) => s.currentUser?.name) ?? 'AYNA İşletme';
  const portre = useStore(selectPortrait); // bayat portre otomatik elenir
  const portreKesilmis = useStore(selectPortraitKesilmis);
  /** §4.2 — uzmanın yanıtını bekleyen talepler; en yakın saat önce. */
  // §9.4 — YALNIZ uzman olarak gelen talepler. Uzmanın kendi müşteri
  // randevuları burada görünmemeli: onlar onun kararını beklemiyor.
  const tumRandevular = useStore((st) => st.bookings);
  /**
   * ROL SÜZGECİ — uzman ekranı yalnız UZMAN OLDUĞU randevuları görür.
   * Süzgeçsizken kendi müşteri randevuları da kalite ölçütlerine ve bekleyen
   * talep listesine karışıyordu.
   */
  const uzmanRandevulariListe = useMemo(() => uzmanRandevulari(tumRandevular), [tumRandevular]);
  /**
   * §4.2 — YANIT BEKLEYEN TALEPLER. Figma'da bu blok yok ("Talepler" kartı
   * şehirdeki AÇIK talepleri gösteriyor, onay bekleyeni değil). Ama burada
   * 3 SAATLİK yanıt penceresi işliyor: uzman ana ekranı açıp "yeni bir şey
   * yok" sanırsa randevu düşer. En üstte, kısıt uyarısının hemen altında.
   */
  const bekleyenTalepler = useMemo(
    () =>
      uzmanRandevulariListe
        .filter((b) => b.status === 'onay_bekliyor')
        .sort((a, b) => a.startMs - b.startMs),
    [uzmanRandevulariListe],
  );
  const insets = useSafeAreaInsets();
  // Karşılama için ad (Keşfet dili) — ilk isim, ilk harf büyük (el yazısı katman)
  const firstRaw = salonName.split(' ')[0] || salonName;
  const firstName = firstRaw.charAt(0).toLocaleUpperCase('tr-TR') + firstRaw.slice(1);
  const unread = useStore(selectUnreadCount);
  const unreadMsg = useUnreadMessages();
  const commissionRate = useStore(selectCommissionRate); // §11 — Platinum'da %8,5
  // §3/§6.1 — hesabın bağı: salon rolü = salon; uzman = bağlı salon adı veya "Bireysel Uzman"
  const role = useStore((s) => s.currentUser?.role);
  const isSalon = role === 'salon'; // §9 uzman ↔ §10 salon ayrımı
  // Faz C — GERÇEK kadro (mock Madina/Aigerim değil); yalnız salon rolünde sorgulanır
  // §4.4/§9.2 — ceza/kısıt durumu: hesap kısıtlıysa dashboard'da 7 gün sayaçlı uyarı
  // Vitrin ücreti SUNUCUDAN: panelden değiştirilen fiyat eski sürümlerde
  // yanlış görünmesin. Değer gelmemişse kart yine çiziliyor, fiyat varsayılan.
  const reklamAylik = useStore((s) => s.config.rates.adMonthlyKzt);
  const [reklamlarim, setReklamlarim] = useState<AdOrder[]>([]);
  /**
   * Kartın üç hâli var ve sırası önemli:
   *   YAYINDA  → ne aldığını ve ne kadar kaldığını göster
   *   BEKLİYOR → "ödemen doğrulanıyor". Bu hâl olmadan uzman satış kartını
   *              görmeye devam eder ve İKİNCİ KEZ ödeyebilir.
   *   yoksa    → satış kartı
   * Birden çok yayında reklam varsa ÖNCE BİTECEK olan gösteriliyor: acil
   * olan o, yenilenmesi gereken de o.
   */
  const simdi = Date.now();
  const yayindaki = reklamlarim
    .filter(
      (o) =>
        o.status === 'yayinda' &&
        o.periodStart != null &&
        o.periodEnd != null &&
        new Date(o.periodEnd).getTime() > simdi,
    )
    .sort((a, b) => new Date(a.periodEnd!).getTime() - new Date(b.periodEnd!).getTime())[0];
  const bekleyenReklam = reklamlarim.find((o) => o.status === 'bekliyor' && o.receiptUri);
  const gunler = yayindaki
    ? reklamGunu(
        new Date(yayindaki.periodStart!).getTime(),
        new Date(yayindaki.periodEnd!).getTime(),
        simdi,
      )
    : null;
  const restricted = useStore((s) => s.currentUser?.restricted ?? false);
  /*
   * KALAN GÜN BİLİNMİYORSA SAYI YAZILMIYOR.
   *
   * `?? 7` vardı: sunucu değeri göndermediğinde ekran kısıtlı uzmana
   * "7 gün kaldı" diyordu. Hesabının ne zaman açılacağı hakkında
   * uydurma bir tarih. Profil ekranı aynı alanı `?? 0` ile okuyup satırı
   * gizliyor; burası tek başına sayı üretiyordu.
   */
  const restrictedDays = useStore((s) => s.currentUser?.restrictedDaysLeft ?? null);
  // Talepler rozeti = şehirdeki açık talepler; reklamlar şehre göre hedeflenir (sektör admin ucunda)
  // §9.3 — Talepler rozeti: şehirdeki AÇIK talepler BULUTTAN sayılır (ekran odaklandıkça tazelenir)
  const token = useStore((s) => s.token);
  const [puanOrt, setPuanOrt] = useState<number | null>(null);
  /*
   * BAŞARI YÜZDESİ sunucudan: bileşenlerin hepsi (tamamlanan/gelen oranı,
   * değerlendirme, cevap süresi) sunucudaki gerçek kayıtlardan geliyor.
   * İstemcide hesaplamak, elindeki eksik listeyle yanlış yüzde üretmek
   * olurdu.
   */
  /*
   * `null` = HENÜZ BİLİNMİYOR. `false` ile aynı saysaydım ekran açılır
   * açılmaz uyarı çakıp sunucu cevabı gelince kaybolurdu.
   */
  const [konumVar, setKonumVar] = useState<boolean | null>(null);
  const [basari, setBasari] = useState<{
    yuzde: number | null;
    bilesenler: { ad: 'is' | 'puan' | 'cevap'; yuzde: number }[];
    showSuccess?: boolean;
  } | null>(null);
  // Kanvasta selamlamanın ÜSTÜNDE günün tarihi var ("Salı, 26 Ağustos").
  // Uzman panele bakınca hangi güne baktığını görmeli.
  const bugunEtiketi = useMemo(
    () =>
      new Date().toLocaleDateString(
        locale === 'tr' ? 'tr-TR' : locale === 'ru' ? 'ru-RU' : 'kk-KZ',
        {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        },
      ),
    [locale],
  );

  // Sıralamayı GERÇEKTEN belirleyen etkenler (uydurma skor yok):
  //  · katalog listesi rating'e göre sıralanıyor (catalog.service orderBy)
  //  · keşifte premium önce geliyor (discover.tsx premium havuzu)
  //  · şehir eşleşmeyen uzman listede HİÇ çıkmıyor (catalog.ts useProfessionals)
  //  · hizmet listesi boşsa müşteri randevu ALAMIYOR (professional/[id] CTA)
  const myCity = useStore((s) => s.currentUser?.city);
  const myTier = useStore((s) => s.currentUser?.membershipTier ?? 'free');
  const myServiceCount = useStore((s) => s.sellerServices.length);
  const gorunurlukEtkenleri = useMemo(
    () => [
      {
        key: 'reports.visibility.services' as const,
        ok: myServiceCount > 0,
        deger:
          myServiceCount > 0
            ? `${myServiceCount} ${t('pro.services_short')}`
            : t('reports.visibility.services_none'),
      },
      {
        key: 'reports.visibility.city' as const,
        ok: !!myCity,
        deger: myCity ?? t('reports.visibility.city_none'),
      },
      {
        key: 'reports.visibility.rating' as const,
        ok: puanOrt != null,
        deger: puanOrt != null ? puanOrt.toFixed(1) : t('reports.visibility.rating_none'),
      },
      {
        key: 'reports.visibility.premium' as const,
        ok: myTier !== 'free',
        deger: myTier === 'free' ? t('reports.visibility.premium_no') : t('premium.title'),
      },
    ],
    [myServiceCount, myCity, puanOrt, myTier, t],
  );
  // Yanıt bekleyen yorum — en düşük puanlı olan önce (uzmanın görünürlüğüne en
  // çok zarar veren o). Yalnız CEVAPSIZ olanlar sayılır.
  const [bekleyenYorum, setBekleyenYorum] = useState<SellerReview | null>(null);
  useEffect(() => {
    if (!token) return;
    let alive = true;
    void (async () => {
      const bizler = await api.myBusinesses(token).catch(() => []);
      const id = bizler[0]?.id;
      if (!id) return;
      const r = await api.businessReviews(token, id).catch(() => null);
      if (!alive || !r) return;
      const cevapsiz = r.reviews.filter((x) => !x.reply?.trim()).sort((a, b) => a.score - b.score);
      setBekleyenYorum(cevapsiz[0] ?? null);
      // Puan AuthUser'da taşınmıyor; görünürlük panelinde UYDURMA sayı yerine
      // yüklenen yorumların gerçek ortalaması gösterilir (yoksa "henüz yok").
      setPuanOrt(
        r.reviews.length ? r.reviews.reduce((n, x) => n + x.score, 0) / r.reviews.length : null,
      );
    })();
    return () => {
      alive = false;
    };
  }, [token]);
  const [openDemands, setOpenDemands] = useState(0);
  // §CRM — bugün doğum günü olan müşterilerim (tıkla → kutlama push'u)
  // Reklam durumu ekrana HER DÖNÜŞTE tazeleniyor: onay admin panelinden
  // geliyor, uygulama onu kendiliğinden öğrenemez.
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      void api
        .myAdOrders()
        .then(setReklamlarim)
        .catch(() => undefined);
      // Başarı yüzdesi de her dönüşte tazeleniyor: yeni tamamlanan
      // randevu ve değerlendirme oranı değiştiriyor.
      void api
        .myPerformance(token)
        .then(setBasari)
        .catch(() => undefined);
      /*
       * Konum durumu da her dönüşte: uzman konumunu girip geri geldiğinde
       * uyarı hemen kalksın, "hâlâ yazıyor" demesin.
       */
      void api
        .myLocation(token)
        .then((r) => setKonumVar(r.hasLocation))
        .catch(() => undefined);
    }, [token]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      let alive = true;
      const pull = () =>
        api
          .openQuoteRequests(token)
          .then(
            (rows) => alive && setOpenDemands(rows.filter((d) => d.status === 'collecting').length),
          )
          .catch(() => undefined);
      void pull();
      const timer = setInterval(pull, 30_000);
      return () => {
        alive = false;
        clearInterval(timer);
      };
    }, [token]),
  );

  // §9.2 — yanıt & kalite metrikleri (yerel randevulardan türer)
  const bookings = uzmanRandevulariListe;
  const quality = useMemo(() => {
    const depositPending = bookings.filter((b) => b.status === 'kesinlesti').length;
    const done = bookings.filter((b) => b.status === 'tamamlandi').length;
    const noShow = bookings.filter((b) => b.status === 'no_show_musteri').length;
    const finished = done + noShow;
    const completion = finished > 0 ? Math.round((done / finished) * 100) : null;
    const responded = bookings.filter((b) => b.respondedAt != null && b.responseDeadline != null);
    const avgMin =
      responded.length > 0
        ? Math.round(
            responded.reduce(
              (sum, b) => sum + (b.respondedAt! - (b.responseDeadline! - RESPONSE_WINDOW_MS)),
              0,
            ) /
              responded.length /
              60_000,
          )
        : null;
    return { depositPending, completion, avgMin };
  }, [uzmanRandevulariListe]);

  // §5 — gerçek randevulardan canlı özet (çevrimdışıysa gizlenir)
  const [stats, setStats] = useState<BookingStats | null>(null);
  useEffect(() => {
    let alive = true;
    api
      .bookingStats()
      .then((s) => alive && setStats(s))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // §9.2 — performans metrikleri GERÇEK stats'tan türetilir (mock DEĞİL): yeni hesapta 0 görünür.
  // Puan/tekrar-müşteri için henüz gerçek kaynak yok → yeterli veri birikene kadar '–'.
  const metrics: SellerMetric[] = [
    {
      id: 'rev',
      labelKey: 'seller.metric.revenue',
      value: stats ? formatPrice(stats.revenue) : '₸0',
      delta: '',
      positive: true,
      icon: 'cash-outline',
    },
    {
      id: 'bk',
      labelKey: 'seller.metric.bookings',
      value: String(stats?.completed ?? 0),
      delta: '',
      positive: true,
      icon: 'calendar-outline',
    },
    {
      id: 'rt',
      labelKey: 'seller.metric.rating',
      value: '–',
      delta: '',
      positive: true,
      icon: 'star-outline',
    },
    {
      id: 'rp',
      labelKey: 'seller.metric.repeat',
      value: '–',
      delta: '',
      positive: true,
      icon: 'repeat-outline',
    },
  ];

  return (
    <Screen edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.icerik}>
        {/* ═══ BAŞLIK — Figma `header-section` (px24, pt12 pb16) ═══
            Tepe ışığı İÇERİDE: başlığın kendi zemini varsa dışarıdaki
            yıkamayı kapatır (müşteri profilinde tam bu hata yaşanmıştı). */}
        <View style={[styles.bas, { paddingTop: insets.top + 12 }]}>
          <TepeIsigi />
          {/* ── ÜST SIRA: tarih solda, eylem ikonları sağda ── */}
          <View style={styles.basSira}>
            <Text style={styles.tarih}>{bugunEtiketi}</Text>
            <View style={styles.basSag}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={t('messages.title')}
                style={styles.basIkon}
                onPress={() => router.push('/messages')}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.ink} />
                {unreadMsg > 0 ? <View style={styles.basNokta} /> : null}
              </PressableScale>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={t('notifications.title')}
                style={styles.basIkon}
                onPress={() => router.push('/notifications')}
              >
                <Ionicons name="notifications-outline" size={20} color={colors.ink} />
                {unread > 0 ? <View style={styles.basNokta} /> : null}
              </PressableScale>
            </View>
          </View>

          {/* ── KARŞILAMA — MÜŞTERİ ANA SAYFASIYLA AYNI DÜZEN ──────────
              Kurucu: "uzman ana sayfası üst taraf tasarımı müşteri ana
              sayfasındaki üst tasarım gibi olmalı."

              Müşteride selamlama ÜSTTE ve küçük, İSİM altta büyük ve
              kalın; portre sağda, kesikse dairesiz ve altında zemin
              çizgisi. Uzmanda hepsi tek satırdı ve isim selamlamanın
              içinde kayboluyordu.

              İÇERİK uzmana ait kalıyor: müşteride puan satırı olan yerde
              burada rol rozeti var — uzman puan toplamıyor. */}
          <View style={styles.karsilama}>
            <View style={styles.basSol}>
              <Text style={styles.selamUst}>{t(greetingKey())}</Text>
              <Text style={styles.selamAd} numberOfLines={1}>
                {firstName || t(isSalon ? 'seller.badge.salon' : 'seller.badge.expert')}
              </Text>
              <View style={styles.rolRozet}>
                <Text style={styles.rolYazi}>
                  {t(isSalon ? 'seller.badge.salon' : 'seller.badge.expert')}
                </Text>
              </View>
            </View>
            {/*
              PORTRE MÜŞTERİ TARAFIYLA AYNI BİÇİMDE.

              Kurucu: "uzmanda da profil fotoğrafı kullanıcı ile aynı
              formatta daire olmadan arkası kesik çıkmalı."

              Kesilmiş portre daireye sokuluyordu: saçı ve omzu daireden
              taşan yerinden kesiliyordu. Ham fotoğraf daire içinde
              kalıyor — kendi arka planını taşıdığı için çerçevesiz
              göstermek odayı panele yapıştırmak olurdu.
            */}
            <PressableScale
              style={portreKesilmis ? styles.portreKap : styles.avatarHalka}
              onPress={() => router.push('/seller/menu')}
            >
              {portre ? (
                <Image
                  source={{ uri: portre }}
                  style={portreKesilmis ? styles.portreKesik : styles.avatar}
                  resizeMode={portreKesilmis ? 'contain' : 'cover'}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarBos]} />
              )}
              {/*
                ZEMİN ÇİZGİSİ — müşteri ana sayfasındakiyle aynı.
                Kesilmiş portrenin zemini saydam; çizgi olmadan figür
                boşlukta asılı duruyor. Ham fotoğrafta çizilmiyor: orada
                zaten bir çerçeve var.
              */}
              {portreKesilmis ? <View style={styles.portreCizgi} /> : null}
            </PressableScale>
          </View>
        </View>

        {/* ═══ HARİTADA GÖRÜNMÜYORSUN ═══
            Konum ekranı VARDI (Menü → Konum) ama uzman oraya girmediği
            sürece haritada görünmediğini HİÇ öğrenmiyordu: eksik bir şey
            olduğunu söyleyen bir yer yoktu. Dokununca doğrudan o ekrana
            gidiyor — uyarı verip çözümü aratmak olmaz. */}
        {konumVar === false ? (
          <PressableScale style={styles.konumUyari} onPress={() => router.push('/seller/location')}>
            <Ionicons name="location-outline" size={20} color={colors.danger} />
            <View style={styles.buyu}>
              <Text variant="bodyStrong" tone="ink">
                {t('reports.no_location')}
              </Text>
              <Text variant="caption" tone="muted">
                {t('reports.no_location_b')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </PressableScale>
        ) : null}

        {/* ═══ HESAP KISITI ═══
            Figma'da yok — tasarımı yapan hesap kısıtlı değildi. Ama kısıtlı
            uzman neden randevu alamadığını bilmek zorunda; uyarıyı silmek
            onu karanlıkta bırakmak olurdu. En üstte, çünkü en acil olan bu. */}
        {restricted ? (
          <View style={styles.kisitKart}>
            <View style={styles.kisitBas}>
              <Ionicons name="alert-circle" size={20} color={colors.danger} />
              <Text style={styles.kisitBaslik}>{t('restricted.title')}</Text>
              {/* Kalan gün bilinmiyorsa satır hiç çizilmiyor — uydurma
                  tarih vermektense söylememek doğru. */}
              {restrictedDays !== null ? (
                <Text style={styles.kisitGun}>
                  {fillParams(t('restricted.days_left'), { n: String(restrictedDays) })}
                </Text>
              ) : null}
            </View>
            <Text style={styles.kisitGovde}>{t('restricted.pay')}</Text>
            <PressableScale style={styles.kisitDugme} onPress={() => router.push('/membership')}>
              <Text style={styles.kisitDugmeYazi}>{t('restricted.cta')}</Text>
            </PressableScale>
          </View>
        ) : null}

        {/* ═══ YANIT BEKLEYEN TALEPLER (§4.2) ═══
            3 saatlik pencere işliyor; ana ekranda görünmezse randevu düşer. */}
        {bekleyenTalepler.length > 0 ? (
          <View style={styles.talepKart}>
            <View style={styles.talepBas}>
              <View style={styles.talepNokta} />
              <Text style={styles.talepUst}>{t('seller.pending.title')}</Text>
              <Text style={styles.talepSayi}>{bekleyenTalepler.length}</Text>
            </View>
            {bekleyenTalepler.slice(0, 3).map((b) => (
              <PressableScale
                key={b.id}
                style={styles.talepSatir}
                onPress={() => router.push(`/booking/${b.id}`)}
              >
                <Text style={styles.talepAd} numberOfLines={1}>
                  {b.customerName ?? t('booking.detail.customer')}
                </Text>
                <Text style={styles.talepZaman}>{formatSlotTr(b.startMs)}</Text>
              </PressableScale>
            ))}
          </View>
        ) : null}

        {/* ═══ YENİ UZMAN — İLK EYLEM ═══
            Figma'da yok: tasarım dolu bir hesabı gösteriyor. Hiç randevusu
            olmayan uzman boş bir ekranla karşılaşırsa ne yapacağını bilemez.
            İş başlayınca kendiliğinden kayboluyor — kalıcı bir uyarı değil. */}
        {bookings.length === 0 ? (
          <View style={styles.baslaKart}>
            <Text style={styles.baslaBaslik}>{t('seller.start.title')}</Text>
            <Text style={styles.baslaAlt}>{t('seller.start.sub')}</Text>
            <View style={styles.baslaSatir}>
              <PressableScale
                style={styles.baslaDugme}
                onPress={() => router.push('/seller/services')}
              >
                <Text style={styles.baslaYazi}>{t('seller.start.services')}</Text>
              </PressableScale>
              <PressableScale
                style={[styles.baslaDugme, styles.baslaDugmeIkincil]}
                onPress={() => router.push('/seller/kyc')}
              >
                <Text style={styles.baslaYaziIkincil}>{t('seller.start.verify')}</Text>
              </PressableScale>
            </View>
          </View>
        ) : null}

        {/* ═══ CANLI ÖZET — Figma `canli-ozet-card` (radius 24, p20, gap 18) ═══
            Koyu mürdüm degrade; üstünde açık yazı. Zemin TEMADAN BAĞIMSIZ:
            bu kart iki temada da koyu kalıyor, yazısı da sabit açık. */}
        <LinearGradient
          colors={gradients.deep}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ozetKart}
        >
          <View style={styles.ozetBas}>
            <Text style={styles.ozetBaslik}>{t('reports.live.title')}</Text>
            <View style={styles.canliNokta} />
          </View>
          <View style={styles.ozetKutular}>
            <OzetKutu value={String(stats?.upcoming ?? 0)} label={t('reports.live.upcoming')} />
            <View style={styles.ozetAyrac} />
            <OzetKutu value={String(stats?.completed ?? 0)} label={t('reports.live.completed')} />
            <View style={styles.ozetAyrac} />
            <OzetKutu value={`%${stats?.noShowRate ?? 0}`} label={t('reports.live.noshow')} />
          </View>
          <View style={styles.ozetCizgi} />
          <View style={styles.ozetPara}>
            <View style={styles.ozetParaSatir}>
              <Text style={styles.ozetParaEtiket}>{t('reports.live.revenue')}</Text>
              <Text style={styles.ozetParaDeger}>{formatPrice(stats?.revenue ?? 0)}</Text>
            </View>
            <View style={styles.ozetParaSatir}>
              <Text style={styles.ozetParaEtiket}>
                {/* Oran metnin İÇİNDE, çünkü yüzde işaretinin yeri dile
                    göre değişiyor: türkçede önde (%10), kazakça ve rusçada
                    arkada (10%). Ekranda birleştirseydik biri yanlış olurdu. */}
                {fillParams(t('reports.live.commission'), { pct: String(commissionRate) })}
              </Text>
              <Text style={styles.ozetParaDeger}>
                {formatPrice(Math.round(((stats?.revenue ?? 0) * commissionRate) / 100))}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/*
          ── BÖLÜM SIRASI KURUCUNUN İSTEĞİ ─────────────────────────────
          "daha çok müşteriye ulaş bölümü talepler ve takvimim bloğunun
          altında olmalı" · "ayna vitrin bloğu yanıt ve kalite bloğunun
          altında olmalı".

          Sıra: günlük iş (talepler + takvim) → paket tanıtımı → yanıt &
          kalite → vitrin. Satış kartları uzmanın işinin ÜSTÜNDE
          duruyordu; önce yapması gerekeni görsün.
        */}
        {/* ═══ TALEPLER + TAKVİM — Figma `grid-row` (iki kart, radius 20, p16) ═══ */}
        <View style={styles.ikiliSatir}>
          <IkiliKart
            ikon="file-tray-outline"
            title={t('reports.action.requests')}
            sub={t('seller.card.requests_sub')}
            badge={openDemands}
            onPress={() => router.push('/seller/requests')}
          />
          <IkiliKart
            ikon="calendar-outline"
            title={t('reports.action.agenda_own')}
            sub={t('seller.card.agenda_sub')}
            badge={stats?.upcoming ?? 0}
            onPress={() => router.push('/seller/agenda')}
          />
        </View>

        {/* ═══ PAKET TANITIMI — Figma `promo-card` (radius 24, p20, gap 16) ═══ */}
        <PressableScale style={styles.paketKart} onPress={() => router.push('/membership')}>
          <View style={styles.paketIkon}>
            <Ionicons name="star" size={22} color={colors.accent} />
          </View>
          <View style={styles.buyu}>
            <Text style={styles.paketBaslik}>{t('seller.promo.title')}</Text>
            <Text style={styles.paketAlt}>{t('seller.promo.sub')}</Text>
            <Text style={styles.paketBag}>{t('seller.promo.cta')}</Text>
          </View>
        </PressableScale>

        {/* ═══ BAŞARI DURUMU ═══
            Kurucu: "uzman ve salon puan toplayamaz. uzmanlar aldıkları
            onaylanıp hizmet verilmiş rezervasyon sayısı, değerlendirme
            notu başarısı, cevap verme süresi ve bunun gibi başarı
            durumlarına göre yüzde üzerinden değerlendirilir."

            Yüzde ÖLÇÜLEBİLENLERDEN: hiç randevusu olmayan uzmana "%0"
            yazmak, hiç çalışmamış birine kötü çalıştığını söylemek
            olurdu — o durumda yüzde yerine sebebi yazılıyor. */}
        <View style={styles.kaliteKart}>
          <Text style={styles.kaliteBaslik}>{t('reports.success.title')}</Text>
          {basari?.yuzde === null || basari === null ? (
            <Text variant="caption" tone="muted">
              {t('reports.success.none')}
            </Text>
          ) : (
            <>
              <Text style={styles.basariYuzde}>%{basari.yuzde}</Text>
              {/*
                Müşteriyle paylaşılmıyorsa uzman bunu BURADA görüyor:
                kapattığını unutup "neden görünmüyorum" diye sormasın.
              */}
              {basari.showSuccess === false ? (
                <Text variant="micro" tone="muted">
                  {t('reports.success.hidden')}
                </Text>
              ) : null}
              <View style={styles.basariSatir}>
                {basari.bilesenler.map((b) => (
                  <View key={b.ad} style={styles.basariKutu}>
                    <Text variant="micro" tone="muted" numberOfLines={1}>
                      {t(
                        b.ad === 'is'
                          ? 'reports.success.is'
                          : b.ad === 'puan'
                            ? 'reports.success.puan'
                            : 'reports.success.cevap',
                      )}
                    </Text>
                    <Text variant="bodyStrong" tone="ink">
                      %{b.yuzde}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* ═══ YANIT & KALİTE — Figma `yanit-kalite-card` (radius 24, p20) ═══ */}
        <View style={styles.kaliteKart}>
          <Text style={styles.kaliteBaslik}>{t('reports.quality.title')}</Text>
          <View style={styles.kaliteSatir}>
            <KaliteKutu
              value={
                quality.avgMin != null
                  ? `${quality.avgMin} ${t('pro.min')}`
                  : t('reports.quality.none')
              }
              label={t('reports.quality.avg_response')}
              vurgu
            />
            <View style={styles.kaliteAyrac} />
            <KaliteKutu
              value={String(quality.depositPending)}
              label={t('reports.quality.deposit_pending')}
            />
            <View style={styles.kaliteAyrac} />
            <KaliteKutu
              value={
                quality.completion != null ? `%${quality.completion}` : t('reports.quality.none')
              }
              label={t('reports.quality.completion')}
            />
          </View>
          <View style={styles.ipucu}>
            <Text style={styles.ipucuYazi}>{t('reports.quality.tip')}</Text>
          </View>
        </View>

        {/* ═══ REKLAM — Figma `reklam-banner` (radius 24, p16, kenarlık altın) ═══
            Üç hâl: yayında (sayaç) · ödeme doğrulanıyor · satış. Sıra önemli:
            bekleyen hâli olmadan uzman satış kartını görüp İKİNCİ KEZ öder. */}
        {yayindaki && gunler ? (
          <PressableScale style={styles.reklamKart} onPress={() => router.push('/seller/ads')}>
            <View style={styles.reklamBas}>
              <View style={styles.reklamCanli} />
              <Text style={styles.reklamUst}>{t('ads.live.title')}</Text>
            </View>
            <View style={styles.reklamBaslikKap}>
              <Text style={styles.reklamBaslik} numberOfLines={1}>
                {yayindaki.title}
              </Text>
              <Text style={styles.reklamAlt}>
                {fillParams(t('ads.live.where'), {
                  yer: t(
                    yayindaki.placement === 'firsatlar'
                      ? 'ads.place.firsatlar'
                      : 'ads.place.one_cikanlar',
                  ),
                })}
              </Text>
            </View>
            <View style={styles.reklamIlerlemeKap}>
              <View style={styles.reklamYol}>
                <View
                  style={[
                    styles.reklamDolu,
                    { width: `${Math.round((gunler.gun / gunler.toplam) * 100)}%` },
                  ]}
                />
              </View>
              <View style={styles.reklamEtiketler}>
                <Text style={styles.reklamGun}>
                  {fillParams(t('ads.live.progress'), {
                    gun: String(gunler.gun),
                    toplam: String(gunler.toplam),
                  })}
                </Text>
                <Text style={styles.reklamKalan}>
                  {gunler.kalan <= 1
                    ? t('ads.live.last_day')
                    : fillParams(t('ads.live.left'), { kalan: String(gunler.kalan) })}
                </Text>
              </View>
            </View>
          </PressableScale>
        ) : bekleyenReklam ? (
          <PressableScale style={styles.reklamKart} onPress={() => router.push('/seller/ads')}>
            <View style={styles.reklamBas}>
              <View style={[styles.reklamCanli, styles.reklamBekleyenNokta]} />
              <Text style={styles.reklamUst}>{t('ads.promo.eyebrow')}</Text>
            </View>
            <View style={styles.reklamBaslikKap}>
              <Text style={styles.reklamBaslik}>{t('ads.wait.title')}</Text>
              <Text style={styles.reklamAlt}>{t('ads.wait.body')}</Text>
            </View>
          </PressableScale>
        ) : (
          <PressableScale style={styles.reklamKart} onPress={() => router.push('/seller/ads')}>
            <View style={styles.reklamBas}>
              <View style={styles.reklamCanli} />
              <Text style={styles.reklamUst}>{t('ads.promo.eyebrow')}</Text>
            </View>
            <View style={styles.reklamBaslikKap}>
              <Text style={styles.reklamBaslik}>{t('ads.promo.title')}</Text>
              <Text style={styles.reklamAlt}>{t('ads.promo.body')}</Text>
            </View>
            <View style={styles.reklamAltSatir}>
              <Text style={styles.reklamFiyat}>
                {/*
                  FİYAT SUNUCUDAN. `?? 200000` vardı: yapılandırma
                  yüklenmemişse uzmana uydurma bir aylık ücret
                  gösteriliyordu.
                */}
                {reklamAylik
                  ? fillParams(t('ads.promo.price'), {
                      amount: reklamAylik.toLocaleString('tr-TR'),
                    })
                  : t('ads.promo.cta')}
              </Text>
              <Text style={styles.reklamKalan}>{t('ads.promo.cta')} →</Text>
            </View>
          </PressableScale>
        )}

        {/* ═══ YANIT BEKLEYEN YORUM ═══
            Figma'da ayrı bir kart yok; cevapsız kalan düşük puanlı yorum
            uzmanın görünürlüğüne en çok zarar veren şey, panelden düşmemeli. */}
        {bekleyenYorum ? (
          <View style={styles.bolum}>
            <Text style={styles.bolumBaslik}>{t('reports.review_waiting')}</Text>
          </View>
        ) : null}
        {bekleyenYorum ? (
          <PressableScale style={styles.yorumKart} onPress={() => router.push('/seller/reviews')}>
            <View style={styles.yorumBas}>
              <View style={styles.yorumIkon}>
                <Ionicons name="chatbubble-ellipses" size={17} color={colors.accent} />
              </View>
              <View style={styles.buyu}>
                <Text style={styles.yorumAd} numberOfLines={1}>
                  {bekleyenYorum.authorLabel}
                </Text>
                <Text style={styles.yorumHizmet} numberOfLines={1}>
                  {bekleyenYorum.serviceTag}
                </Text>
              </View>
              <Text style={styles.yorumPuan}>★ {bekleyenYorum.score.toFixed(1)}</Text>
            </View>
            <Text style={styles.yorumMetin} numberOfLines={3}>
              {bekleyenYorum.comment}
            </Text>
          </PressableScale>
        ) : null}

        {/* ═══ PERFORMANS — Figma `performans-section` (sekmeler + 2×2) ═══ */}
        <View style={styles.bolum}>
          <Text style={styles.bolumBaslik}>{t('reports.perf.title')}</Text>
          <View style={styles.sekmeCubugu}>
            {(['week', 'month', 'all'] as const).map((p) => (
              <PressableScale
                key={p}
                style={[styles.sekme, period === p && styles.sekmeAktif]}
                onPress={() => setPeriod(p)}
              >
                <Text style={period === p ? styles.sekmeYaziAktif : styles.sekmeYazi}>
                  {t(PERIYOT_ETIKET[p])}
                </Text>
              </PressableScale>
            ))}
          </View>
          <View style={styles.perfIzgara}>
            {metrics.map((m) => (
              <View key={m.labelKey} style={styles.perfKutu}>
                <Text style={styles.perfEtiket}>{t(m.labelKey)}</Text>
                <Text style={styles.perfDeger}>{m.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ═══ NEDEN GÖRÜNÜYORSUN — Figma `neden-gorunuyorsun-section` ═══
            Sıralamanın nasıl işlediğini AÇIK ediyor: gizli puan yok. */}
        <View style={styles.bolum}>
          <Text style={styles.bolumBaslik}>{t('reports.visibility.title')}</Text>
          <View style={styles.gorunurKart}>
            <Text style={styles.gorunurAciklama}>{t('reports.visibility.desc')}</Text>
            <View style={styles.gorunurCizgi} />
            <View style={styles.gorunurListe}>
              {gorunurlukEtkenleri.map((e) => (
                <View key={e.key} style={styles.gorunurSatir}>
                  <Ionicons
                    name={e.ok ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={e.ok ? colors.success : colors.gold}
                  />
                  <View style={styles.buyu}>
                    {/* Figma: kalın satır "etken — değer", altında ne işe
                        yaradığını söyleyen ince not. Metinler zaten i18n'de
                        tek cümle hâlinde; tire öncesi başlık, sonrası not. */}
                    <Text style={[styles.gorunurAd, !e.ok && { color: colors.gold }]}>
                      {t(e.key).split(' — ')[0]} — {e.deger}
                    </Text>
                    <Text style={styles.gorunurNot}>{t(e.key).split(' — ')[1] ?? ''}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

/** Canlı Özet sayısı — koyu kart üstünde, Figma `metric-box`. */
function OzetKutu({ value, label }: { value: string; label: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.ozetKutu}>
      <Text style={styles.ozetSayi}>{value}</Text>
      <Text style={styles.ozetEtiket}>{label}</Text>
    </View>
  );
}

/** Yanıt & Kalite ölçütü — Figma `metric-item`; ilki altın vurgulu. */
function KaliteKutu({ value, label, vurgu }: { value: string; label: string; vurgu?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.kaliteKutu, vurgu && styles.kaliteKutuVurgu]}>
      <Text style={[styles.kaliteDeger, vurgu && styles.kaliteDegerVurgu]}>{value}</Text>
      <Text style={styles.kaliteEtiket} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Talepler / Takvim — Figma `grid-row` kartı (radius 20, üstte altın çizgi). */
function IkiliKart({
  ikon,
  title,
  sub,
  badge,
  onPress,
}: {
  ikon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  badge: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale style={styles.ikiliKart} onPress={onPress}>
      <View style={styles.ikiliCizgi} />
      <View style={styles.ikiliBas}>
        <View style={styles.ikiliIkon}>
          <Ionicons name={ikon} size={20} color={colors.accent} />
        </View>
        {badge > 0 ? (
          <View style={styles.ikiliRozet}>
            <Text style={styles.ikiliRozetYazi}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.ikiliBaslik}>{title}</Text>
      <Text style={styles.ikiliAlt}>{sub}</Text>
    </PressableScale>
  );
}

/** Ölçüler Figma `ayna-expert-light`ten BİREBİR — yuvarlanmadı. */
const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    icerik: { paddingBottom: TAB_BAR_CLEARANCE, gap: 20 },
    buyu: { flex: 1 },

    // header-section (px24, pt12 pb16)
    /*
     * BAŞLIK MÜŞTERİ ANA SAYFASIYLA AYNI DÜZENDE.
     *
     * Eskiden tek satırdı: tarih, selamlama+isim ve rozet solda, ikonlar
     * sağda. İsim selamlamanın içinde kayboluyordu. Artık iki katman —
     * üst sıra (tarih + ikonlar), altında karşılama bloğu.
     */
    bas: {
      paddingHorizontal: 24,
      paddingBottom: 16,
      gap: 12,
    },
    basSira: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    // Karşılama: metin solda esner, portre sağda sabit.
    karsilama: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
    basSol: { flex: 1, gap: 2 },
    // Müşteri ana sayfasıyla AYNI ölçüler: selam küçük üstte, isim büyük altta.
    selamUst: { fontFamily: font.regular, fontSize: 14, lineHeight: 18, color: colors.inkSoft },
    selamAd: {
      fontFamily: font.semibold,
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: -0.6,
      color: colors.ink,
      marginTop: 2,
    },
    tarih: {
      fontFamily: font.medium,
      fontSize: 11,
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    selam: { fontFamily: font.semibold, fontSize: 20, color: colors.ink },
    rolRozet: {
      alignSelf: 'flex-start',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    rolYazi: { fontFamily: font.semibold, fontSize: 9, color: colors.accent },
    basSag: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    basIkon: {
      width: 44,
      height: 44,
      borderRadius: 100,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    basNokta: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.danger,
    },
    avatarHalka: { padding: 2, borderRadius: 100, borderWidth: 1.5, borderColor: colors.accent },
    avatar: { width: 40, height: 40, borderRadius: 100 },
    // Kesilmiş portre: çerçevesiz, zeminsiz, kırpmasız — ana sayfayla aynı.
    /*
     * Müşteri ana sayfasıyla AYNI ölçü (104): kurucu iki ekranın üst
     * tasarımının aynı olmasını istedi. 48'de kalsaydı aynı düzende ama
     * belirgin biçimde küçük bir portre olurdu.
     *
     * SAĞA YASLI ve kap portre genişliğinde: zemin çizgisi genişliğini
     * buradan alıyor.
     */
    portreKap: { width: 104, alignItems: 'flex-end' },
    portreKesik: { width: 104, height: 104 },
    portreCizgi: { width: '100%', height: 2, borderRadius: 1, backgroundColor: colors.accent },
    avatarBos: { backgroundColor: colors.accentSoft },

    // canli-ozet-card (radius 24, p20, gap 18) — koyu, iki temada da sabit
    ozetKart: { marginHorizontal: 24, borderRadius: 24, padding: 20, gap: 18, overflow: 'hidden' },
    ozetBas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    ozetBaslik: {
      fontFamily: font.semibold,
      fontSize: 14,
      color: OZET_YAZI,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    canliNokta: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4DA66B' },
    ozetKutular: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    ozetKutu: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
      padding: 12,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderWidth: 1,
      borderColor: 'rgba(212,160,160,0.2)',
    },
    ozetSayi: { fontFamily: font.semibold, fontSize: 22, color: OZET_YAZI },
    ozetEtiket: { fontFamily: font.regular, fontSize: 11, color: OZET_ETIKET },
    ozetAyrac: { width: 1, height: 40, backgroundColor: 'rgba(212,160,160,0.2)' },
    ozetCizgi: { height: 1, backgroundColor: 'rgba(212,160,160,0.2)' },
    ozetPara: { gap: 10 },
    ozetParaSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    ozetParaEtiket: { fontFamily: font.regular, fontSize: 13, color: OZET_ETIKET },
    ozetParaDeger: { fontFamily: font.semibold, fontSize: 14, color: OZET_YAZI },

    // promo-card (radius 24, p20, gap 16)
    paketKart: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginHorizontal: 24,
      padding: 20,
      borderRadius: 24,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.lineStrong,
    },
    paketIkon: {
      width: 48,
      height: 48,
      borderRadius: 100,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    paketBaslik: { fontFamily: font.semibold, fontSize: 16, color: colors.ink },
    paketAlt: {
      fontFamily: font.regular,
      fontSize: 13,
      lineHeight: 16,
      color: colors.muted,
      marginTop: 6,
    },
    paketBag: { fontFamily: font.semibold, fontSize: 12, color: colors.accent, marginTop: 6 },

    // grid-row (iki kart, radius 20, p16, gap 12)
    ikiliSatir: { flexDirection: 'row', gap: 12, marginHorizontal: 24 },
    ikiliKart: {
      flex: 1,
      padding: 16,
      gap: 10,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    // Figma: üstte 1px altın çizgi (%60 opaklık) — kartın "canlı" işareti.
    ikiliCizgi: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: colors.gold,
      opacity: 0.6,
    },
    ikiliBas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    ikiliIkon: {
      width: 40,
      height: 40,
      borderRadius: 100,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
    },
    ikiliRozet: {
      minWidth: 32,
      height: 32,
      borderRadius: 16,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
    },
    ikiliRozetYazi: { fontFamily: font.semibold, fontSize: 16, color: colors.onAccent },
    ikiliBaslik: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
    ikiliAlt: { fontFamily: font.regular, fontSize: 11, color: colors.muted },

    // reklam-banner (radius 24, p16, gap 12, altın kenarlık)
    reklamKart: {
      marginHorizontal: 24,
      padding: 16,
      gap: 12,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.gold,
    },
    reklamBas: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    reklamCanli: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4DA66B' },
    reklamBekleyenNokta: { backgroundColor: colors.gold },
    reklamUst: {
      fontFamily: font.semibold,
      fontSize: 11,
      color: colors.ink,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    reklamBaslikKap: { gap: 4 },
    reklamBaslik: { fontFamily: font.semibold, fontSize: 16, color: colors.ink },
    reklamAlt: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
    reklamIlerlemeKap: { gap: 6 },
    reklamYol: {
      height: 4,
      borderRadius: 100,
      backgroundColor: colors.accentSoft,
      overflow: 'hidden',
    },
    reklamDolu: { height: 4, borderRadius: 100, backgroundColor: colors.accent },
    reklamEtiketler: { flexDirection: 'row', justifyContent: 'space-between' },
    reklamGun: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
    reklamKalan: { fontFamily: font.semibold, fontSize: 11, color: colors.accent },
    reklamAltSatir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    reklamFiyat: { fontFamily: font.semibold, fontSize: 12, color: colors.gold },

    // yanit-kalite-card (radius 24, p20, gap 16)
    konumUyari: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      marginHorizontal: 24,
      padding: space(1.75),
      borderRadius: 20,
      backgroundColor: colors.dangerSoft,
    },
    basariYuzde: { fontFamily: font.semibold, fontSize: 34, color: colors.accentFg },
    basariSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginTop: space(0.5) },
    basariKutu: { gap: 2 },
    kaliteKart: {
      marginHorizontal: 24,
      padding: 20,
      gap: 16,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    kaliteBaslik: {
      fontFamily: font.semibold,
      fontSize: 13,
      color: colors.ink,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    kaliteSatir: { flexDirection: 'row', alignItems: 'center' },
    kaliteKutu: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      padding: 12,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    kaliteKutuVurgu: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
    kaliteDeger: { fontFamily: font.semibold, fontSize: 22, color: colors.ink },
    kaliteDegerVurgu: { color: colors.gold },
    kaliteEtiket: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
    kaliteAyrac: { width: 1, height: 32, backgroundColor: colors.line },
    ipucu: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.accentSoft,
    },
    ipucuYazi: { fontFamily: font.regular, fontSize: 11, lineHeight: 16, color: colors.accent },

    // yeni uzman ilk eylem (Figma'da yok — boş ekran yön göstermez)
    baslaKart: {
      marginHorizontal: 24,
      padding: 16,
      gap: 12,
      borderRadius: 20,
      backgroundColor: colors.accentSoft,
    },
    baslaBaslik: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
    baslaAlt: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
    baslaSatir: { flexDirection: 'row', gap: 8 },
    baslaDugme: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 100,
      backgroundColor: colors.accent,
    },
    baslaDugmeIkincil: { backgroundColor: colors.surface },
    baslaYazi: { fontFamily: font.semibold, fontSize: 13, color: colors.onAccent },
    baslaYaziIkincil: { fontFamily: font.semibold, fontSize: 13, color: colors.accent },

    // yanıt bekleyen talepler (§4.2 — Figma'da yok, süre işliyor)
    talepKart: {
      marginHorizontal: 24,
      padding: 16,
      gap: 10,
      borderRadius: 20,
      backgroundColor: colors.goldSoft,
      borderWidth: 1,
      borderColor: colors.gold,
    },
    talepBas: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    talepNokta: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
    talepUst: { flex: 1, fontFamily: font.semibold, fontSize: 13, color: colors.ink },
    talepSayi: { fontFamily: font.semibold, fontSize: 15, color: colors.gold },
    talepSatir: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    talepAd: { flex: 1, fontFamily: font.regular, fontSize: 13, color: colors.inkSoft },
    talepZaman: { fontFamily: font.medium, fontSize: 13, color: colors.ink },

    // hesap kısıtı (Figma'da yok — işlevsel gereklilik)
    kisitKart: {
      marginHorizontal: 24,
      padding: 16,
      gap: 10,
      borderRadius: 20,
      backgroundColor: colors.dangerSoft,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    kisitBas: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    kisitBaslik: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.ink },
    kisitGun: { fontFamily: font.semibold, fontSize: 11, color: colors.danger },
    kisitGovde: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
    kisitDugme: {
      alignSelf: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 100,
      backgroundColor: colors.accent,
    },
    kisitDugmeYazi: { fontFamily: font.semibold, fontSize: 13, color: colors.onAccent },

    // yanıt bekleyen yorum
    yorumKart: {
      marginHorizontal: 24,
      padding: 16,
      gap: 10,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    yorumBas: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    yorumIkon: {
      width: 36,
      height: 36,
      borderRadius: 100,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
    },
    yorumAd: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
    yorumHizmet: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
    yorumPuan: { fontFamily: font.semibold, fontSize: 13, color: colors.gold },
    yorumMetin: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.inkSoft },

    // performans + neden görünüyorsun
    bolum: { marginHorizontal: 24, gap: 12 },
    bolumBaslik: { fontFamily: font.semibold, fontSize: 18, color: colors.ink },
    sekmeCubugu: {
      flexDirection: 'row',
      gap: 4,
      padding: 4,
      borderRadius: 100,
      backgroundColor: colors.accentSoft,
    },
    sekme: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 100,
    },
    sekmeAktif: { backgroundColor: colors.surface },
    sekmeYazi: { fontFamily: font.medium, fontSize: 13, color: colors.muted },
    sekmeYaziAktif: { fontFamily: font.semibold, fontSize: 13, color: colors.accent },
    perfIzgara: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    perfKutu: {
      width: '48%',
      flexGrow: 1,
      padding: 16,
      gap: 6,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    perfEtiket: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
    perfDeger: { fontFamily: font.semibold, fontSize: 16, color: colors.ink },

    gorunurKart: {
      padding: 16,
      gap: 16,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    gorunurAciklama: {
      fontFamily: font.regular,
      fontSize: 13,
      lineHeight: 18,
      color: colors.muted,
    },
    gorunurCizgi: { height: 1, backgroundColor: colors.line },
    gorunurListe: { gap: 12 },
    gorunurSatir: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    gorunurAd: { fontFamily: font.semibold, fontSize: 13, color: colors.ink },
    gorunurNot: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginTop: 2 },
  });
