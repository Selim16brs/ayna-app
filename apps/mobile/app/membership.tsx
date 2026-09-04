import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { ApiError, api } from '../src/api';
import { formatPrice, PLATINUM_PRICE_KZT, PREMIUM_PRICE_KZT } from '../src/data';
import { useLocale } from '../src/locale';
import { selectSellerView, useStore } from '../src/store';
import { type ColorTokens, radius, space } from '../src/theme';
import { useTheme, useThemedStyles } from '../src/theme-context';
import { Button, Screen, Segmented, StackHeader, TAB_BAR_CLEARANCE, Text } from '../src/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;
// §11.1 — satıcı (uzman/salon) premium GÖRÜNÜRLÜK PAKETİ
const BENEFITS: { icon: IoniconName; title: MessageKey; desc: MessageKey }[] = [
  { icon: 'star', title: 'premium.b.featured', desc: 'premium.b.featured_d' },
  { icon: 'location', title: 'premium.b.nearby', desc: 'premium.b.nearby_d' },
  { icon: 'pricetags', title: 'premium.b.showcase', desc: 'premium.b.showcase_d' },
  { icon: 'megaphone', title: 'premium.b.promo', desc: 'premium.b.promo_d' },
];
// §11 — Platinum'a özel ek avantajlar (Premium'un ÜSTÜNE).
// K6 — "düşük komisyon %8,5" buradan KALDIRILDI: sunucu komisyonu hesaplarken
// paketi hiç okumuyor, yani ödenen şey verilmiyordu. Kademeli oran matrisi (D4)
// canlıya çıktığı gün geri konur — daha önce değil.
// Aynı gerekçeyle "yakın açık taleplere yanıt" da Premium listesinden çıktı:
// talep dalgası şehirdeki TÜM aktif uzmanlara gidiyor, pakete bakmıyor.
const PLATINUM_BENEFITS: { icon: IoniconName; title: MessageKey; desc: MessageKey }[] = [
  { icon: 'infinite', title: 'premium.b.always', desc: 'premium.b.always_d' },
];

/**
 * MÜŞTERİ paketi — satıcınınkinden bambaşka.
 *
 * Bu ekran baştan sona satıcı diliyle yazılmıştı: öne çıkarma, yakında
 * görünme, vitrin, kampanya. Müşteri profilindeki paket rozetine dokunan
 * kişi, kendisiyle hiç ilgisi olmayan bir satış sayfası görüyordu.
 *
 * Liste KISA çünkü yalnız GERÇEKTEN uygulanan iki avantaj var:
 *   - Boni: sunucu AI ucu paketi okuyor, ödemeyene `PREMIUM_REQUIRED` atıyor.
 *   - Cut-out foto: mağaza `free` kullanıcıda `not_premium` döndürüyor.
 *
 * Pasaport ekranındaki listede iki tane daha yazıyor — "öncelikli destek" ve
 * "öne çıkan görünürlük". İkisini de BİLEREK almadım: destek modülü paketi
 * hiç okumuyor, "görünürlük" ise yalnız duyuru segmenti (müşteriyi öne
 * çıkarmıyor, ona duyuru gönderiyor). Bu, bu dosyanın zaten kayıt altına
 * aldığı K6 kuralının aynısı: para alınan ekranda verilmeyen şey listelenmez.
 */
const CUSTOMER_BENEFITS: { icon: IoniconName; title: MessageKey; desc: MessageKey }[] = [
  { icon: 'sparkles', title: 'premium.c.boni', desc: 'premium.c.boni_d' },
  { icon: 'person-circle', title: 'premium.c.cutout', desc: 'premium.c.cutout_d' },
  // Bu ikisi listeden ÇIKARILMIŞTI çünkü karşılıkları yoktu: destek modülü
  // paketi hiç okumuyordu ve "görünürlük" yalnız duyuru segmentiydi. Artık
  // gerçekten uygulanıyorlar (talep havuzunda öne çıkma + destek kuyruğunda
  // öncelik), o yüzden geri kondular.
  { icon: 'flash', title: 'premium.c.priority', desc: 'premium.c.priority_d' },
  { icon: 'headset', title: 'premium.c.support', desc: 'premium.c.support_d' },
];

export default function SellerPremiumScreen() {
  const { t } = useLocale();
  const { colors, gradients, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const premium = useStore((s) => s.premium);
  const platinum = useStore((s) => s.platinum);
  const isSeller = useStore(selectSellerView);
  const refreshMembership = useStore((s) => s.refreshMembership);
  // §11 — onay push'undan gelindiğinde: tier'ı sunucudan tazele → haklar anında açılır
  useFocusEffect(
    useCallback(() => {
      void refreshMembership();
    }, [refreshMembership]),
  );
  const token = useStore((s) => s.token);
  const [busy, setBusy] = useState(false);

  const { tier: tierParam } = useLocalSearchParams<{ tier?: string }>();
  /**
   * Müşteride Platinum YOK — ve bu bir eksiklik değil, dürüstlük.
   *
   * Platinum'un tüm ek hakları satıcıya ait: Always (sadık müşteri bağı) ve
   * toplu kampanya, ikisi de `isProvider` kapısının arkasında. Müşteri için
   * Premium'un üstünde hiçbir şey açılmıyor. Ayda 1999₸'lik bir kademeyi
   * karşılığı olmadan satmak, hava satmaktır.
   *
   * Platinum'a müşteri hakkı eklendiği gün burası tek satırla geri açılır.
   */
  const [tier, setTier] = useState<'premium' | 'platinum'>(
    !isSeller || tierParam === 'premium' ? 'premium' : 'platinum',
  );
  const isPlat = tier === 'platinum';
  /*
   * FİYAT ÖNCE SUNUCUDAN.
   *
   * İki sabit okunuyordu; pasaport ekranı ise sunucu değerini önceliyordu.
   * Aynı ürün iki ekranda FARKLI fiyatla görünebiliyordu ve buradaki
   * tutar dekont ekranına ÖDENECEK TUTAR olarak geçiyordu: admin fiyatı
   * güncellediğinde kullanıcı eski fiyatı ödemeye yönlendiriliyordu.
   */
  const oranlar = useStore((s) => s.config.rates);
  const tierPrice = isPlat
    ? oranlar.platinumUserKzt || PLATINUM_PRICE_KZT
    : oranlar.premiumUserKzt || PREMIUM_PRICE_KZT;
  const benefits = !isSeller
    ? CUSTOMER_BENEFITS
    : isPlat
      ? [...BENEFITS, ...PLATINUM_BENEFITS]
      : BENEFITS;
  // 'platinum' sekmesi → platinum sahip mi; 'premium' sekmesi → premium (ya da platinum) sahip mi
  const owned = isPlat ? platinum : premium || platinum;

  // §11/§460 — satın alma: backend'de abonelik talebi oluştur → dekont ekranı → admin onayı.
  // Gerçek ödeme app DIŞINDA (Kaspi/banka); tier admin dekontu onaylayınca aktifleşir.
  const purchase = async () => {
    if (!token || busy) return;
    setBusy(true);
    try {
      const sub = await api.createSubscription(tier, token);
      router.replace({
        pathname: '/seller/sub-receipt',
        params: { id: sub.id, tier, amount: String(tierPrice) },
      });
    } catch (err) {
      const code = err instanceof ApiError ? `${err.code || err.status}` : '';
      Alert.alert(t('premium.title'), code ? `${t('sub.error')} (${code})` : t('sub.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('premium.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* §11 — paket seçimi: Premium ↔ Platinum. Müşteride tek kademe var
            (gerekçe `tier` state'inde), o yüzden seçici çizilmiyor: tek
            seçenekli bir seçici, olmayan bir tercih varmış gibi gösterir. */}
        {isSeller ? (
          <View style={styles.tierWrap}>
            <Segmented
              options={[
                { value: 'premium', label: t('premium.tier_premium') },
                { value: 'platinum', label: t('premium.tier_platinum') },
              ]}
              value={tier}
              onChange={setTier}
            />
          </View>
        ) : null}

        {/* Plan kartı */}
        <LinearGradient colors={gradients.gold} style={styles.plan}>
          <View style={styles.crown}>
            <Ionicons
              name={isSeller && isPlat ? 'infinite' : 'star'}
              size={26}
              color={colors.onAccent}
            />
          </View>
          <Text variant="bodyStrong" tone="onAccent" style={styles.planName}>
            {isPlat ? t('premium.platinum_name') : t('premium.plan_name')}
          </Text>
          <View style={styles.priceRow}>
            <Text variant="display" tone="onAccent" style={styles.price}>
              {formatPrice(tierPrice)}
            </Text>
            <Text variant="bodyStrong" tone="onAccent" style={styles.perMonth}>
              {t('premium.per_month')}
            </Text>
          </View>
          <Text variant="caption" tone="onAccent" style={styles.tagline}>
            {/* "İşini büyüt, daha çok müşteriye ulaş" müşteriye anlamsız —
                onun işi yok. */}
            {!isSeller
              ? t('premium.c.tagline')
              : isPlat
                ? t('premium.platinum_tagline')
                : t('premium.tagline')}
          </Text>
        </LinearGradient>

        {/* K6 — "Platinum ile komisyon %8,5" şeridi kaldırıldı: sunucu komisyon
            hesabında paketi hiç okumuyor. Kademeli oran matrisi (D4) canlıya
            çıkınca geri gelir. */}

        {/* Avantajlar — görünürlük paketi (ikon + başlık + açıklama) */}
        <Text variant="bodyStrong" tone="ink" style={styles.sectionTitle}>
          {t('premium.section')}
        </Text>
        <View style={styles.benefits}>
          {benefits.map((b) => (
            <View key={b.title} style={[styles.benefitRow, shadow.soft]}>
              <View style={styles.benefitIcon}>
                <Ionicons name={b.icon} size={19} color={colors.accentFg} />
              </View>
              <View style={styles.flex}>
                <Text variant="bodyStrong" tone="ink" numberOfLines={1}>
                  {t(b.title)}
                </Text>
                <Text variant="caption" tone="muted">
                  {t(b.desc)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* §460 — ödeme app dışı bilgilendirme */}
        <View style={styles.payNote}>
          <Ionicons name="card-outline" size={15} color={colors.accentFg} />
          <Text variant="caption" tone="accentFg" style={styles.flex}>
            {t('premium.pay_note')}
          </Text>
        </View>

        <Text variant="caption" tone="muted" style={styles.cancel}>
          {t('premium.cancel')}
        </Text>
      </ScrollView>

      {/* Alt sabit CTA */}
      <View style={styles.footer}>
        {owned ? (
          <View style={styles.activeTag}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text variant="bodyStrong" tone="ink">
              {t('premium.already')}
            </Text>
          </View>
        ) : (
          <Button
            label={`${isPlat ? t('premium.platinum_cta') : t('premium.cta')} · ${formatPrice(tierPrice)}`}
            variant="primary"
            disabled={busy}
            onPress={purchase}
          />
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingTop: space(2.5), paddingBottom: space(4) },
    flex: { flex: 1 },
    tierWrap: { marginBottom: space(2) },
    plan: { borderRadius: radius.xl, padding: space(3), alignItems: 'center', gap: space(0.5) },
    crown: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(255,255,255,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space(0.5),
    },
    planName: { letterSpacing: 0.3, opacity: 0.95 },
    priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
    price: { fontSize: 40, letterSpacing: -1 },
    perMonth: { marginBottom: space(1), opacity: 0.9 },
    tagline: { opacity: 0.9, textAlign: 'center' },
    sectionTitle: { marginTop: space(3), marginBottom: space(1.5) },
    benefits: { gap: space(1.25) },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(1.75),
    },
    benefitIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    payNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      backgroundColor: colors.accentSoft,
      padding: space(1.5),
      borderRadius: radius.md,
      marginTop: space(3),
    },
    cancel: { textAlign: 'center', marginTop: space(2) },
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: TAB_BAR_CLEARANCE, // §ui — global tab bar üstünde kalsın
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
      backgroundColor: colors.bg,
    },
    activeTag: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(0.75),
    },
  });
