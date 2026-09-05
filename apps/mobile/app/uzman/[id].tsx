import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatPrice } from '../../src/data';
import { formatSlotTr } from '../../src/datetime';
import { tri } from '../../src/taxonomy';
import { hizmetleriGrupla } from '../../src/hizmet-gruplama';
import { useProfessionalDetail } from '../../src/catalog';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space, font } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  DateField,
  HizmetIkonu,
  SaglayiciFoto,
  TepeIsigi,
  Text,
  WaveLayered,
} from '../../src/ui';

export default function UzmanScreen() {
  const { id, salon: salonParam } = useLocalSearchParams<{ id: string; salon?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, locale } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);

  /*
   * ── SALON KİMLİĞİ ARTIK ADRESTEN TAHMİN EDİLMİYOR ──────────────────
   *
   * Kurucu: "uzman salona kayıt yaptı ve salonda görünüyor. ama müşteri
   * uzmanın profiline tıkladığında 'bu profil bulunamadı' diye hata
   * veriyor."
   *
   * Salon kimliği uzmanın kimliğinden ÇIKARILIYORDU:
   * `id.split('-u')[0]`. Bu, eski demo kimliklerinin (`salon1-u2`)
   * biçimine göre yazılmış bir varsayımdı. Gerçek kadro kimlikleri UUID
   * ve içinde `-u` yok — bölme ya çöp veriyor ya da kimliğin tamamını
   * salon sanıyor. Sonuç: salonda görünen uzmanın profili hiç açılmıyor.
   *
   * Salon kimliği artık bağlantıyla AÇIKÇA geliyor. Eski biçimdeki
   * bağlantılar (paylaşılmış olabilir) için bölme YEDEK olarak duruyor.
   *
   * ── BAŞKA KİŞİYE DÜŞMEK YOK ──────────────────────────────────────
   *
   * İstenen uzman kadroda bulunamazsa LİSTEDEKİ İLK KİŞİ gösteriliyordu:
   * başkasının adı, fotoğrafı, puanı ve çalışan bir "Randevu al"
   * düğmesiyle. O da kaldırıldı.
   */
  const salonId = (salonParam ?? '').trim() || (id ?? '').split('-u')[0] || '';
  const salon = useProfessionalDetail(salonId);
  const uzman = salonId ? salon.staff.find((u) => u.id === id) : undefined;

  const [selected, setSelected] = useState<string>(salon.services[0]?.id ?? '');
  const gruplar = hizmetleriGrupla(salon.services);
  const minDate = new Date(Date.now() + 2 * 3_600_000);
  minDate.setMinutes(0, 0, 0);
  const [when, setWhen] = useState<Date>(() => new Date(minDate));

  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const isFav = useStore((s) => s.favorites.includes(salonId));
  const addBooking = useStore((s) => s.addBooking);

  // Uzman kaydı yoksa (ör. bağımsız) salon detayına düş; salon da yoksa aramaya.
  if (!uzman) {
    router.replace(salonId ? '/professional/' + salonId : '/search');
    return null;
  }

  // Tarih/saat detay sayfasında seçildi → doğrudan randevu oluştur
  const book = () => {
    const svc = salon.services.find((s) => s.id === selected);
    const startMs = when.getTime();
    const bid = addBooking({
      source: 'direct',
      service: svc ? (svc.label ? tri(svc.label, locale) : svc.name) : salon.specialty,
      proId: salon.id,
      proName: salon.name,
      proImage: salon.image,
      uzmanName: uzman.name,
      startMs,
      durationMin: svc?.durationMin ?? 60,
      price: svc?.price ?? Number(salon.priceFrom),
    });
    router.replace({
      pathname: '/booking/confirmed',
      params: {
        id: bid,
        proId: salon.id,
        source: 'direct',
        slot: formatSlotTr(startMs),
        uzmanName: uzman.name,
      },
    });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        {/*
          HERO — erik sisi bant.

          Burası ESKİ tasarımda lime yeşili bir banttı ve üstündeki yazı
          `ink` (koyu) idi. Palet Figma'ya geçince zemin koyu eriğe döndü
          ama YAZI DEĞİŞMEDİ: uzmanın adı açık temada 1.33:1, koyuda
          2.02:1 — yani hiç okunmuyordu. Zemin erik sisine indi; `ink`
          orada 16.06:1 veriyor ve Denge'ye de uyuyor.
        */}
        <View style={[styles.hero, { paddingTop: insets.top + space(1) }]}>
          {/* Tepe ışığı hero'nun İÇİNDE: kutunun kendi zemini ve
              `overflow: hidden` kırpması var, dışına koysak taşardı. */}
          <TepeIsigi />
          <View style={styles.heroTop}>
            <Pressable style={styles.circleBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={colors.ink} />
            </Pressable>
            <Pressable style={styles.circleBtn} onPress={() => toggleFavorite(salonId)}>
              <Ionicons
                name={isFav ? 'heart' : 'heart-outline'}
                size={20}
                color={isFav ? colors.rose : colors.ink}
              />
            </Pressable>
          </View>

          <View style={styles.heroBody}>
            <View style={styles.heroInfo}>
              <View style={styles.badgePill}>
                <Ionicons name="sparkles" size={12} color={colors.accentFg} />
                <Text variant="caption" tone="ink" style={styles.badgePillText}>
                  {uzman.role}
                </Text>
              </View>
              <Text variant="display" tone="ink" style={styles.heroName} numberOfLines={2}>
                {uzman.name}
              </Text>
              <View style={styles.heroStats}>
                <View style={styles.ratingPill}>
                  <Ionicons name="star" size={13} color={colors.gold} />
                  <Text variant="bodyStrong" tone="ink" style={styles.ratingPillText}>
                    {uzman.rating.toFixed(1)}
                  </Text>
                </View>
                <Pressable
                  style={styles.salonPill}
                  onPress={() => router.push('/professional/' + salonId)}
                >
                  <Ionicons name="storefront-outline" size={12} color={colors.ink} />
                  <Text variant="caption" tone="ink" style={styles.salonPillText} numberOfLines={1}>
                    {salon.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.ink} />
                </Pressable>
              </View>
            </View>
            <SaglayiciFoto uri={uzman.image} ad={uzman.name} style={styles.heroPortrait} />
          </View>
          <View style={styles.waveAbs}>
            <WaveLayered sliver={colors.bg} bottom={colors.bg} height={70} />
          </View>
        </View>

        {/* SHEET */}
        <View style={styles.sheet}>
          <Text variant="body" tone="inkSoft" style={styles.about}>
            {salon.about}
          </Text>

          <Text variant="bodyStrong" tone="ink" style={styles.section}>
            {t('pro.services')}
          </Text>
          {/*
           * BRIEF §4.7 — kategori → alt hizmet hiyerarşisi.
           *
           * Düz liste vardı. Brief §4.1 ile uzman aynı alt hizmetin altına
           * birden çok satır ekleyebiliyor ("Kök boyası", "Tam boya");
           * dört kategoride çalışan bir uzmanın on beş satırı sırasız
           * akıyor ve müşteri aradığı hizmeti bulamıyordu.
           *
           * Tek kategoride çalışan uzmanda başlık ÇİZİLMİYOR: tek başlıklı
           * bir grup bilgi taşımaz, yalnız yer kaplar.
           */}
          <View style={styles.services}>
            {gruplar.map((g) => (
              <View key={g.kategoriId ?? 'kategorisiz'} style={styles.grup}>
                {gruplar.length > 1 ? (
                  <View style={styles.grupBas}>
                    {g.kategoriId ? <HizmetIkonu id={g.kategoriId} tarz="satir" /> : null}
                    <Text variant="caption" tone="accentFg" style={styles.grupAd}>
                      {g.ad ? tri(g.ad, locale) : t('pro.services_other')}
                    </Text>
                  </View>
                ) : null}
                {g.satirlar.map((s) => {
                  const active = s.id === selected;
                  const finalPrice = s.discountPct
                    ? Math.round((s.price * (100 - s.discountPct)) / 100)
                    : s.price;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => setSelected(s.id)}
                      style={[styles.service, shadow.soft, active && styles.serviceActive]}
                    >
                      <View style={styles.serviceText}>
                        <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                          {s.name}
                        </Text>
                        <Text variant="caption" tone="muted">
                          {s.durationMin} {t('pro.min')}
                          {s.discountPct ? `  ·  −%${s.discountPct}` : ''}
                        </Text>
                      </View>
                      <Text variant="bodyStrong" tone="ink">
                        {formatPrice(finalPrice)}
                      </Text>
                      <View style={[styles.check, active && styles.checkOn]}>
                        {active ? (
                          <Ionicons name="checkmark" size={14} color={colors.onAccent} />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
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
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + space(1) }]}>
        <Pressable style={styles.ctaBtn} onPress={book}>
          <Text variant="bodyStrong" tone="onAccent" style={styles.ctaText} numberOfLines={1}>
            {t('pro.book')}
          </Text>
          <Ionicons name="arrow-forward" size={19} color={colors.onAccent} />
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
      backgroundColor: colors.heroSoft,
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
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.7)',
      paddingHorizontal: space(1.25),
      paddingVertical: 5,
      borderRadius: radius.pill,
      marginBottom: space(1),
    },
    badgePillText: { fontFamily: font.semibold },
    heroName: { fontSize: 30, lineHeight: 34, fontFamily: font.semibold, letterSpacing: -0.4 },
    heroStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      marginTop: space(1),
      flexWrap: 'wrap',
    },
    ratingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.7)',
      paddingHorizontal: space(1.25),
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    ratingPillText: { fontFamily: font.semibold },
    salonPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.7)',
      paddingHorizontal: space(1.25),
      paddingVertical: 6,
      borderRadius: radius.pill,
      maxWidth: 190,
    },
    salonPillText: { flexShrink: 1, fontFamily: font.semibold },
    heroPortrait: {
      width: 128,
      height: 168,
      borderRadius: radius.lg,
      borderWidth: 3,
      borderColor: colors.surface,
      backgroundColor: colors.bgSunken,
    },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      marginTop: 0,
      paddingHorizontal: space(3),
      paddingTop: space(3),
    },
    about: { lineHeight: 21 },
    section: { marginTop: space(3), marginBottom: space(1.5), fontSize: 17 },
    services: { gap: space(1.25) },
    grup: { gap: space(1.25) },
    // Başlık satırı: kategori ikonu + adı. Hizmet satırlarından ayrılsın
    // diye üstünde boşluk var, altında yok — başlık kendi grubuna yapışık.
    grupBas: { flexDirection: 'row', alignItems: 'center', gap: space(1), marginTop: space(1) },
    grupAd: { fontFamily: font.semibold, letterSpacing: 0.2 },
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
    serviceText: { flex: 1 },
    check: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: { backgroundColor: colors.accent },
    chipRow: { gap: space(1), paddingRight: space(3) },
    dayChip: {
      width: 58,
      alignItems: 'center',
      paddingVertical: space(1.25),
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    dayChipOn: { backgroundColor: colors.accent },
    dayNum: { fontSize: 18, fontFamily: font.semibold, marginTop: 2 },
    timeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    timeChip: {
      paddingHorizontal: space(2),
      paddingVertical: space(1.25),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    timeChipOn: { backgroundColor: colors.accent },
    timeText: { fontFamily: font.semibold },
    cta: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      backgroundColor: colors.bg,
    },
    ctaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(1),
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
    },
    ctaText: { fontFamily: font.semibold, fontSize: 16 },
  });
