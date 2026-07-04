import { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { radius, space, type ColorTokens } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';
import { Text } from './Text';

// TR kısa ay adları — tarih etiketini serbest metin yerine seçilen tarihten üretiriz.
const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const two = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export function formatTrDate(d: Date, withTime: boolean): string {
  const base = `${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;
  return withTime ? `${base} · ${two(d.getHours())}:${two(d.getMinutes())}` : base;
}

/**
 * Ortak tarih/saat alanı (Benim İçin kayıt eklemeleri + Randevu al aynı model).
 * iOS: kompakt tıklanabilir yerleşik seçici. Android: dokununca açılan diyalog.
 * Etiket seçilen tarihten üretilir; serbest metin yok.
 */
export function DateField({
  label,
  value,
  onChange,
  mode,
  minimumDate,
  last,
}: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
  mode: 'date' | 'datetime';
  minimumDate?: Date;
  last?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [show, setShow] = useState(false);
  return (
    <View style={[styles.field, !last && styles.fieldGap]}>
      <Text variant="bodyStrong" tone="ink" style={styles.label}>
        {label}
      </Text>
      {Platform.OS === 'ios' ? (
        <View style={styles.iosRow}>
          <DateTimePicker
            value={value}
            mode={mode}
            display="compact"
            themeVariant={colors.bg === '#191E1B' ? 'dark' : 'light'}
            locale="tr-TR"
            minimumDate={minimumDate}
            onChange={(_, d) => d && onChange(d)}
          />
        </View>
      ) : (
        <>
          <Pressable style={styles.input} onPress={() => setShow(true)}>
            <Text variant="bodyStrong" tone="ink" style={styles.dateText}>
              {formatTrDate(value, mode === 'datetime')}
            </Text>
          </Pressable>
          {show ? (
            <DateTimePicker
              value={value}
              mode="date"
              minimumDate={minimumDate}
              onChange={(_, d) => {
                setShow(false);
                if (d) onChange(d);
              }}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    field: {},
    fieldGap: { marginBottom: space(2) },
    label: { marginBottom: space(1), fontWeight: '700' },
    iosRow: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
    input: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: space(1.75),
      height: 52,
      justifyContent: 'center',
    },
    dateText: { fontSize: 16 },
  });
