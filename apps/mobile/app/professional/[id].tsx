import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MessageKey } from '@ayna/i18n';
import { formatPrice } from '../../src/data';
import { almatyDayStart, almatyParts, formatSlotTr, slotTime } from '../../src/datetime';
import { tri } from '../../src/taxonomy';
import { ApiError, api } from '../../src/api';
import { useProfessionalDetail } from '../../src/catalog';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space, font } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  PressableScale,
  RulesCard,
  TAB_BAR_CLEARANCE,
  Text,
  VerificationBadges,
} from '../../src/ui';

type Tab = 'booking' | 'portfolio' | 'reviews';
const HOT_PINK = '#D97798'; // favori (kalp) aktif rengi

export default function ProfessionalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, locale } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const proId = id ?? '1';
  const pro = useProfessionalDetail(proId);

  // TÜM hook'lar KOŞULSUZ çağrılır (React kuralı) — erken dönüş aşağıda, hook'lardan SONRA.
  const [tab, setTab] = useState<Tab>('booking');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // §4.2 — İKİ AŞAMALI seçim: önce GÜN, sonra o günün saat ızgarasından SLOT
  // (kullanıcı isteği: gün seçilince uzmanın o güne ait dolu/boş ekranı çıksın).
  const [selectedDay, setSelectedDay] = useState<number>(() => almatyDayStart(Date.now(), 0));
  const [slotMs, setSlotMs] = useState<number | null>(null);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const isFav = useStore((s) => s.favorites.includes(proId));
  const token = useStore((s) => s.token);
  const addBooking = useStore((s) => s.addBooking);
  const userReviewsMap = useStore((s) => s.userReviews);

  // §5.5 — uzmanı takip et (karşılıklı takip → serbest DM). Yalnız hesabı bağlı gerçek uzmanda.
  const [following, setFollowing] = useState(false);
  useEffect(() => {
    if (!token || !pro.ownerUserId) return;
    void api
      .myFollows()
      .then((r) => setFollowing(r.following.some((f) => f.userId === pro.ownerUserId)))
      .catch(() => undefined);
  }, [token, pro.ownerUserId]);
  const toggleFollow = async () => {
    if (!token || !pro.ownerUserId) return;
    const next = !following;
    setFollowing(next);
    try {
      await api.circleFollow(pro.ownerUserId, next);
    } catch {
      setFollowing(!next); // geri al
    }
  };

  const uzmanId = pro.staff[0]?.id ?? '';
  const isSalon = pro.kind === 'salon' && pro.staff.length > 0;
  const minDate = new Date(Date.now() + 2 * 3_600_000);
  minDate.setMinutes(0, 0, 0);
  const reviews = [...(userReviewsMap[proId] ?? []), ...pro.reviews];
  // Eleştiri = 3 yıldız ve altı. Saklanmıyor, öne getiriliyor.
  const [critic, setCritic] = useState(false);
  const criticCount = reviews.filter((r) => r.rating <= 3).length;
  const shownReviews = critic ? reviews.filter((r) => r.rating <= 3) : reviews;
  // §4 — ÇOKLU hizmet: kullanıcı birden fazla hizmet seçip tek randevuda alabilir.
  // Liste yüklenince ilk hizmet seçili başlar; en az 1 seçili kalır.
  useEffect(() => {
    if (pro.services.length && selectedIds.length === 0) setSelectedIds([pro.services[0]!.id]);
  }, [pro.services, selectedIds.length]);
  const finalPriceOf = (s: (typeof pro.services)[number]) =>
    s.discountPct ? Math.round((s.price * (100 - s.discountPct)) / 100) : s.price;
  const chosen = pro.services.filter((s) => selectedIds.includes(s.id));
  const totalPrice = chosen.reduce((n, s) => n + finalPriceOf(s), 0);
  const totalDur = chosen.reduce((n, s) => n + s.durationMin, 0);

  // §4.2 — uzmanın DOLU aralıkları: müşteri saat seçerken dolu yerler görünür, dolu slot seçilemez
  // (çifte iş biter). Sunucu yalnız zaman aralığı döner — müşteri bilgisi asla (gizlilik).
  const [busyRanges, setBusyRanges] = useState<{ startMs: number; endMs: number }[]>([]);
  useEffect(() => {
    if (!pro.id) return;
    let alive = true;
    void api
      .proBusy(pro.id, Date.now(), Date.now() + 14 * 86_400_000)
      .then((rows) => alive && setBusyRanges(Array.isArray(rows) ? rows : []))
      .catch(() => undefined); // uç erişilemezse gösterge yok — randevu akışı engellenmez
    return () => {
      alive = false;
    };
  }, [pro.id]);
  // Faz 1 — GERÇEK slotlar SUNUCUDAN: çalışma saati + izin günü + dolu randevular +
  // hizmet süresi + lead tamponu sunucu hesabı. Sunucuya erişilemezse yerel yedek üretim.
  const dayStrip = Array.from({ length: 14 }, (_, d) => almatyDayStart(Date.now(), d));
  const [serverSlots, setServerSlots] = useState<{ startMs: number; available: boolean }[] | null>(
    null,
  );
  const [dayClosed, setDayClosed] = useState(false);
  useEffect(() => {
    if (!pro.id) return;
    let alive = true;
    setServerSlots(null);
    setDayClosed(false);
    void api
      .proSlots(pro.id, selectedDay, totalDur || 60)
      .then((r) => {
        if (!alive) return;
        setServerSlots(r.slots.map((x) => ({ startMs: x.startMs, available: x.available })));
        setDayClosed(r.closed);
      })
      .catch(() => undefined); // yedek: aşağıdaki yerel üretim devreye girer
    return () => {
      alive = false;
    };
  }, [pro.id, selectedDay, totalDur]);
  const overlapsBusy = (startMs: number, endMs: number) =>
    busyRanges.some((b) => startMs < b.endMs && endMs > b.startMs);
  const daySlots = serverSlots
    ? serverSlots.map((sl) => ({
        startMs: sl.startMs,
        busy: !sl.available && sl.startMs >= minDate.getTime(),
        past: !sl.available && sl.startMs < minDate.getTime(),
      }))
    : Array.from({ length: 10 }, (_, i) => {
        const start = selectedDay + (10 + i) * 3_600_000;
        const end = start + (totalDur || 60) * 60_000;
        return {
          startMs: start,
          busy: overlapsBusy(start, end),
          past: start < minDate.getTime(),
        };
      });
  const slotBusy = slotMs != null && overlapsBusy(slotMs, slotMs + (totalDur || 60) * 60_000);
  const dayBusy = busyRanges.filter((b) => almatyDayStart(b.startMs, 0) === selectedDay);
  const toggleService = (sid: string) =>
    setSelectedIds((cur) =>
      cur.includes(sid) ? (cur.length > 1 ? cur.filter((x) => x !== sid) : cur) : [...cur, sid],
    );

  // Sunucudan profil henüz gelmediyse/bulunamadıysa: güvenli yükleme durumu (tüm hook'lardan SONRA)
  if (!pro.id) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Ionicons name="hourglass-outline" size={30} color="#999" />
        <Text variant="caption" tone="muted">
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  // EK Z.1 — uzmana DM başlat (yalnız hesap bağı olan gerçek uzmanda; Specialist→userId)
  const messagePro = async () => {
    if (!token) {
      Alert.alert(t('messages.need_login'));
      return;
    }
    if (!pro.ownerUserId) {
      // Demo/seed uzmanda hesap bağı yok → mesajlaşma yalnız KAYITLI uzmanlarda
      Alert.alert(t('messages.unavailable_t'), t('messages.unavailable_b'));
      return;
    }
    try {
      const { id } = await api.startConversation(token, pro.ownerUserId);
      router.push({
        pathname: '/messages/[id]',
        params: { id, name: pro.name, otherId: pro.ownerUserId },
      });
    } catch (err) {
      // Sessiz kalma: sebebi göster (ör. uzman↔uzman geçersiz çift, engelli)
      const code = err instanceof ApiError ? err.code : '';
      const msg =
        code === 'INVALID_PAIR'
          ? t('messages.invalid_pair')
          : code === 'BLOCKED'
            ? t('messages.blocked_notice')
            : t('messages.start_err');
      Alert.alert(t('messages.title'), msg);
    }
  };

  // Tarih/saat detay sayfasında seçildi → doğrudan randevu oluştur (ayrı adım yok).
  // Sıra/tek-randevu kısıtı KALDIRILDI — kullanıcı dilediği kadar uzmandan randevu/teklif alabilir.
  const book = () => {
    // §4.2 — saat seçilmeden randevu OLUŞTURULMAZ (buton pasif — buraya düşmez, güvenlik ağı)
    if (slotMs == null) return;
    if (slotBusy) {
      Alert.alert(t('booking.schedule.time'), t('booking.schedule.busy_conflict'));
      return;
    }
    const svcNames =
      chosen.map((s) => (s.label ? tri(s.label, locale) : s.name)).join(' + ') || pro.specialty;
    const uzman = pro.staff.find((u) => u.id === uzmanId);
    const startMs = slotMs;
    const bid = addBooking({
      source: 'direct',
      service: svcNames, // §4 — birden fazla hizmet tek randevuda ('A + B')
      proId: pro.id,
      proName: pro.name,
      proImage: pro.image,
      ...(uzman?.name ? { uzmanName: uzman.name } : {}),
      startMs,
      durationMin: totalDur || 60,
      price: totalPrice || Number(pro.priceFrom),
    });
    router.replace({
      pathname: '/booking/confirmed',
      params: {
        id: bid,
        proId: pro.id,
        source: 'direct',
        slot: formatSlotTr(startMs),
        uzmanName: uzman?.name ?? '',
        // Polish 1.1 — onay ekranı SEÇİLEN hizmeti ve gerçek toplamı göstersin
        service: svcNames,
        price: String(totalPrice || Number(pro.priceFrom)),
      },
    });
  };

  const TABS: { id: Tab; key: MessageKey }[] = [
    { id: 'booking', key: 'pro.tab.booking' },
    { id: 'portfolio', key: 'pro.tab.portfolio' },
    { id: 'reviews', key: 'pro.tab.reviews' },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 + TAB_BAR_CLEARANCE }}
      >
        {/* ═══ ÜST — kanvas Uzman.dc.html §ÜST ═══
            Kanvas: AÇIK porselen zemin, 48'lik kart düğmeler. Önceki sürüm mor
            bir hero bandıydı; üstelik metinler tone="ink" (koyu) olduğu için
            mor zeminde koyu-üstüne-koyu okunuyordu. */}
        <View style={[styles.topRow, { paddingTop: insets.top + space(1) }]}>
          <PressableScale
            style={[styles.topIconBtn, shadow.soft]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </PressableScale>
          <View style={styles.grow} />
          <PressableScale
            style={[styles.topIconBtn, shadow.soft]}
            onPress={() => toggleFavorite(proId)}
            accessibilityRole="button"
            accessibilityLabel={t('favorites.title')}
            accessibilityState={{ selected: isFav }}
          >
            <Ionicons
              name={isFav ? 'heart' : 'heart-outline'}
              size={20}
              color={isFav ? HOT_PINK : colors.ink}
            />
          </PressableScale>
        </View>

        {/* ═══ KİMLİK — kesik portre + yansıma (kanvas §KİMLİK) ═══
            Portre SOLDA 118×158 (132 görsel + 26 yansıma), bilgi sağda. */}
        <View style={styles.identityRow}>
          <View style={styles.portraitCol} pointerEvents="none">
            <View style={styles.portraitWrap}>
              <Image source={{ uri: pro.image }} style={styles.portrait} resizeMode="cover" />
              <LinearGradient
                colors={['rgba(251,248,246,0)', colors.bg]}
                locations={[0.62, 1]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            </View>
            <View style={styles.reflection}>
              <Image source={{ uri: pro.image }} style={styles.reflectionImg} resizeMode="cover" />
              <LinearGradient
                colors={['rgba(251,248,246,0.55)', colors.bg]}
                locations={[0, 0.88]}
                style={StyleSheet.absoluteFill}
              />
            </View>
          </View>

          <View style={styles.identityText}>
            <View style={styles.heroNameRow}>
              <Text variant="h1" tone="ink" style={styles.heroName} numberOfLines={2}>
                {pro.name}
              </Text>
              {/* EK Z.3 — doğrulanmış uzman rozeti (KYC onaylı hesap) */}
              {pro.kycVerified ? (
                <Ionicons name="shield-checkmark" size={20} color={colors.sage} />
              ) : null}
            </View>
            <Text variant="body" tone="inkSoft" numberOfLines={2}>
              {pro.specialty} · {t(isSalon ? 'pro.kind.salon' : 'pro.kind.independent')}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={colors.muted} />
              <Text variant="meta" tone="inkSoft" numberOfLines={1} style={styles.grow}>
                {pro.district}
              </Text>
              <PressableScale onPress={() => router.push('/map')}>
                <Text variant="meta" tone="accentFg" style={styles.mapLink}>
                  {t('map.title')}
                </Text>
              </PressableScale>
            </View>
          </View>
        </View>

        {/* ═══ GÜVEN — istatistik + doğrulama (kanvas §GÜVEN) ═══
            Kanvas: tek beyaz kartta yıl · müşteri · puan, aralarında ince ayraç. */}
        <View style={[styles.trustCard, shadow.soft]}>
          {pro.experienceYears > 0 ? (
            <>
              <View style={styles.statCol}>
                <Text numeric variant="h2" tone="ink">
                  {pro.experienceYears}
                </Text>
                <Text variant="micro" tone="muted" numberOfLines={1}>
                  {t('pro.stat.years')}
                </Text>
              </View>
              <View style={styles.statSep} />
            </>
          ) : null}
          <View style={styles.statCol}>
            <Text numeric variant="h2" tone="ink">
              {pro.reviewCount}
            </Text>
            <Text variant="micro" tone="muted" numberOfLines={1}>
              {t('pro.stat.rating')}
            </Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statCol}>
            <View style={styles.statRating}>
              <Ionicons name="star" size={13} color={colors.gold} />
              <Text numeric variant="h2" tone="ink">
                {pro.rating.toFixed(1)}
              </Text>
            </View>
            <Text variant="micro" tone="muted" numberOfLines={1}>
              {t('rewards.tier')}
            </Text>
          </View>
        </View>

        {/* §3.3 — katmanlı güven rozetleri (AYNA Onaylı + kimlik/işletme/BİN/adres/sosyal) */}
        <View style={styles.badgesRow}>
          <VerificationBadges verification={pro.verification} aynaVerified={pro.aynaVerified} />
        </View>

        {pro.friends ? (
          <View style={styles.friendsRow}>
            <View style={styles.friendsPill}>
              <Ionicons name="people" size={12} color={colors.ink} />
              <Text variant="caption" tone="ink" style={styles.friendsText}>
                {pro.friends} {t('pro.friends_here')}
              </Text>
            </View>
          </View>
        ) : null}

        {/* SHEET */}
        <View style={styles.sheet}>
          {/* Alt-çizgili sekmeler (VELOURA) */}
          <View style={styles.tabs}>
            {TABS.map((tb) => {
              const on = tab === tb.id;
              return (
                <Pressable key={tb.id} onPress={() => setTab(tb.id)} style={styles.tab}>
                  <Text
                    variant="bodyStrong"
                    style={[styles.tabText, on ? styles.tabOn : styles.tabOff]}
                  >
                    {t(tb.key)}
                  </Text>
                  {on ? <View style={styles.tabBar} /> : null}
                </Pressable>
              );
            })}
          </View>

          {tab === 'booking' ? (
            <>
              <Text variant="body" tone="inkSoft" style={styles.about}>
                {pro.about}
              </Text>

              {/* §11 — Platinum promosyonları: uzman/salon kendi profilinde yayınlar */}
              {(pro.promotions ?? []).length > 0 ? (
                <>
                  <Text variant="bodyStrong" tone="ink" style={styles.section}>
                    {t('pro.promos')}
                  </Text>
                  <View style={styles.promoList}>
                    {(pro.promotions ?? []).map((pm) => (
                      <View key={pm.id} style={[styles.promoCard, shadow.soft]}>
                        {pm.imageUri ? (
                          <Image source={{ uri: pm.imageUri }} style={styles.promoImage} />
                        ) : null}
                        <View style={styles.promoBody}>
                          <View style={styles.promoTop}>
                            <Text
                              variant="bodyStrong"
                              tone="ink"
                              style={styles.flex}
                              numberOfLines={1}
                            >
                              {pm.title}
                            </Text>
                            {pm.discountPct ? (
                              <View style={styles.promoPct}>
                                <Text variant="caption" tone="onAccent" style={styles.promoPctText}>
                                  %{pm.discountPct}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <Text variant="caption" tone="inkSoft" numberOfLines={2}>
                            {pm.desc}
                          </Text>
                          <Text variant="caption" tone="muted">
                            {pm.startLabel} – {pm.endLabel}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              {isSalon ? (
                <>
                  <Text variant="bodyStrong" tone="ink" style={styles.section}>
                    {t('pro.staff')}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.staffRow}
                  >
                    {pro.staff.map((u) => {
                      const on = u.id === uzmanId;
                      return (
                        <Pressable
                          key={u.id}
                          onPress={() => router.push('/uzman/' + u.id)}
                          style={styles.staffCard}
                        >
                          <View style={[styles.staffAvatarWrap, on && styles.staffAvatarOn]}>
                            <Image source={{ uri: u.image }} style={styles.staffAvatar} />
                          </View>
                          <Text
                            variant="caption"
                            tone={on ? 'ink' : 'inkSoft'}
                            style={styles.staffName}
                            numberOfLines={1}
                          >
                            {u.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}

              {/* §6.1 — bağlı olduğu salon (varsa; dokununca salon profiline gider) */}
              {pro.salon ? (
                <Pressable
                  style={[styles.salonLink, shadow.soft]}
                  onPress={() => router.push(`/professional/${pro.salon!.id}`)}
                >
                  <View style={styles.salonIcon}>
                    <Ionicons name="storefront" size={17} color={colors.accentFg} />
                  </View>
                  <View style={styles.flex}>
                    <Text variant="caption" tone="muted">
                      {t('pro.linked_salon')}
                    </Text>
                    <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                      {pro.salon.name}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>
              ) : null}

              {/* §6.1 — sertifikalar */}
              {pro.certs.length > 0 ? (
                <>
                  <Text variant="bodyStrong" tone="ink" style={styles.section}>
                    {t('pro.certs')}
                  </Text>
                  <View style={styles.certRow}>
                    {pro.certs.map((uri, ci) => (
                      // §6.1 — sertifikaya dokun → tam ekran (portfolyo ile aynı viewer)
                      <Pressable
                        key={uri}
                        onPress={() =>
                          router.push({
                            pathname: '/gallery',
                            params: { images: JSON.stringify(pro.certs), index: String(ci) },
                          })
                        }
                      >
                        <Image source={{ uri }} style={styles.certThumb} />
                      </Pressable>
                    ))}
                    <View style={styles.socialInline}>
                      {pro.social.instagram ? (
                        <View style={styles.socialChip}>
                          <Ionicons name="logo-instagram" size={13} color={colors.accentFg} />
                          <Text variant="caption" tone="inkSoft">
                            @{pro.social.instagram}
                          </Text>
                        </View>
                      ) : null}
                      {pro.social.tiktok ? (
                        <View style={styles.socialChip}>
                          <Ionicons name="logo-tiktok" size={13} color={colors.accentFg} />
                          <Text variant="caption" tone="inkSoft">
                            @{pro.social.tiktok}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </>
              ) : null}

              {/* Hizmetler */}
              <Text variant="bodyStrong" tone="ink" style={styles.section}>
                {t('pro.services')}
              </Text>
              <View style={styles.services}>
                {pro.services.map((s) => {
                  const active = selectedIds.includes(s.id);
                  const finalPrice = finalPriceOf(s);
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => toggleService(s.id)}
                      style={[styles.service, shadow.soft, active && styles.serviceActive]}
                    >
                      <View style={styles.serviceText}>
                        <View style={styles.serviceNameRow}>
                          <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                            {s.label ? tri(s.label, locale) : s.name}
                          </Text>
                          {s.popular ? (
                            <View style={styles.topTag}>
                              <Ionicons name="flame" size={9} color={colors.gold} />
                              <Text variant="caption" style={styles.topText}>
                                {t('pro.service.top')}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text variant="caption" tone="muted">
                          {s.durationMin} {t('pro.min')}
                          {s.discountPct ? `  ·  −%${s.discountPct}` : ''}
                        </Text>
                      </View>
                      <View style={styles.priceCol}>
                        {s.discountPct ? (
                          <Text variant="caption" tone="muted" style={styles.strike}>
                            {formatPrice(s.price)}
                          </Text>
                        ) : null}
                        <Text variant="bodyStrong" tone="ink">
                          {formatPrice(finalPrice)}
                        </Text>
                      </View>
                      <View style={[styles.check, active && styles.checkOn]}>
                        {active ? (
                          <Ionicons name="checkmark" size={14} color={colors.onAccent} />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* §4.2 — ADIM 1: gün seç (14 günlük şerit) */}
              <Text variant="bodyStrong" tone="ink" style={styles.section}>
                {t('pro.select_date')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayStrip}
              >
                {dayStrip.map((dayMs) => {
                  const p = almatyParts(dayMs);
                  const on = dayMs === selectedDay;
                  return (
                    <Pressable
                      key={dayMs}
                      onPress={() => {
                        setSelectedDay(dayMs);
                        setSlotMs(null); // gün değişince saat seçimi sıfırlanır
                      }}
                      style={[styles.dayChip, shadow.soft, on && styles.dayChipOn]}
                    >
                      <Text variant="caption" tone={on ? 'onAccent' : 'muted'}>
                        {t(`wd.${p.wd}` as MessageKey)}
                      </Text>
                      <Text variant="bodyStrong" tone={on ? 'onAccent' : 'ink'}>
                        {p.day}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* §4.2 — ADIM 2: seçilen günün DOLU/BOŞ saat ızgarası (uzmanın ajandası) */}
              <Text variant="bodyStrong" tone="ink" style={styles.section}>
                {t('pro.select_time')}
                {dayBusy.length === 0 ? (
                  <Text variant="caption" tone="muted">
                    {'  ·  '}
                    {t('booking.schedule.busy_none')}
                  </Text>
                ) : null}
              </Text>
              {dayClosed ? (
                <Text variant="caption" tone="muted" style={styles.busyFreeHint}>
                  {t('booking.schedule.day_closed')}
                </Text>
              ) : null}
              <View style={styles.slotGrid}>
                {daySlots.map((s) => {
                  const on = slotMs === s.startMs;
                  const disabled = s.busy || s.past;
                  return (
                    <Pressable
                      key={s.startMs}
                      disabled={disabled}
                      onPress={() => setSlotMs(s.startMs)}
                      style={[
                        styles.slotChip,
                        s.busy && styles.slotChipBusy,
                        s.past && styles.slotChipPast,
                        on && styles.slotChipOn,
                      ]}
                    >
                      <Text
                        variant="caption"
                        tone={on ? 'onAccent' : s.busy ? undefined : s.past ? 'muted' : 'ink'}
                        style={s.busy ? styles.slotBusyText : undefined}
                      >
                        {slotTime(s.startMs)}
                      </Text>
                      {s.busy ? (
                        <Text variant="caption" style={styles.slotBusyText}>
                          {t('booking.schedule.slot_busy')}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
              {/* PARA KURALLARI — 'param ne olacak?' sorusu randevu oluşmadan ÖNCE
                  cevaplanmalı. RulesCard kod tabanında vardı ama yalnız talep ve
                  randevu ekranlarına basılıyordu; uzman profilinde yoktu.
                  K1 — kapora artık oranlı: clamp(fiyat × %10, alt sınır, üst sınır).
                  Profilde tek bir kesin fiyat yok (hizmetler bir aralık), o yüzden
                  burada tutar değil KURAL yazılır; kesin tutar hizmet seçilince
                  randevu ekranında görünür. */}
              <RulesCard />
            </>
          ) : null}

          {tab === 'portfolio' ? (
            <View style={styles.grid}>
              {pro.portfolio.map((uri, i) => (
                <Pressable
                  key={uri}
                  onPress={() =>
                    router.push({
                      pathname: '/gallery',
                      params: { images: JSON.stringify(pro.portfolio), index: String(i) },
                    })
                  }
                  style={styles.gridCell}
                >
                  <Image source={{ uri }} style={styles.gridImg} />
                </Pressable>
              ))}
            </View>
          ) : null}

          {tab === 'reviews' ? (
            <View style={styles.reviews}>
              {/* §6.1 — puan ortalaması + yıldız dağılımı + alt kırılım özet çubukları */}
              <View style={[styles.ratingSummary, shadow.soft]}>
                <View style={styles.ratingAvgCol}>
                  <Text variant="display" tone="ink">
                    {pro.rating.toFixed(1)}
                  </Text>
                  <View style={styles.reviewStars}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons
                        key={i}
                        name="star"
                        size={12}
                        color={i < Math.round(pro.rating) ? colors.gold : colors.line}
                      />
                    ))}
                  </View>
                  <Text variant="caption" tone="muted">
                    {pro.reviewCount} {t('pro.reviews')}
                  </Text>
                </View>
                <View style={styles.ratingBars}>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const total = pro.starDist.reduce((a, b) => a + b, 0) || 1;
                    const pct = Math.round((pro.starDist[star - 1]! / total) * 100);
                    return (
                      <View key={star} style={styles.distRow}>
                        <Text numeric variant="micro" tone="muted" style={styles.distStar}>
                          {star}
                        </Text>
                        <View style={styles.distTrack}>
                          <View style={[styles.distFill, { width: `${pct}%` }]} />
                        </View>
                        {/* Adet ŞART: '%88' tek başına kaç kişinin yazdığını söylemez */}
                        <Text numeric variant="micro" tone="inkSoft" style={styles.distCount}>
                          {pro.starDist[star - 1]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* §7.1 — alt kırılım çubukları; gerçek veri yoksa BOŞ KART çizilmez */}
              {pro.breakdown.length === 0 ? null : (
                <View style={[styles.breakdownCard, shadow.soft]}>
                  {pro.breakdown.map((b) => (
                    <View key={b.key} style={styles.bdRow}>
                      <Text variant="caption" tone="inkSoft" style={styles.bdLabel}>
                        {t(`pro.dim.${b.key}` as 'pro.dim.quality')}
                      </Text>
                      <View style={styles.bdTrack}>
                        <View style={[styles.bdFill, { width: `${(b.score / 5) * 100}%` }]} />
                      </View>
                      <Text variant="caption" tone="ink" style={styles.bdScore}>
                        {b.score.toFixed(1)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* HİZMET BAZINDA PUAN — 'kesimde 4.9 ama boyamada 4.7' bilgisi,
                  tek ortalamadan çok daha kullanışlı. Veri (serviceRatings) kod
                  tabanında hazırdı ama hiçbir ekranda gösterilmiyordu.
                  Puanı olmayan hizmette UYDURMA SKOR YOK: 'değerlendirme yok'. */}
              {pro.serviceRatings.length > 0 ? (
                <View style={[styles.breakdownCard, shadow.soft]}>
                  <Text variant="label" tone="muted">
                    {t('pro.svc_rating.title')}
                  </Text>
                  {pro.serviceRatings.map((sr) => (
                    <View key={sr.name} style={styles.svcRow}>
                      <Text variant="caption" tone="inkSoft" style={styles.flex} numberOfLines={1}>
                        {sr.name}
                      </Text>
                      {sr.score == null ? (
                        <Text variant="caption" tone="muted">
                          {t('pro.svc_rating.none')}
                        </Text>
                      ) : (
                        <View style={styles.svcScore}>
                          <Ionicons name="star" size={11} color={colors.gold} />
                          <Text numeric variant="captionStrong" tone="ink">
                            {sr.score.toFixed(1)}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : null}

              {/* ELEŞTİRİ FİLTRESİ — olumsuz yorumu saklamak, en pahalı güven kaybıdır.
                  Saklamak yerine tek dokunuşla önüne getiriyoruz. */}
              {criticCount > 0 ? (
                <View style={styles.filterRow}>
                  <Pressable
                    onPress={() => setCritic(false)}
                    style={[styles.filterChip, !critic && styles.filterChipOn]}
                  >
                    <Text variant="caption" tone={critic ? 'inkSoft' : 'onAccent'}>
                      {t('pro.reviews.filter_all')} · {reviews.length}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setCritic(true)}
                    style={[styles.filterChip, critic && styles.filterChipOn]}
                  >
                    <Text variant="caption" tone={critic ? 'onAccent' : 'inkSoft'}>
                      {t('pro.reviews.filter_critic')} · {criticCount}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              {critic ? (
                <Text variant="caption" tone="muted" style={styles.criticNote}>
                  {t('pro.reviews.critic_note')}
                </Text>
              ) : null}

              {shownReviews.map((r) => (
                <View key={r.id} style={[styles.review, shadow.soft]}>
                  <View style={styles.reviewTop}>
                    <View style={styles.reviewAuthor}>
                      <View style={styles.reviewAvatar}>
                        <Ionicons name="shield-checkmark" size={14} color={colors.accentFg} />
                      </View>
                      <View style={styles.flex}>
                        <Text variant="bodyStrong" tone="ink">
                          {r.author}
                        </Text>
                        <Text variant="caption" tone="muted">
                          {r.service} · {r.period}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.reviewStars}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Ionicons
                          key={i}
                          name="star"
                          size={12}
                          color={i < r.rating ? colors.gold : colors.line}
                        />
                      ))}
                    </View>
                  </View>
                  <Text variant="body" tone="inkSoft" style={styles.reviewText}>
                    {r.text}
                  </Text>
                  {/* EK Z.10 — öncesi/sonrası foto galerisi */}
                  {r.photos && r.photos.length ? (
                    <View style={styles.reviewPhotos}>
                      {r.photos.map((uri, pi) => (
                        <Image key={`${uri}-${pi}`} source={{ uri }} style={styles.reviewPhoto} />
                      ))}
                    </View>
                  ) : null}
                  {r.reply ? (
                    <View style={styles.replyBox}>
                      <View style={styles.replyHead}>
                        <Ionicons name="storefront" size={12} color={colors.accentFg} />
                        <Text variant="caption" tone="accentFg" style={styles.replyLabel}>
                          {t('pro.review.reply')}
                        </Text>
                      </View>
                      <Text variant="body" tone="inkSoft">
                        {r.reply}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* CTA — coral Randevu Al */}
      {slotMs == null && tab === 'booking' ? (
        <View style={styles.bookHintWrap} pointerEvents="none">
          <Text variant="caption" tone="muted">
            {t('booking.schedule.pick_slot')}
          </Text>
        </View>
      ) : null}
      <View style={[styles.cta, { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }]}>
        {/* §5.5 — Takip et: karşılıklı takip serbest DM açar. Yalnız gerçek uzmanda. */}
        {pro.ownerUserId && token ? (
          <Pressable
            style={[styles.iconBtn, following && styles.iconBtnActive]}
            onPress={toggleFollow}
            accessibilityRole="button"
            accessibilityLabel={t('circle.follow')}
            accessibilityState={{ selected: following }}
          >
            <Ionicons
              name={following ? 'person-remove' : 'person-add-outline'}
              size={20}
              color={following ? colors.onAccent : colors.inkSoft}
            />
          </Pressable>
        ) : null}
        {/* EK Z.1 — DM: yalnız hesabı bağlı (gerçek) uzmanda görünür */}
        {pro.ownerUserId && token ? (
          <Pressable
            style={styles.iconBtn}
            onPress={messagePro}
            accessibilityRole="button"
            accessibilityLabel={t('messages.title')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.inkSoft} />
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.bookBtn, slotMs == null && styles.bookBtnDisabled]}
          onPress={book}
          disabled={slotMs == null}
          accessibilityRole="button"
          accessibilityState={{ disabled: slotMs == null }}
        >
          {/* Hepsi TEK SATIRDAYDI: iki hizmet seçilince "Randevu Al · 2 hizmet ·
              ₸19 200" düğmeye sığmıyor, metin iki yandan kırpılıyordu (düğme
              flex:1 ama içindeki Text daralamıyordu). Ayrıntı alt satıra alındı
              ve metin kutusu daralabilir yapıldı — hiçbir uzunlukta taşmaz. */}
          <View style={styles.bookLabel}>
            <Text variant="bodyStrong" tone="onAccent" numberOfLines={1}>
              {t('pro.book')}
            </Text>
            {chosen.length > 1 || totalPrice > 0 ? (
              <Text variant="caption" tone="onAccent" numberOfLines={1} style={styles.bookSub}>
                {[
                  chosen.length > 1 ? `${chosen.length} ${t('pro.services_short')}` : null,
                  totalPrice > 0 ? formatPrice(totalPrice) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}
          </View>
          <Ionicons name="arrow-forward" size={18} color={colors.onAccent} />
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    grow: { flex: 1 },
    // ── Kanvas Uzman.dc.html §ÜST — açık zeminde 48'lik kart düğmeler ──
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      paddingHorizontal: space(2.5),
    },
    topIconBtn: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // ── §KİMLİK — kesik portre 118×158 (132 görsel + 26 yansıma), SOLDA ──
    identityRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: space(2),
      paddingHorizontal: space(2.5),
      paddingTop: space(1.75),
    },
    identityText: { flex: 1, paddingBottom: space(3.75), gap: 6, minWidth: 0 },
    portraitCol: { width: 118, height: 158 },
    portraitWrap: { width: 118, height: 132, overflow: 'hidden', borderRadius: radius.md },
    portrait: { width: 118, height: 132 },
    reflection: { width: 118, height: 26, overflow: 'hidden' },
    reflectionImg: {
      width: 118,
      height: 132,
      marginTop: -106,
      transform: [{ scaleY: -1 }],
      opacity: 0.16,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    mapLink: { fontFamily: font.semibold },
    // ── §GÜVEN — tek kartta yıl · müşteri · puan ──
    trustCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      marginHorizontal: space(2.5),
      marginTop: space(1),
      padding: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
    },
    badgesRow: { paddingHorizontal: space(2.5), marginTop: space(1.5) },
    friendsRow: { paddingHorizontal: space(2.5), marginTop: space(1) },
    // ── Lime hero (Keşfet dili) ──
    heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    heroName: {
      flexShrink: 1,
      fontSize: 30,
      lineHeight: 34,
      fontFamily: font.semibold,
      letterSpacing: -0.6,
    },
    statCol: { flex: 1, alignItems: 'center', gap: 1, paddingHorizontal: space(0.5) },
    statSep: { width: 1, alignSelf: 'stretch', backgroundColor: colors.line },
    statRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    ratingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.7)',
      paddingHorizontal: space(1.25),
      paddingVertical: 6,
      borderRadius: radius.pill,
    },
    ratingPillText: { fontSize: 14 },
    ratingPillSub: {},
    friendsPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.7)',
      paddingHorizontal: space(1.25),
      paddingVertical: 6,
      borderRadius: radius.pill,
    },
    friendsText: {},
    sheet: {
      marginTop: 0,
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: space(3),
      paddingTop: space(2.5),
    },
    tabs: {
      flexDirection: 'row',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    tab: { flex: 1, alignItems: 'center', paddingVertical: space(1.5) },
    tabText: { fontSize: 15 },
    tabOn: { color: colors.accent },
    tabOff: { color: colors.muted },
    tabBar: {
      position: 'absolute',
      bottom: -StyleSheet.hairlineWidth,
      height: 2.5,
      width: '60%',
      borderRadius: 2,
      backgroundColor: colors.accent,
    },
    about: { marginTop: space(2.5), lineHeight: 22 },
    section: { marginTop: space(3), marginBottom: space(1.5) },
    promoList: { gap: space(1.5) },
    promoCard: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
    promoImage: { width: '100%', height: 110, backgroundColor: colors.surfaceMuted },
    promoBody: { padding: space(1.75), gap: space(0.75) },
    promoTop: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    promoPct: {
      backgroundColor: colors.accentFg,
      borderRadius: radius.pill,
      paddingHorizontal: space(1),
      paddingVertical: 2,
    },
    promoPctText: { fontFamily: font.semibold },
    staffRow: { gap: space(2), paddingRight: space(3) },
    staffCard: { alignItems: 'center', width: 68 },
    staffAvatarWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      padding: 3,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    staffAvatarOn: { borderColor: colors.accent },
    staffAvatar: {
      width: '100%',
      height: '100%',
      borderRadius: 30,
      backgroundColor: colors.bgSunken,
    },
    staffName: { marginTop: space(0.75) },
    services: { gap: space(1.25) },
    dayStrip: { gap: space(1), paddingRight: space(3), paddingVertical: space(0.5) },
    dayChip: {
      width: 56,
      alignItems: 'center',
      gap: 2,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingVertical: space(1),
    },
    dayChipOn: { backgroundColor: colors.accent },
    slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    slotChip: {
      minWidth: 76,
      alignItems: 'center',
      gap: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingVertical: space(1),
      paddingHorizontal: space(1.25),
    },
    slotChipBusy: { backgroundColor: colors.dangerSoft },
    slotChipPast: { opacity: 0.4 },
    slotChipOn: { backgroundColor: colors.accent },
    slotBusyText: { color: colors.danger },
    busyFreeHint: { marginTop: space(1), marginLeft: space(0.5) },
    bookBtnDisabled: { opacity: 0.45 },
    bookHintWrap: { alignItems: 'center', paddingBottom: space(0.75) },
    service: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
    },
    serviceActive: { backgroundColor: colors.accentSoft },
    serviceText: { flex: 1, gap: 3 },
    serviceNameRow: { flexDirection: 'row', alignItems: 'center', gap: space(0.75) },
    topTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: colors.goldSoft,
      paddingHorizontal: space(0.75),
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    topText: { color: colors.gold, fontFamily: font.semibold, fontSize: 10 },
    priceCol: { alignItems: 'flex-end' },
    strike: { textDecorationLine: 'line-through' },
    check: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: { backgroundColor: colors.accent },
    chipRow: { gap: space(1.25), paddingRight: space(3) },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5), marginTop: space(1) },
    gridCell: { width: '47.5%', aspectRatio: 0.82 },
    gridImg: {
      width: '100%',
      height: '100%',
      borderRadius: radius.lg,
      backgroundColor: colors.bgSunken,
    },
    // §6.1 bağlı salon + sertifika/sosyal
    salonLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
      marginTop: space(2.5),
    },
    salonIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    certRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1), alignItems: 'center' },
    certThumb: {
      width: 60,
      height: 60,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    socialInline: { gap: space(0.75) },
    socialChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: space(1.25),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
    },
    // §6.1 puan özeti + dağılım + kırılım
    ratingSummary: {
      flexDirection: 'row',
      gap: space(2),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
    },
    ratingAvgCol: { alignItems: 'center', gap: 4, justifyContent: 'center' },
    ratingBars: { flex: 1, justifyContent: 'center', gap: space(0.5) },
    distRow: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    distCount: { width: 34, textAlign: 'right' },
    svcRow: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
    svcScore: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    filterRow: { flexDirection: 'row', gap: space(1), marginBottom: space(1) },
    filterChip: {
      paddingHorizontal: space(1.5),
      paddingVertical: space(0.75),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    filterChipOn: { backgroundColor: colors.accent },
    criticNote: { marginBottom: space(1.25) },
    distStar: { width: 10, textAlign: 'center' },
    distTrack: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
    },
    distFill: { height: 6, borderRadius: 3, backgroundColor: colors.gold },
    breakdownCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1),
    },
    bdRow: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    bdLabel: { width: 84 },
    bdTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
    },
    bdFill: { height: 8, borderRadius: 4, backgroundColor: colors.accent },
    bdScore: { width: 26, textAlign: 'right', fontFamily: font.semibold },
    reviews: { gap: space(1.5), marginTop: space(1) },
    review: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(2) },
    reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reviewAuthor: { flexDirection: 'row', alignItems: 'center', gap: space(1), flex: 1 },
    flex: { flex: 1 },
    reviewAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reviewStars: { flexDirection: 'row', gap: 2 },
    reviewText: { marginTop: space(1.25) },
    reviewPhotos: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1), marginTop: space(1.25) },
    reviewPhoto: { width: 72, height: 72, borderRadius: radius.md },
    replyBox: {
      marginTop: space(1.25),
      padding: space(1.5),
      backgroundColor: colors.accentSoft,
      borderRadius: radius.md,
      gap: space(0.75),
    },
    replyHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    replyLabel: { fontFamily: font.semibold },
    cta: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.bg,
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
    },
    iconBtn: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnActive: { backgroundColor: colors.accent },
    bookBtn: {
      flexGrow: 1,
      flexShrink: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 56,
      paddingHorizontal: space(2),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
    },
    // Metin kutusu DARALABİLİR olmalı; yoksa uzun etiket düğmeyi taşırır.
    bookLabel: { flexShrink: 1, minWidth: 0, alignItems: 'center' },
    bookSub: { opacity: 0.85 },
  });
