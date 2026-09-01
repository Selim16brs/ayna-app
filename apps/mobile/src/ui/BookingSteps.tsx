import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import type { BookingStatus } from '../data';
import { useLocale } from '../locale';
import { type ColorTokens } from '../theme';
import { useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * RANDEVU DURUM ADIM ÇUBUĞU — "nerede kaldık, sıra kimde".
 *
 * Tasarım kanvası kararı: randevunun 14 durumu var ve kullanıcı hangi aşamada
 * olduğunu kimseye sormadan görmeli. Geçmiş adımlar tik, ŞU ANKİ adım dolu,
 * gelecek adımlar boş halka.
 *
 * Ana ekran kartı ve randevu detayı AYNI bileşeni kullanır — ikisi ayrışmasın.
 */

const STEPS: { key: MessageKey; done: (s: BookingStatus, hasReceipt: boolean) => boolean }[] = [
  { key: 'home.next.step_request', done: () => true },
  {
    key: 'home.next.step_accepted',
    done: (s) => s !== 'onay_bekliyor' && s !== 'degisiklik_onerildi',
  },
  {
    key: 'home.next.step_deposit',
    done: (s, hasReceipt) => hasReceipt || s === 'kesinlesti' || s === 'tamamlandi',
  },
  { key: 'home.next.step_service', done: (s) => s === 'tamamlandi' },
];

export function BookingSteps({
  status,
  hasReceipt,
}: {
  status: BookingStatus;
  hasReceipt: boolean;
}) {
  const { t } = useLocale();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.steps} accessibilityRole="progressbar">
      {STEPS.map((step, i) => {
        const done = step.done(status, hasReceipt);
        const prevDone = i === 0 || STEPS[i - 1]!.done(status, hasReceipt);
        const current = !done && prevDone;
        return (
          <View key={step.key} style={styles.step}>
            <View style={styles.stepTop}>
              {i > 0 ? (
                <View style={[styles.rail, prevDone && styles.railDone]} />
              ) : (
                <View style={styles.railSpacer} />
              )}
              <View
                style={[
                  styles.dot,
                  done && styles.dotDone,
                  current && styles.dotCurrent,
                  !done && !current && styles.dotIdle,
                ]}
              >
                {done ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
              </View>
              {i < STEPS.length - 1 ? (
                <View style={[styles.rail, done && styles.railDone]} />
              ) : (
                <View style={styles.railSpacer} />
              )}
            </View>
            <Text
              variant="micro"
              tone={current ? 'ink' : 'muted'}
              style={styles.stepLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {t(step.key)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    steps: { flexDirection: 'row' },
    step: { flex: 1, alignItems: 'center', gap: 5 },
    stepTop: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
    rail: { flex: 1, height: 2, backgroundColor: colors.line },
    railDone: { backgroundColor: colors.success },
    railSpacer: { flex: 1 },
    dot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotDone: { backgroundColor: colors.success },
    dotCurrent: { backgroundColor: colors.accent },
    dotIdle: { borderWidth: 2, borderColor: colors.line, backgroundColor: colors.surface },
    stepLabel: { textAlign: 'center' },
  });
