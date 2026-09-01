import { StyleSheet, View } from 'react-native';
import { AKIS_ADIMLARI, akisAdimi } from '../booking-flow';
import type { BookingStatus } from '../data';
import { useLocale } from '../locale';
import { radius, space, type ColorTokens } from '../theme';
import { useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * RANDEVU ZAMAN ÇİZELGESİ — brief §7.
 *
 *   "Faz B = kargo takibi tarzı dikey durum zaman çizelgesi
 *    (✓ geçmiş / ● mevcut / soluk gelecek adımlar)."
 *
 * Neden kargo takibi: kullanıcı "randevum ne durumda" sorusunu tek bakışta
 * cevaplayabilmeli. Tek satırlık bir durum rozeti nerede olduğunu söyler ama
 * NE KALDIĞINI söylemez; asıl kaygı ikincisi.
 *
 * Kapanan randevularda (iptal/düşme/no-show) çizelge HİÇ çizilmez: yarıda
 * kalmış bir süreci "3/7 adım" diye göstermek, devam ediyormuş izlenimi verir.
 */
export function AkisCizelgesi({ status }: { status: BookingStatus }) {
  const { t } = useLocale();
  const styles = useThemedStyles(makeStyles);
  const mevcut = akisAdimi(status);
  if (mevcut < 0) return null;

  return (
    <View style={styles.kap} accessibilityRole="progressbar">
      {AKIS_ADIMLARI.map((adim, i) => {
        const gecmis = i < mevcut;
        const simdi = i === mevcut;
        const sonuncu = i === AKIS_ADIMLARI.length - 1;
        return (
          <View key={adim.anahtar} style={styles.satir}>
            <View style={styles.sutun}>
              <View
                style={[styles.nokta, gecmis && styles.noktaGecmis, simdi && styles.noktaSimdi]}
              >
                {gecmis ? (
                  <Text variant="caption" style={styles.tik}>
                    ✓
                  </Text>
                ) : null}
              </View>
              {/* Son adımdan sonra çizgi yok; aksi hâlde boşluğa uzanır. */}
              {!sonuncu ? <View style={[styles.cizgi, gecmis && styles.cizgiGecmis]} /> : null}
            </View>
            <Text
              variant={simdi ? 'bodyStrong' : 'caption'}
              style={[styles.etiket, !gecmis && !simdi && styles.etiketGelecek]}
            >
              {t(adim.etiket)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    kap: { paddingVertical: space(1) },
    satir: { flexDirection: 'row', alignItems: 'flex-start', gap: space(1.5) },
    sutun: { alignItems: 'center', width: 20 },
    nokta: {
      width: 14,
      height: 14,
      borderRadius: radius.pill,
      borderWidth: 2,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noktaGecmis: { backgroundColor: colors.success, borderColor: colors.success },
    // Mevcut adım DOLU ve daha büyük: gözün ilk gittiği yer burası olmalı.
    noktaSimdi: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
      width: 16,
      height: 16,
    },
    tik: { color: colors.onAccent, fontSize: 9, lineHeight: 11 },
    cizgi: { width: 2, flex: 1, minHeight: 18, backgroundColor: colors.line },
    cizgiGecmis: { backgroundColor: colors.success },
    etiket: { flex: 1, paddingBottom: space(1.5), color: colors.ink },
    // Gelecek adımlar SOLUK — okunabilir ama dikkat çekmeyen.
    etiketGelecek: { color: colors.muted },
  });
