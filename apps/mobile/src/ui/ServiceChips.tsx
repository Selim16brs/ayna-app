import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { servicesOf, tri } from '../taxonomy';
import { useLocale } from '../locale';
import { radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

/**
 * Bir ana kategorinin ALT HİZMETLERİ (taksonomi) — ferah, sarmalayan (wrap) çip bulutu.
 * Tümü tek bakışta görünür (yatay kaydırma yok); tek seçim, seçili çipe tekrar basınca kalkar.
 * Keşfet→kategori, talep akışı vb. her yerde AYNI merkezi listeden gelir.
 */
export function ServiceChips({
  categoryId,
  value,
  onChange,
}: {
  categoryId: string;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { locale } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const services = servicesOf(categoryId);
  if (services.length === 0) return null;
  return (
    <View style={styles.wrap}>
      {services.map((s) => {
        const on = s.id === value;
        return (
          <Pressable
            key={s.id}
            onPress={() => onChange(on ? null : s.id)}
            style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
            hitSlop={4}
          >
            <Ionicons
              name={on ? 'checkmark-circle' : 'add-circle-outline'}
              size={16}
              color={on ? colors.onAccent : colors.accentFg}
            />
            <Text
              variant="caption"
              tone={on ? 'onAccent' : 'ink'}
              style={styles.text}
              numberOfLines={1}
            >
              {tri(s.label, locale)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingLeft: space(1.25),
      paddingRight: space(1.75),
      paddingVertical: space(1.1),
      borderRadius: radius.pill,
    },
    chipOff: { backgroundColor: colors.surface, borderWidth: 1.25, borderColor: colors.line },
    chipOn: { backgroundColor: colors.accent, borderWidth: 1.25, borderColor: colors.accent },
    text: { fontWeight: '600', fontSize: 13.5 },
  });
