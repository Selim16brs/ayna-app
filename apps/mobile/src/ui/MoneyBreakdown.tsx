import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { earnPoints } from '@ayna/domain';
import { useLocale } from '../locale';
import { useStore } from '../store';
import { radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * PARA DÖKÜMÜ — hiçbir tutar gizli değil.
 *
 * Tasarım kanvası kuralı: "para hareket edecekse tutar önce yazılır". Kapora
 * yüzdesi ve tutarı YAN YANA durur; kullanıcı hesap yapmaz. Yerinde ödenecek
 * kalan da aynı kartta — sürpriz yok.
 *
 * Uydurma satır YOK: yalnız sistemin gerçekten uyguladığı tutarlar yazılır.
 */
export function MoneyBreakdown({
  price,
  deposit,
  format,
  forProvider = false,
}: {
  price: number;
  /** Beklenen kapora (₸). Yoksa kart yalnız hizmet fiyatını gösterir. */
  deposit?: number;
  format: (n: number) => string;
  /**
   * Karta UZMAN/SALON bakıyor.
   *
   * Puan satırı MÜŞTERİNİN kazanımı. Uzmana "Hizmetten sonra kazanacaksın
   * +930" yazmak iki kez yanlıştı: uzman o puanı kazanmıyor (sadakat puanı
   * müşteriye yatıyor) ve satır müşterinin hesabına dair bir bilgi —
   * uzmanın görmesi gereken bir şey değil.
   */
  forProvider?: boolean;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // Kanvas (design/Randevu.dc.html §para dökümü) son satırda "hizmetten sonra
  // kazanacağın puan"ı gösteriyor; ekranda bu satır yoktu. Oran sunucudan gelir
  // (rate.points_earn_pct) ve hesap @ayna/domain'de — vaat edilen puan ile
  // hizmetten sonra gerçekten yatan puan aynı formülden çıkar.
  const earnPct = useStore((s) => s.config.rates.pointsEarnPct);
  const kazanilacak = earnPoints(price, earnPct);

  const hasDeposit = typeof deposit === 'number' && deposit > 0 && deposit < price;
  const onsite = hasDeposit ? price - deposit : 0;
  const pct = hasDeposit ? Math.round((deposit / price) * 100) : 0;

  return (
    <View style={styles.card}>
      <Text variant="label" tone="muted">
        {t('booking.money.title')}
      </Text>

      <View style={styles.row}>
        <Text variant="body" tone="inkSoft" style={styles.rowLabel} numberOfLines={2}>
          {t('booking.money.service')}
        </Text>
        <Text numeric variant="title" tone="ink">
          {format(price)}
        </Text>
      </View>

      {hasDeposit ? (
        <>
          <View style={styles.sep} />
          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Text variant="body" tone="inkSoft" numberOfLines={2}>
                {t('booking.money.deposit')}
              </Text>
              <Text numeric variant="micro" tone="muted">
                %{pct}
              </Text>
            </View>
            <Text numeric variant="title" style={{ color: colors.accent }}>
              {format(deposit)}
            </Text>
          </View>

          <View style={styles.sep} />
          <View style={styles.row}>
            <Text variant="body" tone="inkSoft" style={styles.rowLabel} numberOfLines={2}>
              {t('booking.money.onsite')}
            </Text>
            <Text numeric variant="title" tone="ink">
              {format(onsite)}
            </Text>
          </View>
        </>
      ) : null}

      {kazanilacak > 0 && !forProvider ? (
        <>
          <View style={styles.sep} />
          <View style={styles.row}>
            <Ionicons name="star" size={14} color={colors.gold} />
            <Text variant="body" tone="inkSoft" style={styles.rowLabel} numberOfLines={2}>
              {t('booking.money.will_earn')}
            </Text>
            <Text numeric variant="title" style={{ color: colors.gold }}>
              +{kazanilacak}
            </Text>
          </View>
        </>
      ) : null}

      <View style={styles.note}>
        <Ionicons name="eye-outline" size={14} color={colors.muted} />
        <Text variant="caption" tone="muted" style={styles.noteText}>
          {t('booking.money.note')}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.lg,
      padding: space(2),
      gap: space(1.25),
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
    rowLabel: { flex: 1, gap: 1 },
    sep: { height: 1, backgroundColor: colors.line },
    note: { flexDirection: 'row', alignItems: 'flex-start', gap: space(0.875), paddingTop: 2 },
    noteText: { flex: 1 },
  });
