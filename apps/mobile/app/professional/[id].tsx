import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MessageKey } from '@ayna/i18n';
import { formatPrice } from '../../src/data';
import { formatSlotTr } from '../../src/datetime';
import { tri } from '../../src/taxonomy';
import { ApiError, api } from '../../src/api';
import { useProfessionalDetail } from '../../src/catalog';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { DateField, TAB_BAR_CLEARANCE, Text, WaveLayered } from '../../src/ui';

type Tab = 'booking' | 'portfolio' | 'reviews';
const HOT_PINK = '#FF2E93'; // favori (kalp) aktif rengi

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
  const [when, setWhen] = useState<Date>(() => {
    const d = new Date(Date.now() + 2 * 3_600_000);
    d.setMinutes(0, 0, 0);
    return d;
  });
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const isFav = useStore((s) => s.favorites.includes(proId));
  const token = useStore((s) => s.token);
  const addBooking = useStore((s) => s.addBooking);
  const userReviewsMap = useStore((s) => s.userReviews);

  const uzmanId = pro.staff[0]?.id ?? '';
  const isSalon = pro.kind === 'salon' && pro.staff.length > 0;
  const minDate = new Date(Date.now() + 2 * 3_600_000);
  minDate.setMinutes(0, 0, 0);
  const reviews = [...(userReviewsMap[proId] ?? []), ...pro.reviews];
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
    const svcNames =
      chosen.map((s) => (s.label ? tri(s.label, locale) : s.name)).join(' + ') || pro.specialty;
    const uzman = pro.staff.find((u) => u.id === uzmanId);
    const startMs = when.getTime();
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
        {/* HERO — lime bant (Keşfet dili): çerçeveli portre + isim/puan/bağ + dalga geçişi */}
        <View style={[styles.hero, { paddingTop: insets.top + space(1) }]}>
          <View style={styles.heroTop}>
            <Pressable style={styles.circleBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={colors.ink} />
            </Pressable>
            <Pressable style={styles.circleBtn} onPress={() => toggleFavorite(proId)}>
              <Ionicons
                name={isFav ? 'heart' : 'heart-outline'}
                size={20}
                color={isFav ? HOT_PINK : colors.ink}
              />
            </Pressable>
          </View>

          <View style={styles.heroBody}>
            <View style={styles.heroInfo}>
              <View style={styles.badgePill}>
                <Ionicons name="checkmark-circle" size={12} color={colors.accentFg} />
                <Text variant="caption" tone="ink" style={styles.badgePillText}>
                  {t(isSalon ? 'pro.kind.salon' : 'pro.kind.independent')}
                </Text>
              </View>
              <View style={styles.heroNameRow}>
                <Text variant="display" tone="ink" style={styles.heroName} numberOfLines={2}>
                  {pro.name}
                </Text>
                {/* EK Z.3 — doğrulanmış uzman rozeti (KYC onaylı hesap) */}
                {pro.kycVerified ? (
                  <Ionicons
                    name="shield-checkmark"
                    size={22}
                    color={colors.ink}
                    style={styles.verifiedIcon}
                  />
                ) : null}
              </View>
              <Text variant="caption" tone="inkSoft" style={styles.heroMeta} numberOfLines={1}>
                {pro.specialty} · {pro.district}
              </Text>
              <View style={styles.heroStats}>
                <View style={styles.ratingPill}>
                  <Ionicons name="star" size={13} color={colors.gold} />
                  <Text variant="bodyStrong" tone="ink" style={styles.ratingPillText}>
                    {pro.rating.toFixed(1)}
                  </Text>
                  <Text variant="caption" tone="muted" style={styles.ratingPillSub}>
                    ({pro.reviewCount})
                  </Text>
                </View>
                {pro.friends ? (
                  <View style={styles.friendsPill}>
                    <Ionicons name="people" size={12} color={colors.ink} />
                    <Text variant="caption" tone="ink" style={styles.friendsText}>
                      {pro.friends} {t('pro.friends_here')}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            <Image source={{ uri: pro.image }} style={styles.heroPortrait} />
          </View>
          <View style={styles.waveAbs}>
            <WaveLayered sliver={colors.bg} bottom={colors.bg} height={70} />
          </View>
        </View>

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

              {/* Tarih & saat — Benim İçin kayıt eklemeleriyle AYNI native seçici */}
              <Text variant="bodyStrong" tone="ink" style={styles.section}>
                {t('booking.schedule.time')}
              </Text>
              <View style={[styles.dateCard, shadow.soft]}>
                <DateField
                  label={t('booking.schedule.datetime')}
                  value={when}
                  onChange={setWhen}
                  mode="datetime"
                  minimumDate={minDate}
                  last
                />
              </View>
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
                        <Text variant="caption" tone="muted" style={styles.distStar}>
                          {star}
                        </Text>
                        <View style={styles.distTrack}>
                          <View style={[styles.distFill, { width: `${pct}%` }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* §7.1 — alt kırılım çubukları (hizmet kalitesi/temizlik/iletişim/zamanlama) */}
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

              {reviews.map((r) => (
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
      <View style={[styles.cta, { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }]}>
        {/* EK Z.1 — DM: yalnız hesabı bağlı (gerçek) uzmanda görünür */}
        {pro.ownerUserId && token ? (
          <Pressable style={styles.iconBtn} onPress={messagePro}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.inkSoft} />
          </Pressable>
        ) : null}
        <Pressable style={styles.bookBtn} onPress={book}>
          <Text variant="bodyStrong" tone="onAccent">
            {t('pro.book')}
            {chosen.length > 1 ? ` · ${chosen.length} ${t('pro.services_short')}` : ''}
            {totalPrice > 0 ? ` · ${formatPrice(totalPrice)}` : ''}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={colors.onAccent} />
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    // ── Lime hero (Keşfet dili) ──
    hero: {
      backgroundColor: colors.accent,
      paddingHorizontal: space(3),
      paddingBottom: space(5),
      position: 'relative',
      overflow: 'hidden',
    },
    waveAbs: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2 },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between' },
    circleBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroBody: { flexDirection: 'row', alignItems: 'flex-end', marginTop: space(2), zIndex: 2 },
    heroInfo: { flex: 1, paddingRight: space(1.5), paddingBottom: space(1) },
    badgePill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.7)',
      paddingHorizontal: space(1.25),
      paddingVertical: 5,
      borderRadius: radius.pill,
      marginBottom: space(1),
    },
    badgePillText: { fontWeight: '700' },
    heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    heroName: {
      flexShrink: 1,
      fontSize: 30,
      lineHeight: 34,
      fontWeight: '800',
      letterSpacing: -0.6,
    },
    verifiedIcon: { marginTop: space(0.5) },
    heroMeta: { marginTop: 2 },
    heroStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      marginTop: space(1.5),
      flexWrap: 'wrap',
    },
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
    heroPortrait: {
      width: 128,
      height: 168,
      borderRadius: radius.lg,
      borderWidth: 3,
      borderColor: colors.surface,
      backgroundColor: colors.bgSunken,
    },
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
    tabOn: { color: '#6F8C1B' },
    tabOff: { color: colors.muted },
    tabBar: {
      position: 'absolute',
      bottom: -StyleSheet.hairlineWidth,
      height: 2.5,
      width: '60%',
      borderRadius: 2,
      backgroundColor: '#6F8C1B',
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
    promoPctText: { fontWeight: '800' },
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
    dateCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(2) },
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
    topText: { color: colors.gold, fontWeight: '700', fontSize: 10 },
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
    dayChip: {
      width: 60,
      alignItems: 'center',
      gap: 2,
      paddingVertical: space(1.5),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
    },
    dayChipOn: { backgroundColor: colors.accent },
    dayNum: { fontSize: 18, fontWeight: '800' },
    timeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    timeChip: {
      paddingHorizontal: space(2.25),
      paddingVertical: space(1.25),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    timeChipOn: { backgroundColor: colors.accent },
    timeText: { fontWeight: '600' },
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
    bdScore: { width: 26, textAlign: 'right', fontWeight: '700' },
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
    replyLabel: { fontWeight: '600' },
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
    bookBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
    },
  });
