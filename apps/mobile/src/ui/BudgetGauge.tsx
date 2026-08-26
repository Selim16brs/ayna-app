import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { fillParams, useLocale } from '../locale';
import { radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * BÜTÇE GÖSTERGESİ — "ne kadar yazmalıyım?" tahmine kalmasın.
 *
 * Tasarım kanvasının teşhisi: gerçekçi olmayan bütçe → sıfır teklif → terk.
 * Hayal kırıklığı teklif beklerken değil, tutarı yazarken yaşanmalı ki
 * kullanıcı düzeltebilsin.
 *
 * DÜRÜSTLÜK: kanvasta "bu tutara 14 uzman yanıt verir" yazıyordu; sistemde
 * böyle bir sayım YOK. Uydurmak yerine elimizdeki gerçek veriyi gösteriyoruz:
 * kategori × şehir ortalaması, taban fiyat ve bu ortalamanın neye dayandığı
 * (gerçek tekliflerden mi, referans fiyattan mı).
 */
export function BudgetGauge({
  budget,
  average,
  floor,
  samples,
  dynamic,
  format,
}: {
  /** Kullanıcının yazdığı tutar (₸). 0 ise gösterge nötr durur. */
  budget: number;
  average: number;
  floor: number;
  samples: number;
  /** true: ortalama gerçek tekliflerden hesaplandı. false: tohum referans fiyat. */
  dynamic: boolean;
  format: (n: number) => string;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // Şerit: tabandan ortalamanın 1.6 katına. Bütçe taşarsa uçta durur.
  const max = Math.round(average * 1.6);
  const clamp = (v: number) => Math.min(Math.max(v, floor), max);
  const pos = (v: number) => ((clamp(v) - floor) / Math.max(1, max - floor)) * 100;

  const avgPos = pos(average);
  const state = budget <= 0 ? 'idle' : budget < floor ? 'low' : budget < average ? 'under' : 'ok';
  const tone = state === 'low' ? colors.danger : state === 'under' ? colors.gold : colors.success;

  return (
    <View style={styles.card}>
      <View style={styles.track}>
        <View style={styles.rail} />
        {/* Ortalama çentiği — rakamla birlikte, tahmin bırakmaz */}
        <View style={[styles.avgTick, { left: `${avgPos}%` }]} />
        {budget > 0 ? (
          <View style={[styles.knob, { left: `${pos(budget)}%`, borderColor: tone }]} />
        ) : null}
      </View>

      <View style={styles.scale}>
        <Text numeric variant="micro" tone="muted">
          {t('demand.budget.floor')} {format(floor)}
        </Text>
        <Text numeric variant="micro" tone="muted">
          {t('demand.budget.avg')} {format(average)}
        </Text>
      </View>

      {state !== 'idle' ? (
        <View style={styles.msg}>
          <Ionicons
            name={
              state === 'low'
                ? 'close-circle-outline'
                : state === 'under'
                  ? 'alert-circle-outline'
                  : 'checkmark-circle-outline'
            }
            size={16}
            color={tone}
          />
          <Text variant="caption" style={[styles.msgText, { color: colors.inkSoft }]}>
            {state === 'low'
              ? fillParams(t('demand.budget.low'), { floor: format(floor) })
              : t(state === 'under' ? 'demand.budget.under' : 'demand.budget.ok')}
          </Text>
        </View>
      ) : null}

      {/* Ortalamanın kaynağı — ölçtüğümüzü ölçtük, tahmin ettiğimizi tahmin dedik */}
      <Text variant="micro" tone="muted" style={styles.source}>
        {dynamic
          ? fillParams(t('demand.budget.src_dynamic'), { n: String(samples) })
          : t('demand.budget.src_seed')}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: space(1.75),
      gap: space(1),
    },
    track: { height: 24, justifyContent: 'center', marginHorizontal: 11 },
    rail: { height: 4, borderRadius: 2, backgroundColor: colors.line },
    // Konum sabit DEĞİL: taban oranı sunucuda değişirse çentik sessizce kaymasın.
    avgTick: {
      position: 'absolute',
      top: 2,
      width: 2,
      height: 20,
      borderRadius: 1,
      marginLeft: -1,
      backgroundColor: colors.muted,
    },
    knob: {
      position: 'absolute',
      top: 1,
      width: 22,
      height: 22,
      borderRadius: 11,
      marginLeft: -11,
      backgroundColor: colors.surface,
      borderWidth: 3,
    },
    scale: { flexDirection: 'row', justifyContent: 'space-between' },
    msg: { flexDirection: 'row', alignItems: 'flex-start', gap: space(1) },
    msgText: { flex: 1 },
    source: { opacity: 0.85 },
  });
