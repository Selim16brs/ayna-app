import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../locale';
import { type ColorTokens, radius, space, font } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';
import { type PlanTier } from '../plan';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * PAKET ROZETİ — üç kademenin GÖRSEL HİYERARŞİSİ.
 *
 * Kurucu: _"rozetler ve paketler daha gösterişli şekilde gösterilmeli...
 * belirgin ikonlar ve göz alıcı olmalı."_
 *
 * Eskiden paket, profildeki 12pt'lik gri bir çipti ("Premium üye") ve
 * Platinum'un ayrı bir görünümü YOKTU — en pahalı paket, Premium'la aynı
 * çipte görünüyordu. Uzman profilinde ise paket hiç yoktu: müşteri kime
 * randevu aldığını bilmiyordu.
 *
 * Kademeler artık BAKIŞLA ayrışıyor — üçü de aynı kalıbın varyantı değil:
 *
 *   free      sessiz  · dolgusuz, ince çerçeve, soluk ikon
 *   premium   sıcak   · kehribar ombre, dolu yıldız
 *   platinum  mücevher· derin mürdüm ombre + gül parıltı, elmas
 *
 * Sıra tesadüf değil: sessizden sıcağa, sıcaktan mücevhere. `free` bilerek
 * çekici DEĞİL — satın alınmamış bir paketin gösterişli görünmesi, gerçekten
 * ödeyenin rozetini değersizleştirir.
 *
 * Renkler AYNA paletinden alınmış ama TEMAYLA DEĞİŞMİYOR — gerekçesi
 * `EMBLEM` sabitinin başında.
 */

/**
 * Etiket ROLE göre değişiyor: müşteride "Premium üye", uzmanda "Premium
 * uzman". Aynı metni iki yerde kullanmak, uzman profilinde bakan kişiye
 * kendi üyeliğini gösteriyormuş gibi okunuyordu.
 */
const META: Record<PlanTier, { icon: IoniconName; label: MessageKey; proLabel: MessageKey }> = {
  free: { icon: 'person-circle-outline', label: 'plan.free', proLabel: 'plan.pro_free' },
  premium: { icon: 'star', label: 'plan.premium', proLabel: 'plan.pro_premium' },
  platinum: { icon: 'diamond', label: 'plan.platinum', proLabel: 'plan.pro_platinum' },
};

/**
 * Amblem renkleri TEMADAN BAĞIMSIZ — ve bu bilinçli.
 *
 * İlk yazdığımda tema token'ları kullanmıştım: `[colors.accent, colors.ink]`.
 * Bu, paletin kendi uyardığı hatanın aynısıydı — `ink` bir METİN rengi ve
 * koyu temada AÇIK renge dönüyor, yani Platinum rozeti koyu modda bembeyaz
 * oluyordu. Kehribar da tema ile açılınca üzerindeki açık yazı okunmaz hâle
 * geliyordu (ölçtüm: ~2.2:1).
 *
 * Doğru zihinsel model: bunlar YÜZEY değil, AMBLEM. Madalya gibi — ışık
 * değişince madalya renk değiştirmez. Palet zaten aynı gerekçeyle
 * `onPastel`'i iki temada da aynı tutuyor.
 *
 * Ölçülen kontrastlar (yazı #FBF8F6):
 *   Premium   4.71:1 … 7.95:1     Platinum  10.47:1 … 15.22:1
 * En düşüğü 4.71 — küçük yazı eşiği 4.5'in üstünde.
 */
const EMBLEM = {
  // Kehribar: uygulamanın "yıldız/dikkat" rengi → kazanılmış statü.
  premium: ['#9A641F', '#6E4411'] as const,
  // Ayna Mürdüm → mürekkep. Sıcak değil derin: Premium'un bir üstü.
  platinum: ['#5A2A55', '#261F25'] as const,
};
const ON_EMBLEM = '#FBF8F6';
/**
 * Amblem kenarı.
 *
 * Koyu temada Platinum'un koyu ucu zeminle 1.13:1 — kenar pratikte
 * KAYBOLUYORDU, rozet arka plana akıyordu. İnce ışıklı çerçeve hem bunu
 * çözüyor hem de yüzeye madalya kenarı niteliği katıyor.
 */
const EMBLEM_RIM = 'rgba(251,248,246,0.22)';

export function PlanBadge({
  tier,
  size = 'md',
  role = 'customer',
}: {
  tier: PlanTier;
  /** `sm` listede/başlıkta, `md` profilde. */
  size?: 'sm' | 'md';
  /** Etiket dili: `pro` → "Premium uzman", `customer` → "Premium üye". */
  role?: 'customer' | 'pro';
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const meta = META[tier];
  const etiket = role === 'pro' ? meta.proLabel : meta.label;
  const kucuk = size === 'sm';
  const ikonBoyu = kucuk ? 12 : 15;

  if (tier === 'free') {
    return (
      <View style={[styles.base, kucuk ? styles.sm : styles.md, styles.free]}>
        <Ionicons name={meta.icon} size={ikonBoyu} color={colors.muted} />
        <Text variant="caption" tone="muted" style={styles.label}>
          {t(etiket)}
        </Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={EMBLEM[tier === 'platinum' ? 'platinum' : 'premium']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.base, kucuk ? styles.sm : styles.md, styles.emblem]}
    >
      {tier === 'platinum' ? <View style={styles.parilti} /> : null}
      <Ionicons name={meta.icon} size={ikonBoyu} color={ON_EMBLEM} />
      <Text variant="caption" style={[styles.label, styles.emblemLabel]}>
        {t(etiket)}
      </Text>
    </LinearGradient>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.pill,
      overflow: 'hidden',
    },
    sm: { gap: space(0.5), paddingHorizontal: space(1), paddingVertical: space(0.375) },
    md: { gap: space(0.75), paddingHorizontal: space(1.5), paddingVertical: space(0.75) },
    free: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.line,
    },
    label: { fontFamily: font.semibold },
    emblem: { borderWidth: 1, borderColor: EMBLEM_RIM },
    emblemLabel: { color: ON_EMBLEM },
    /**
     * Platinum parıltısı — köşeden geçen ince aydınlık.
     *
     * Gradyan tek başına Platinum'u Premium'dan "daha koyu" yapardı, daha
     * DEĞERLİ değil. Parıltı yüzeye mücevher niteliği veriyor: renk değil,
     * ışık farkı. Gül tonu markanın kendi vurgusu.
     */
    parilti: {
      position: 'absolute',
      top: -14,
      left: -10,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#D97798', // Gül — amblemin parçası, temayla değişmez
      opacity: 0.35,
    },
  });
