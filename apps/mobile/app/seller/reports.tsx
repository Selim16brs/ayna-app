import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type BookingStats, type SellerReview } from '../../src/api';
import {
  formatPrice,
  RESPONSE_WINDOW_MS,
  type SellerMetric,
  type SupplierAd,
} from '../../src/data';
import { greetingKey } from '../../src/greeting';
import { fillParams, useLocale } from '../../src/locale';
import { useSalonStaff } from '../../src/staff';
import { selectCommissionRate, selectPortrait, selectUnreadCount, useStore } from '../../src/store';
import { useUnreadMessages } from '../../src/use-unread-messages';
import { type ColorTokens, radius, space, font } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  PressableScale,
  Screen,
  SectionHeader,
  Segmented,
  TAB_BAR_CLEARANCE,
  Text,
  TierUpsell,
} from '../../src/ui';

type Period = 'week' | 'month' | 'all';
type IoniconName = keyof typeof Ionicons.glyphMap;

export default function ReportsScreen() {
  const { t, locale } = useLocale();
  const { colors, gradients, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('week');
  const salonName = useStore((s) => s.currentUser?.name) ?? 'AYNA İşletme';
  const portre = useStore(selectPortrait); // bayat portre otomatik elenir
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
  const { staff: salonStaff } = useSalonStaff();
  const businessName = useStore((s) => s.currentUser?.businessName);
  // §4.4/§9.2 — ceza/kısıt durumu: hesap kısıtlıysa dashboard'da 7 gün sayaçlı uyarı
  const restricted = useStore((s) => s.currentUser?.restricted ?? false);
  const restrictedDays = useStore((s) => s.currentUser?.restrictedDaysLeft ?? 7);
  const binding =
    role === 'salon'
      ? { icon: 'business' as const, text: t('reports.identity.salon') }
      : businessName
        ? { icon: 'link' as const, text: businessName }
        : { icon: 'person' as const, text: t('reports.identity.independent') };
  // Talepler rozeti = şehirdeki açık talepler; reklamlar şehre göre hedeflenir (sektör admin ucunda)
  // §9.3 — Talepler rozeti: şehirdeki AÇIK talepler BULUTTAN sayılır (ekran odaklandıkça tazelenir)
  const token = useStore((s) => s.token);
  const [puanOrt, setPuanOrt] = useState<number | null>(null);
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
  const myServiceCount = useStore((s) => Object.keys(s.sellerServices).length);
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
  const [bdays] = useState<{ id: string; name: string }[]>([]);
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
  const ads: SupplierAd[] = []; // demo tedarikçi reklamı YOK (admin ucu bağlanınca gerçek veri)

  // §9.2 — yanıt & kalite metrikleri (yerel randevulardan türer)
  const bookings = useStore((s) => s.bookings);
  const quality = useMemo(() => {
    const depositPending = bookings.filter((b) => b.status === 'deposit_submitted').length;
    const done = bookings.filter((b) => b.status === 'completed').length;
    const noShow = bookings.filter((b) => b.status === 'no_show').length;
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
  }, [bookings]);

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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── BAŞLIK — kanvas UzmanPanel.dc.html §başlık ──
            Burada MOR BİR BANT vardı: accent zemin, dalga bitişi, 70pt el
            yazısı ad ve 262px cut-out portre. Kanvasın uzman panelinde böyle
            bir bant yok; açık zeminde solda 54'lük portre, sağda küçük tarih
            ve altında koyu selamlama var. Uygulamanın geri kalanı kanvasa
            geçmişken uzmanın ANA EKRANI eski dilde kalmıştı. */}
        <View style={[styles.hero, { paddingTop: insets.top + space(1.5) }]}>
          <View style={styles.heroRow}>
            <View style={styles.heroAvatar}>
              {portre ? (
                <Image source={{ uri: portre }} style={styles.heroAvatarImg} />
              ) : (
                <Ionicons name="person" size={24} color={colors.accentFg} />
              )}
            </View>
            <View style={styles.heroText}>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {bugunEtiketi}
              </Text>
              {/* Rusça selamlama uzun ("Доброй ночи, Дарина") ve isim
                  kırpılıyordu. Karakter kaybetmek yerine punto küçülür. */}
              <Text
                tone="ink"
                style={styles.greetName}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {t(greetingKey())}, {firstName}
              </Text>
            </View>
            {/* Mesajlar bildirimin YANINDA — profil menüsünden çıkarıldı. */}
            <PressableScale
              style={[styles.bell, shadow.soft]}
              onPress={() => router.push('/messages')}
              accessibilityRole="button"
              accessibilityLabel={t('messages.title')}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.ink} />
              {unreadMsg > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadMsg > 9 ? '9+' : String(unreadMsg)}
                  </Text>
                </View>
              ) : null}
            </PressableScale>
            <PressableScale
              style={[styles.bell, shadow.soft]}
              onPress={() => router.push('/notifications')}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.ink} />
              {unread > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : String(unread)}</Text>
                </View>
              ) : null}
            </PressableScale>
          </View>
          {/* Bağ bilgisi (Bireysel Uzman / bağlı salon) — kanvasta başlığın
              yanındaki durum çipinin karşılığı. */}
          <View style={[styles.bindingPill, shadow.soft]}>
            <Ionicons name={binding.icon} size={12} color={colors.ink} />
            {/* Çip YAZI KADAR açılır: punto küçültmek yerine kap büyür.
                Metin daralmaz (flexShrink 0), çip de içeriğini sarar
                (alignSelf flex-start) — "Bireysel Uzm…" olmaz. */}
            <Text variant="caption" tone="ink" style={styles.bindingPillText} numberOfLines={1}>
              {binding.text}
            </Text>
          </View>
        </View>

        {/* Canlı Özet — yeşile bağlı, iki yanda eşit beyaz kalan dar mor kart */}
        {stats ? (
          <LinearGradient colors={gradients.plum} style={styles.liveBand}>
            <View style={styles.liveHead}>
              <Ionicons name="pulse" size={15} color={colors.onColor} />
              <Text variant="label" tone="onColor">
                {t('reports.live.title')}
              </Text>
            </View>
            <View style={styles.liveRow}>
              <LiveTile value={String(stats.upcoming)} label={t('reports.live.upcoming')} />
              <LiveTile value={String(stats.completed)} label={t('reports.live.completed')} />
              <LiveTile value={`%${stats.noShowRate}`} label={t('reports.live.noshow')} />
            </View>
            <View style={styles.liveDivider} />
            <View style={styles.liveRevenue}>
              <Text variant="caption" tone="onColor" style={styles.dim}>
                {t('reports.live.revenue')}
              </Text>
              <Text variant="h2" tone="onColor">
                {formatPrice(stats.revenue)}
              </Text>
            </View>
            {/* §12.8 — ödenecek komisyon (online ciro × oran); yalnız online randevulardan */}
            <View style={styles.liveRevenue}>
              <Text variant="caption" tone="onColor" style={styles.dim}>
                {t('reports.live.commission')} (%{commissionRate})
              </Text>
              <Text variant="bodyStrong" tone="onColor">
                {formatPrice(stats.commission)}
              </Text>
            </View>
          </LinearGradient>
        ) : null}

        <View style={styles.body}>
          {/* §6 — İLK EYLEM. Yeni uzman SIFIRLARLA dolu bir gösterge paneline
              düşüyordu: tamamlanan 0, gelir 0, no-show %0 — ve ne yapacağına
              dair hiçbir yönlendirme yoktu. Denetim ilk ekranda tek, baskın
              bir birincil aksiyon istiyor.

              Yalnız HENÜZ RANDEVUSU OLMAYANA gösteriliyor; işi başlayınca
              kart kendiliğinden kayboluyor. */}
          {bookings.length === 0 ? (
            <View style={[styles.startCard, shadow.soft]}>
              <Text variant="bodyStrong" tone="ink">
                {t('seller.start.title')}
              </Text>
              <Text variant="caption" tone="muted" style={styles.startSub}>
                {t('seller.start.sub')}
              </Text>
              <View style={styles.startRow}>
                <PressableScale
                  style={styles.startPrimary}
                  onPress={() => router.push('/seller/services')}
                >
                  <Text variant="caption" tone="onAccent" style={styles.startPrimaryText}>
                    {t('seller.start.services')}
                  </Text>
                </PressableScale>
                <PressableScale
                  style={styles.startSecondary}
                  onPress={() => router.push('/seller/verification')}
                >
                  <Text variant="caption" tone="accentFg" style={styles.startSecondaryText}>
                    {t('seller.start.verify')}
                  </Text>
                </PressableScale>
              </View>
            </View>
          ) : null}
          {/* §11 — üyelik teşviki (free → Premium/Platinum, premium → Platinum, platinum → gizli) */}
          <View style={styles.upsellSlot}>
            <TierUpsell />
          </View>
          {/* §4.4/§9.2 — ceza/kısıt uyarısı: 7 gün sayacı + ödeme talimatı */}
          {restricted ? (
            <View style={[styles.restrictBox, shadow.soft]}>
              <View style={styles.restrictHead}>
                <Ionicons name="alert-circle" size={20} color={colors.danger} />
                <Text variant="bodyStrong" tone="ink" style={styles.restrictTitle}>
                  {t('restricted.title')}
                </Text>
                <View style={styles.restrictDays}>
                  <Ionicons name="time-outline" size={12} color={colors.danger} />
                  <Text variant="caption" style={styles.restrictDaysText}>
                    {fillParams(t('restricted.days_left'), { n: restrictedDays })}
                  </Text>
                </View>
              </View>
              <Text variant="caption" tone="inkSoft" style={styles.restrictBody}>
                {t('restricted.pay')}
              </Text>
              <PressableScale
                style={styles.restrictCta}
                onPress={() => router.push('/seller/commissions')}
              >
                <Ionicons name="receipt-outline" size={15} color={colors.onAccent} />
                <Text variant="bodyStrong" tone="onAccent" style={styles.restrictCtaText}>
                  {t('restricted.cta')}
                </Text>
              </PressableScale>
            </View>
          ) : null}

          {/* İki ana operasyonel kart: Talepler + Takvim */}
          <View style={styles.primaryRow}>
            <PrimaryCard
              icon="pricetags"
              title={t('reports.action.requests')}
              sub={t('seller.card.requests_sub')}
              badge={openDemands}
              onPress={() => router.push('/seller/requests')}
            />
            <PrimaryCard
              icon="calendar"
              title={t('reports.action.agenda_own')}
              sub={t('seller.card.agenda_sub')}
              badge={stats?.upcoming ?? 0}
              onPress={() => router.push('/seller/agenda')}
            />
          </View>

          {/* §9.2 — yanıt & kalite: ort. yanıt süresi + bekleyen dekont + tamamlanma oranı */}
          <View style={[styles.qualityCard, shadow.soft]}>
            <View style={styles.qualityHead}>
              <Ionicons name="speedometer-outline" size={15} color={colors.accentFg} />
              <Text variant="label" tone="accentFg">
                {t('reports.quality.title')}
              </Text>
            </View>
            <View style={styles.qualityRow}>
              <QualityTile
                value={
                  quality.avgMin != null
                    ? `${quality.avgMin} ${t('pro.min')}`
                    : t('reports.quality.none')
                }
                label={t('reports.quality.avg_response')}
              />
              <View style={styles.qualitySep} />
              <QualityTile
                value={String(quality.depositPending)}
                label={t('reports.quality.deposit_pending')}
                alert={quality.depositPending > 0}
              />
              <View style={styles.qualitySep} />
              <QualityTile
                value={
                  quality.completion != null ? `%${quality.completion}` : t('reports.quality.none')
                }
                label={t('reports.quality.completion')}
              />
            </View>
            <View style={styles.qualityTip}>
              <Ionicons name="flash-outline" size={12} color={colors.accentFg} />
              <Text variant="caption" tone="muted" style={styles.qualityTipText}>
                {t('reports.quality.tip')}
              </Text>
            </View>
          </View>

          {/* §CRM — Bugün doğum günü 🎂: müşterine tek dokunuşla kutlama gönder */}
          {bdays.length > 0 ? (
            <View style={[styles.group, { padding: space(2), gap: space(1) }]}>
              <Text variant="label" tone="accentFg">
                {t('bday.section')}
              </Text>
              {bdays.map((u) => (
                <PressableScale
                  key={u.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space(1) }}
                  onPress={() =>
                    Alert.alert('🎂 ' + u.name, t('bday.send_q'), [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('bday.send'),
                        onPress: async () => {
                          const token = useStore.getState().token;
                          if (!token) return;
                          try {
                            await api.celebrateBirthday(token, u.id);
                            Alert.alert(t('bday.sent'));
                          } catch {
                            Alert.alert(t('seller.reports.title'), t('seller.reports.action_err'));
                          }
                        },
                      },
                    ])
                  }
                >
                  <Text style={{ fontSize: 22 }}>🎂</Text>
                  <Text variant="bodyStrong" tone="ink" style={{ flex: 1 }}>
                    {u.name}
                  </Text>
                  <Ionicons name="paper-plane-outline" size={18} color={colors.accentFg} />
                </PressableScale>
              ))}
            </View>
          ) : null}

          {/* Tedarikçi reklamları — sektör malzemeleri (admin panelinden hedeflenir) */}
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

          {/* ═══ YANIT BEKLEYEN YORUM — kanvas UzmanPanel.dc.html ═══
              Kanvasta vardı, kodda yoktu: yanıtsız yorum uzmanın panelinde hiç
              görünmüyordu, ayrı ekrana girmesi gerekiyordu. Cevapsız kalan
              düşük puanlı yorum, uzmanın görünürlüğüne en çok zarar veren şey. */}
          {bekleyenYorum ? (
            <>
              <Text variant="bodyStrong" tone="ink" style={styles.perfTitle}>
                {t('reports.review_waiting')}
              </Text>
              <PressableScale
                style={[styles.reviewCard, shadow.soft]}
                onPress={() => router.push('/seller/reviews')}
              >
                <View style={styles.reviewTop}>
                  <View style={styles.reviewAvatar}>
                    <Ionicons name="chatbubble-ellipses" size={17} color={colors.accent} />
                  </View>
                  <View style={styles.flex}>
                    <Text variant="title" tone="ink" numberOfLines={1}>
                      {bekleyenYorum.authorLabel}
                    </Text>
                    <Text variant="micro" tone="muted" numberOfLines={1}>
                      {bekleyenYorum.serviceTag}
                    </Text>
                  </View>
                  <Text numeric variant="meta" style={styles.reviewScore}>
                    ★ {bekleyenYorum.score.toFixed(1)}
                  </Text>
                </View>
                <Text variant="body" tone="inkSoft" numberOfLines={3}>
                  {bekleyenYorum.comment}
                </Text>
                <View style={styles.reviewCta}>
                  <Ionicons name="arrow-forward" size={15} color={colors.onAccent} />
                  <Text variant="caption" tone="onAccent">
                    {t('pro.review.reply')}
                  </Text>
                </View>
              </PressableScale>
            </>
          ) : null}

          <Text variant="bodyStrong" tone="ink" style={styles.perfTitle}>
            {t('reports.performance')}
          </Text>
          <Segmented
            options={[
              { value: 'week', label: t('reports.period.week') },
              { value: 'month', label: t('reports.period.month') },
              { value: 'all', label: t('reports.period.all') },
            ]}
            value={period}
            onChange={setPeriod}
          />

          <View style={styles.grid}>
            {metrics.map((m) => (
              <Metric key={m.id} metric={m} />
            ))}
          </View>

          {/* Uzman performansı — §10.1 SALON'a özel; Faz C: GERÇEK kadro (mock yok) */}
          {isSalon ? (
            <>
              <Text variant="label" tone="accentFg" style={styles.section}>
                {t('reports.section.staff')}
              </Text>
              <View style={styles.group}>
                {salonStaff.length === 0 ? (
                  <PressableScale
                    style={styles.staffRow}
                    onPress={() => router.push('/seller/codes')}
                  >
                    <View style={[styles.staffImage, styles.staffInitial]}>
                      <Ionicons name="person-add-outline" size={16} color={colors.inkSoft} />
                    </View>
                    <Text variant="caption" tone="muted" style={styles.staffName}>
                      {t('salon.staff.empty_b')}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.muted} />
                  </PressableScale>
                ) : (
                  salonStaff.map((u, i) => (
                    <PressableScale
                      key={u.name}
                      style={[styles.staffRow, i < salonStaff.length - 1 && styles.border]}
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
                      <View style={[styles.staffImage, styles.staffInitial]}>
                        <Text variant="caption" tone="inkSoft">
                          {u.name.charAt(0).toLocaleUpperCase('tr-TR')}
                        </Text>
                      </View>
                      <Text
                        variant="bodyStrong"
                        tone="ink"
                        style={styles.staffName}
                        numberOfLines={1}
                      >
                        {u.name}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {u.bookings > 0
                          ? `${u.bookings} ${t('reports.bookings')}`
                          : t('salon.staff.new')}
                      </Text>
                      <View style={styles.staffMeta}>
                        <Ionicons name="chevron-forward" size={14} color={colors.muted} />
                      </View>
                    </PressableScale>
                  ))
                )}
              </View>
            </>
          ) : null}

          {/* NEDEN GÖRÜNÜYORSUN — kanvas (design/UzmanPanel.dc.html §görünürlük
              sağlığı) burada "78 / 100" gibi bir görünürlük PUANI gösteriyor.
              Sistemde böyle bir puan YOK: sıralama katalogda `rating desc`,
              keşifte premium önceliği + günlük rotasyon, aramada kullanıcının
              seçtiği sıralama. Uydurma bir skor, uzmanın gerçekte yapamayacağı
              bir şeyi yapabilirmiş gibi göstermek olurdu.
              Onun yerine sıralamayı GERÇEKTEN belirleyen etkenler, uzmanın
              kendi değerleriyle yazılıyor. */}
          <SectionHeader title={t('reports.visibility.title')} />
          <View style={[styles.card, shadow.soft]}>
            <Text variant="caption" tone="muted">
              {t('reports.visibility.sub')}
            </Text>
            {gorunurlukEtkenleri.map((e) => (
              <View key={e.key} style={styles.visRow}>
                <Ionicons
                  name={e.ok ? 'checkmark-circle' : 'alert-circle-outline'}
                  size={17}
                  color={e.ok ? colors.success : colors.gold}
                />
                <View style={styles.visBody}>
                  <Text variant="caption" tone="ink">
                    {t(e.key)}
                  </Text>
                  <Text variant="micro" tone="muted">
                    {e.deger}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

// Ana operasyonel kart (Talepler / Takvim)
function PrimaryCard({
  icon,
  title,
  sub,
  badge,
  onPress,
}: {
  icon: IoniconName;
  title: string;
  sub: string;
  badge: number;
  onPress: () => void;
}) {
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale style={[styles.primaryCard, shadow.soft]} onPress={onPress}>
      <View style={styles.primaryTop}>
        <View style={styles.primaryIcon}>
          <Ionicons name={icon} size={22} color={colors.accentFg} />
        </View>
        {badge > 0 ? (
          <View style={styles.primaryBadge}>
            <Text style={styles.primaryBadgeText}>{badge > 99 ? '99+' : String(badge)}</Text>
          </View>
        ) : null}
      </View>
      <Text variant="bodyStrong" tone="ink" style={styles.primaryTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={2}>
        {sub}
      </Text>
    </PressableScale>
  );
}

// Tedarikçi reklam banner'ı (gerçek fotoğraflı; alt karartma scrim + "Sponsorlu")
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
        <Text variant="caption" style={styles.adSub} numberOfLines={1}>
          {ad.subtitle}
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

function QualityTile({ value, label, alert }: { value: string; label: string; alert?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.qualityTile}>
      <Text variant="title" style={[styles.qualityValue, alert ? { color: colors.danger } : null]}>
        {value}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function LiveTile({ value, label }: { value: string; label: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.liveTile}>
      <Text variant="h2" tone="onColor">
        {value}
      </Text>
      <Text variant="caption" tone="onColor" style={styles.dim} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Metric({ metric }: { metric: SellerMetric }) {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.metric, shadow.soft]}>
      <View style={styles.metricIcon}>
        <Ionicons name={metric.icon as IoniconName} size={16} color={colors.accentFg} />
      </View>
      <Text variant="title" tone="ink" style={styles.metricValue}>
        {metric.value}
      </Text>
      <View style={styles.metricFoot}>
        <Text variant="caption" tone="muted" style={styles.metricLabel}>
          {t(metric.labelKey)}
        </Text>
        <Text variant="caption" style={{ color: metric.positive ? colors.success : colors.danger }}>
          {metric.delta}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingBottom: TAB_BAR_CLEARANCE + space(2) },
    flex: { flex: 1 },
    body: { paddingHorizontal: space(3), paddingTop: space(2.5) },
    upsellSlot: { marginBottom: space(2) },
    startCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(0.75),
      marginBottom: space(1.5),
    },
    startSub: { lineHeight: 18 },
    startRow: { flexDirection: 'row', gap: space(1), marginTop: space(0.5) },
    startPrimary: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    startPrimaryText: { fontFamily: font.semibold },
    startSecondary: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.accentFg,
      borderRadius: radius.pill,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    startSecondaryText: { fontFamily: font.semibold },
    // Canlı Özet — iki yanda beyaz kalan DAR bant; üstü yeşilin dibine tuck (bağlı), yazılar yukarı+sıkı
    liveBand: {
      marginHorizontal: space(3),
      // Eskiden -space(5) idi: kart, mor bandın DALGA bitişinin altına
      // girsin diye. Bant kaldırılınca kart yukarı kayıp başlığın altındaki
      // bağ çipinin ÜSTÜNE bindi — çipin yazısı kartın arkasından görünüyordu.
      marginTop: space(0.5),
      paddingHorizontal: space(2.25),
      paddingTop: space(1.25),
      paddingBottom: space(1.5),
      gap: space(0.75),
      borderRadius: radius.xl,
      zIndex: 3,
    },

    // ── Kreatif hero (Keşfet dili) ──
    hero: {
      backgroundColor: colors.bg,
      // Kartlarla AYNI kenar boşluğu: 20 iken kart 24'tü ve çip kartın
      // solundan 4pt taşıyordu — "altta bir şey kalmış" görüntüsü buradan.
      paddingHorizontal: space(3),
      paddingBottom: space(2),
      gap: space(1.25),
    },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
    heroAvatar: {
      width: 54,
      height: 54,
      borderRadius: radius.sm,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0,
    },
    heroAvatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },

    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroBody: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: space(2.5),
      minHeight: 175,
      zIndex: 2,
    },
    heroText: { flexGrow: 1, flexShrink: 1, minWidth: 0, gap: 1 },

    greetName: {
      fontSize: 24,
      lineHeight: 29,
      fontFamily: font.semibold,
      letterSpacing: -0.4,
    },
    bindingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 5,
      backgroundColor: colors.surface,
      paddingHorizontal: space(1.25),
      paddingVertical: space(0.5),
      borderRadius: radius.pill,
      maxWidth: '100%',
    },
    bindingPillText: { fontFamily: font.semibold, flexShrink: 0 },
    // §6.1 — profil fotoğrafı GÜVENLİ ALANI (safe zone): sabit çerçeve + resizeMode="contain".
    // Kayıt olan her uzmanın cut-out'u bu çerçeveye sığdırılır → zilden uzak, taşmaz, standart.
    // Daha büyük foto alanı (kullanıcı Keşfet ile tutarlı; kurucu isteği).

    // Bildirim zili (hero sağ)
    bell: {
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
      backgroundColor: '#D97798',
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
      includeFontPadding: false,
    },
    // §4.4/§9.2 — kısıtlı mod uyarı kutusu
    restrictBox: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.danger,
      padding: space(1.75),
      gap: space(1),
      marginBottom: space(2.5),
    },
    restrictHead: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
    restrictTitle: { flex: 1 },
    restrictDays: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.dangerSoft,
      paddingHorizontal: space(1),
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    restrictDaysText: { color: colors.danger, fontFamily: font.semibold },
    restrictBody: { lineHeight: 18 },
    restrictCta: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      backgroundColor: colors.accentFg,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
    },
    restrictCtaText: { fontSize: 14 },

    // §9.2 — yanıt & kalite kartı
    qualityCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(1.75),
      gap: space(1.25),
      marginBottom: space(3),
    },
    qualityHead: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
    qualityRow: { flexDirection: 'row', alignItems: 'center' },
    qualityTile: { flex: 1, alignItems: 'center', gap: 2 },
    qualityValue: { fontSize: 22, lineHeight: 26, color: colors.ink },
    qualitySep: { width: 1, alignSelf: 'stretch', backgroundColor: colors.line },
    qualityTip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.accentSoft,
      borderRadius: radius.md,
      paddingHorizontal: space(1.25),
      paddingVertical: space(1),
    },
    qualityTipText: { flex: 1, lineHeight: 16 },

    // Aksiyon ızgarası
    // İki ana operasyonel kart (Talepler + Takvim)
    primaryRow: { flexDirection: 'row', gap: space(1.5), marginBottom: space(3) },
    primaryCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
      gap: space(0.5),
      minHeight: 108,
    },
    primaryTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: space(0.75),
    },
    primaryIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBadge: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      paddingHorizontal: 7,
      backgroundColor: '#D97798',
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBadgeText: { color: colors.onColor, fontSize: 12, fontFamily: font.semibold },
    primaryTitle: { fontSize: 16 },

    // Tedarikçi reklamları
    adsHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
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
    adsRow: { gap: space(1.5), paddingRight: space(3), paddingBottom: space(1) },
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
    adSub: { color: 'rgba(255,255,255,0.85)', lineHeight: 16 },
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
    adCtaText: { color: colors.ink, fontFamily: font.semibold },
    reviewCard: {
      marginHorizontal: space(2.5),
      padding: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      gap: space(1.5),
    },
    reviewTop: { flexDirection: 'row', alignItems: 'center', gap: space(1.125) },
    reviewAvatar: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reviewScore: { color: colors.gold, fontFamily: font.semibold },
    reviewCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accent,
    },
    perfTitle: { marginTop: space(3), marginBottom: space(1.5) },
    // §5 canlı özet
    liveHead: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
    liveRow: { flexDirection: 'row', justifyContent: 'space-between' },
    liveTile: { flex: 1, alignItems: 'center', gap: 2 },
    liveDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
    liveRevenue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dim: { opacity: 0.9 },
    agendaLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(1.75),
      marginBottom: space(2),
    },
    agendaIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.accentFg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    agendaText: { flex: 1, gap: 2 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5), marginTop: space(2.5) },
    metric: {
      width: '47%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: space(2),
    },
    metricIcon: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(1),
    },
    metricValue: { fontSize: 24, lineHeight: 30 },
    metricFoot: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    metricLabel: { flex: 1 },
    section: { marginTop: space(3.5), marginBottom: space(1.5) },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
    },
    border: { borderBottomWidth: 1, borderBottomColor: colors.line },
    staffRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      paddingHorizontal: space(2),
      paddingVertical: space(1.5),
    },
    staffImage: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceMuted },
    staffInitial: { alignItems: 'center', justifyContent: 'center' },
    staffName: { flex: 1 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1.25),
    },
    visRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space(1) },
    visBody: { flexGrow: 1, flexShrink: 1, minWidth: 0, gap: 1 },
    staffMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  });
