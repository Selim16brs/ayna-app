import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { servicesOf, tri } from '../taxonomy';
import { useLocale } from '../locale';
import { radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * Alt hizmetler — YATAY kaydırmalı bilgi kartları (ad + süre + başlangıç fiyatı).
 * Çipten farkı: gerçek veri gösterir (taksonomi süre/fiyat) → premium ve tek satır (kompakt).
 * Tek seçim; seçiliye tekrar basınca kalkar.
 */
export function ServiceCards({
  categoryId,
  value,
  onChange,
}: {
  categoryId: string;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { locale } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const services = servicesOf(categoryId);
  if (services.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {services.map((s) => {
        const on = s.id === value;
        return (
          <Pressable
            key={s.id}
            onPress={() => onChange(on ? null : s.id)}
            style={[styles.card, shadow.soft, on && styles.cardOn]}
          >
            <View style={styles.topRow}>
              <Text
                variant="caption"
                tone={on ? 'onAccent' : 'ink'}
                style={styles.name}
                numberOfLines={2}
              >
                {tri(s.label, locale)}
              </Text>
              {on ? (
                <Ionicons name="checkmark-circle" size={16} color={colors.onAccent} />
              ) : null}
            </View>
            <View style={styles.metaRow}>
              <Ionicons
                name="time-outline"
                size={11}
                color={on ? colors.onAccent : colors.muted}
              />
              <Text variant="caption" tone={on ? 'onAccent' : 'muted'} style={styles.meta}>
                {s.durationMin} dk
              </Text>
            </View>
            <Text variant="caption" tone={on ? 'onAccent' : 'accentFg'} style={styles.price}>
              ₸{s.price.toLocaleString('ru-RU')}+
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    row: { gap: space(1.25), paddingRight: space(3), paddingVertical: space(0.5) },
    card: {
      width: 138,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: space(1.5),
      gap: space(0.75),
      justifyContent: 'space-between',
    },
    cardOn: { backgroundColor: colors.accent },
    topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
    name: { flex: 1, fontWeight: '700', fontSize: 13.5, lineHeight: 17 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    meta: { fontSize: 11.5 },
    price: { fontWeight: '800', fontSize: 13 },
  });
